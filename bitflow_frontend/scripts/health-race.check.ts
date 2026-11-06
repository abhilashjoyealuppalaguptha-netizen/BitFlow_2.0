/** scripts/health-race.check.ts — raceHealth in lib/health-race.ts (npx tsx scripts/health-race.check.ts). */
import assert from "node:assert/strict";
import { raceHealth, type HealthResult } from "../lib/health-race";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const res = (ok: boolean, ms = 0): HealthResult => ({ ok, status: ok ? 200 : 502, data: {}, ms });
const checker = (spec: Record<string, { ms: number; ok?: boolean; throws?: boolean }>, started: string[] = []) => async (url: string) => {
  started.push(url);
  await delay(spec[url].ms);
  if (spec[url].throws) throw new Error("boom " + url);
  return res(spec[url].ok ?? true);
};

(async () => {
  // the reply comes with the FIRST healthy instance; the sleeping one is reported pending, but was pinged
  const started: string[] = [];
  const t0 = Date.now();
  const r1 = await raceHealth(["fast", "asleep"], checker({ fast: { ms: 10 }, asleep: { ms: 3000 } }, started));
  assert.ok(Date.now() - t0 < 500, "did not wait for the slow instance");
  assert.equal(r1[0]?.ok, true); assert.equal(r1[1], null);
  assert.deepEqual(started, ["fast", "asleep"], "every instance is still pinged (that wakes it)");

  // an unhealthy fast one does not end the race: wait for the healthy one
  const r2 = await raceHealth(["bad", "good"], checker({ bad: { ms: 5, ok: false }, good: { ms: 40 } }));
  assert.equal(r2[0]?.ok, false); assert.equal(r2[1]?.ok, true);

  // all unhealthy: resolves when the last one finishes
  const r3 = await raceHealth(["a", "b"], checker({ a: { ms: 5, ok: false }, b: { ms: 30, ok: false } }));
  assert.ok(r3.every((r) => r && !r.ok));

  // a check that throws becomes a failed result instead of rejecting
  const r4 = await raceHealth(["x", "y"], checker({ x: { ms: 5, throws: true }, y: { ms: 20 } }));
  assert.equal(r4[0]?.ok, false); assert.equal(r4[0]?.status, 502); assert.equal(r4[1]?.ok, true);
  const r5 = await raceHealth(["x"], checker({ x: { ms: 5, throws: true } }));
  assert.equal(r5[0]?.ok, false);

  // no instances
  assert.deepEqual(await raceHealth([], checker({})), []);

  console.log("health-race: ok");
})().catch((err) => { console.error(err); process.exit(1); });
