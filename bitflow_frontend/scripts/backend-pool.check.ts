/** scripts/backend-pool.check.ts — self-check for BACKEND_URLS and failover in lib/backend.ts (npx tsx scripts/backend-pool.check.ts). */
import assert from "node:assert/strict";
import { backendUrls, fetchWithFailover } from "../lib/backend";

const env = process.env as Record<string, string | undefined>;

// BACKEND_URLS parsing, and the fallback to BACKEND_URL
env.BACKEND_URL = "http://single:8000/";
delete env.BACKEND_URLS;
assert.deepEqual(backendUrls(), ["http://single:8000"]);
env.BACKEND_URLS = " https://a.example/ , ,https://b.example// ";
assert.deepEqual(backendUrls(), ["https://a.example", "https://b.example"]);
env.BACKEND_URLS = " , ";
assert.deepEqual(backendUrls(), ["http://single:8000"], "an empty list falls back to BACKEND_URL");

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

  // One instance: a plain fetch, its answer as is
  hosts = { a: 503 }; calls.length = 0;
  assert.equal((await fetchWithFailover(["http://a"], "/health")).status, 503);
  assert.equal(calls.length, 1);
  await assert.rejects(fetchWithFailover([], "/health"), /No backend URL/);

  console.log("backend-pool: ok");
})().catch((err) => { console.error(err); process.exit(1); });
