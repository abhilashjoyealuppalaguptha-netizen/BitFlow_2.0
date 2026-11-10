/** scripts/sim-retry.check.ts — self-check for shouldRetrySimulation in lib/sim-status.ts (npx tsx scripts/sim-retry.check.ts). */
import assert from "node:assert/strict";
import { shouldRetrySimulation } from "../lib/sim-status";

for (const awake of [true, false]) {
  // Outages: no response, or the host restarting / failing to wake
  assert.equal(shouldRetrySimulation(undefined, awake), true);
  assert.equal(shouldRetrySimulation(502, awake), true);
  assert.equal(shouldRetrySimulation(503, awake), true);
  // Final answers: never sent again
  for (const status of [200, 400, 401, 413, 422, 429, 500]) {
    assert.equal(shouldRetrySimulation(status, awake), false, `${status} is final`);
  }
}
// 504: a cold start is retried, a long simulation on an awake simulator is not run again
assert.equal(shouldRetrySimulation(504, false), true);
assert.equal(shouldRetrySimulation(504, true), false);

console.log("sim-retry: ok");
