/** scripts/backend-pool.check.ts — self-check for BACKEND_URLS and failover in lib/backend.ts (npx tsx scripts/backend-pool.check.ts). */
import assert from "node:assert/strict";
import { backendPool, backendUrls, fetchWithFailover } from "../lib/backend";

const env = process.env as Record<string, string | undefined>;

// BACKEND_URLS parsing, and the fallback to BACKEND_URL
env.BACKEND_URL = "http://single:8000/";
delete env.BACKEND_URLS;
assert.deepEqual(backendUrls(), ["http://single:8000"]);
env.BACKEND_URLS = " https://a.example/ , ,https://b.example// ";
assert.deepEqual(backendUrls(), ["https://a.example", "https://b.example"]);
env.BACKEND_URLS = " , ";
assert.deepEqual(backendUrls(), ["http://single:8000"], "an empty list falls back to BACKEND_URL");

// Weights: `url|weight`, default 1; backendUrls() stays plain URLs
env.BACKEND_URLS = "https://big.example|8, https://a.example/ ,https://b.example|0,https://c.example|x";
assert.deepEqual(backendPool(), [
  { url: "https://big.example", weight: 8 }, { url: "https://a.example", weight: 1 },
  { url: "https://b.example", weight: 1 }, { url: "https://c.example", weight: 1 },
], "bad or zero weights count as 1");
assert.deepEqual(backendUrls(), ["https://big.example", "https://a.example", "https://b.example", "https://c.example"]);
delete env.BACKEND_URLS;

// Stub fetch: each host answers with a fixed status, or throws for "down"
type Answer = number | "down";
let hosts: Record<string, Answer> = {};
const calls: string[] = [];
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input);
  const host = new URL(url).host;
  calls.push(host);
  const answer = hosts[host];
  if (answer === undefined || answer === "down") throw new TypeError(`fetch failed: ${host}`);
  return new Response(JSON.stringify({ host }), { status: answer });
}) as typeof fetch;

const urls = ["http://a", "http://b"];
async function run(answers: Record<string, Answer>) {
  hosts = answers;
  calls.length = 0;
  return fetchWithFailover(urls, "/simulate", { method: "POST" });
}

(async () => {
  for (let i = 0; i < 20; i++) {
    // A down or 502/503 instance hands the request to the other one
    for (const bad of ["down", 502, 503] as Answer[]) {
      const res = await run({ a: bad, b: 200 });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).host, "b");
    }
    // 504, 4xx and 500 are final: no second run elsewhere
    for (const final of [504, 400, 500]) {
      const res = await run({ a: final, b: final });
      assert.equal(res.status, final);
      assert.equal(calls.length, 1, `no retry on ${final}`);
    }
    // Every instance failing: the last answer (or error) comes back
    assert.equal((await run({ a: 503, b: 503 })).status, 503);
    assert.deepEqual([...calls].sort(), ["a", "b"], "each instance tried once");
    await assert.rejects(run({ a: "down", b: "down" }), /fetch failed/);
    assert.equal(calls.length, 2);
  }

  // Traffic reaches both instances
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const res = await run({ a: 200, b: 200 });
    seen.add((await res.json()).host);
  }
  assert.deepEqual([...seen].sort(), ["a", "b"]);

  // Weighted share: weight 8 against 1 + 1 should take about 80% of the first tries
  const weighted = [{ url: "http://a", weight: 8 }, { url: "http://b", weight: 1 }, { url: "http://c", weight: 1 }];
  hosts = { a: 200, b: 200, c: 200 };
  const firsts: Record<string, number> = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 3000; i++) {
    calls.length = 0;
    await fetchWithFailover(weighted, "/simulate");
    firsts[calls[0]]++;
  }
  assert.ok(firsts.a > 2200 && firsts.a < 2600, `weight 8 of 10 got ${firsts.a} of 3000`);
  assert.ok(firsts.b > 150 && firsts.c > 150, "light instances still get traffic");
  // Failover still reaches every instance once, whatever the weights, and the heavy one being down is survived
  for (const dead of ["a", "b", "c"]) {
    hosts = { a: 200, b: 200, c: 200, [dead]: "down" };
    for (let i = 0; i < 50; i++) assert.equal((await fetchWithFailover(weighted, "/simulate")).status, 200);
  }
  hosts = { a: 503, b: 503, c: 503 }; calls.length = 0;
  assert.equal((await fetchWithFailover(weighted, "/simulate")).status, 503);
  assert.deepEqual([...calls].sort(), ["a", "b", "c"], "each weighted instance tried once");

  // One instance: a plain fetch, its answer as is
  hosts = { a: 503 }; calls.length = 0;
  assert.equal((await fetchWithFailover(["http://a"], "/health")).status, 503);
  assert.equal(calls.length, 1);
  await assert.rejects(fetchWithFailover([], "/health"), /No backend URL/);

  console.log("backend-pool: ok");
})().catch((err) => { console.error(err); process.exit(1); });
