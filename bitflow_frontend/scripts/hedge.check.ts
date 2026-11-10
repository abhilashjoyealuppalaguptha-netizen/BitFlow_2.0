/** scripts/hedge.check.ts — job classes, strongest-first order and hedged requests in lib/backend.ts (npx tsx scripts/hedge.check.ts). */
import assert from "node:assert/strict";
import { fetchWithFailover, jobClass } from "../lib/backend";

// ── job classes
assert.equal(jobClass("/simulate", { design_v: "", testbench_v: "" }), "light");
assert.equal(jobClass("/simulate", { simulator: "icarus", design_language: "verilog", testbench_language: "verilog" }), "light");
for (const heavy of [{ simulator: "verilator" }, { design_language: "vhdl" }, { testbench_language: "python" }, { testbench_language: "vhdl" }]) {
  assert.equal(jobClass("/simulate", heavy), "heavy", JSON.stringify(heavy));
}
for (const p of ["/fpga", "/equivalence", "/formal", "/asic"]) assert.equal(jobClass(p, {}), "heavy", p);
for (const p of ["/metrics", "/board", "/synthesize", "/vhdl", "/style/lint", "/style/format"]) assert.equal(jobClass(p, {}), "light", p);

// ── fake network: per-host delay and answer, honours AbortSignal, records who was asked and who was cancelled
type Spec = { ms: number; status?: number; throws?: boolean };
let hosts: Record<string, Spec> = {};
const asked: string[] = [], aborted: string[] = [];
globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
  const host = new URL(String(input)).host;
  asked.push(host);
  const spec = hosts[host];
  const timer = setTimeout(() => (spec.throws ? reject(new TypeError(`fetch failed: ${host}`)) : resolve(new Response(host, { status: spec.status ?? 200 }))), spec.ms);
  init?.signal?.addEventListener("abort", () => { clearTimeout(timer); aborted.push(host); reject(new DOMException("aborted", "AbortError")); });
})) as typeof fetch;

const pool = [{ url: "http://strong", weight: 8 }, { url: "http://weak1", weight: 1 }, { url: "http://weak2", weight: 1 }];
const reset = (h: Record<string, Spec>) => { hosts = h; asked.length = 0; aborted.length = 0; };
const body = async (r: Response) => r.text();

(async () => {
  // ── strongest first: always the heaviest instance, even over many draws
  for (let i = 0; i < 200; i++) {
    reset({ strong: { ms: 1 }, weak1: { ms: 1 }, weak2: { ms: 1 } });
    assert.equal(await body(await fetchWithFailover(pool, "/x", undefined, { strongestFirst: true })), "strong");
  }
  // ...and falls back to the others, in order, when the strongest is down or restarting
  reset({ strong: { ms: 1, throws: true }, weak1: { ms: 1 }, weak2: { ms: 1 } });
  assert.match(await body(await fetchWithFailover(pool, "/x", undefined, { strongestFirst: true })), /weak/);
  reset({ strong: { ms: 1, status: 503 }, weak1: { ms: 1 }, weak2: { ms: 1 } });
  assert.match(await body(await fetchWithFailover(pool, "/x", undefined, { strongestFirst: true })), /weak/);
  // no weights set: ties are shuffled, so every instance gets heavy traffic (nothing starves)
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    reset({ a: { ms: 1 }, b: { ms: 1 } });
    seen.add(await body(await fetchWithFailover(["http://a", "http://b"], "/x", undefined, { strongestFirst: true })));
  }
  assert.deepEqual([...seen].sort(), ["a", "b"]);

  // ── hedging
  const two = [{ url: "http://slow", weight: 1000 }, { url: "http://fast", weight: 1 }];   // slow is drawn first
  // a fast first answer is just returned: the second instance is never asked
  reset({ slow: { ms: 5 }, fast: { ms: 5 } });
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 60 })), "slow");
  assert.deepEqual(asked, ["slow"], "no hedge when the first answers in time");
  // a stalled first instance (a sleeping Render instance): after hedgeMs the next one answers, the stalled one is cancelled
  reset({ slow: { ms: 2000 }, fast: { ms: 5 } });
  const t0 = Date.now();
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 60 })), "fast");
  const took = Date.now() - t0;
  assert.ok(took >= 55 && took < 500, `hedge answered after ${took} ms`);
  assert.deepEqual(asked, ["slow", "fast"]); assert.deepEqual(aborted, ["slow"]);
  // a failing first instance moves on at once, without waiting for the hedge delay
  reset({ slow: { ms: 1, throws: true }, fast: { ms: 5 } });
  const t1 = Date.now();
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 5000 })), "fast");
  assert.ok(Date.now() - t1 < 500, "no waiting for the hedge delay after a failure");
  reset({ slow: { ms: 1, status: 503 }, fast: { ms: 5 } });
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 5000 })), "fast");
  // the winner is NOT cancelled: its body stays readable after the loser is aborted
  reset({ slow: { ms: 200 }, fast: { ms: 5 } });
  const res = await fetchWithFailover(two, "/x", undefined, { hedgeMs: 20 });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await res.text(), "fast");
  // if the hedged one is slower, the original can still win, and the hedge is cancelled
  reset({ slow: { ms: 80 }, fast: { ms: 1000 } });
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 30 })), "slow");
  assert.deepEqual(aborted, ["fast"]);
  // everyone failing: the last failure comes back, like the sequential path
  reset({ slow: { ms: 1, status: 503 }, fast: { ms: 1, status: 503 } });
  assert.equal((await fetchWithFailover(two, "/x", undefined, { hedgeMs: 20 })).status, 503);
  reset({ slow: { ms: 1, throws: true }, fast: { ms: 1, throws: true } });
  await assert.rejects(fetchWithFailover(two, "/x", undefined, { hedgeMs: 20 }), /fetch failed/);
  // a 504 or 4xx is a real answer: final, never retried elsewhere
  reset({ slow: { ms: 1, status: 504 }, fast: { ms: 5 } });
  assert.equal((await fetchWithFailover(two, "/x", undefined, { hedgeMs: 20 })).status, 504);
  assert.deepEqual(asked, ["slow"]);
  // hedging is off when unset/0 or with one instance
  reset({ slow: { ms: 80 }, fast: { ms: 1 } });
  assert.equal(await body(await fetchWithFailover(two, "/x", undefined, { hedgeMs: 0 })), "slow");
  assert.deepEqual(asked, ["slow"]);

  console.log("hedge: ok");
})().catch((err) => { console.error(err); process.exit(1); });
