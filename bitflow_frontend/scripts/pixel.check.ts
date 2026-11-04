/**
 * scripts/pixel.check.ts — self-check for the pixel UI (npx tsx scripts/pixel.check.ts):
 * Bitzy's frames (lib/pixel/bitzy.ts) and the progress bars' block count (components/pixel/PixelBar.tsx).
 */
import assert from "node:assert/strict";
import { ANIMATIONS, COLORS, SIZE, frame, runs } from "../lib/pixel/bitzy";
import { litBlocks } from "../components/pixel/PixelBar";

// Every frame is SIZE × SIZE, uses only known colours, and keeps Bitzy whole: the antenna light, both
// eyes and the body's outline are all on the grid (nothing pushed off the edge by a jump).
for (const [name, { frames, fps }] of Object.entries(ANIMATIONS)) {
  assert.ok(frames.length >= 1 && fps > 0, `${name}: frames and fps`);
  frames.forEach((rows, i) => {
    const at = `${name}[${i}]`;
    assert.equal(rows.length, SIZE, `${at}: ${SIZE} rows`);
    for (const row of rows) {
      assert.equal(row.length, SIZE, `${at}: ${SIZE} columns`);
      for (const c of row) assert.ok(c === "." || c in COLORS, `${at}: unknown pixel '${c}'`);
    }
    const all = rows.join("");
    const light = (all.match(/[adgr]/g) ?? []).length;
    assert.ok(light >= 4, `${at}: the antenna light is on the grid`);
    assert.ok(/[or]{8}/.test(rows.join("|")), `${at}: the body's top and bottom edges are there`);
    assert.ok((all.match(/[er]/g) ?? []).length >= 6, `${at}: both eyes show`);
  });
}

// Frame 0 is the reduced-motion still: idle and work start with the usual X-and-block face.
assert.deepEqual(ANIMATIONS.idle.frames[0], frame({}));
// A jump moves the body up but the shadow stays on the ground.
const jump = ANIMATIONS.cheer.frames.find((_, i) => i === 2)!;
assert.ok(jump[22].includes("h") && !jump[21].includes("o"), "cheer peak: shadow on the ground, body above it");

// runs() covers exactly the non-empty pixels.
for (const rows of ANIMATIONS.work.frames) {
  const painted = runs(rows).reduce((n, [, , w]) => n + w, 0);
  assert.equal(painted, rows.join("").replace(/\./g, "").length, "runs cover every pixel once");
}

// Progress blocks: none at 0, all only when complete, at least one for any progress.
assert.equal(litBlocks(0, 10, 20), 0);
assert.equal(litBlocks(10, 10, 20), 20);
assert.equal(litBlocks(12, 10, 20), 20);
assert.equal(litBlocks(1, 1000, 20), 1, "any progress shows");
assert.equal(litBlocks(999, 1000, 20), 19, "not complete never looks complete");
assert.equal(litBlocks(5, 10, 20), 10);
assert.equal(litBlocks(3, 0, 20), 0, "no total, no progress");

console.log(`pixel: all checks passed (${Object.keys(ANIMATIONS).length} animations, ${Object.values(ANIMATIONS).reduce((n, a) => n + a.frames.length, 0)} frames)`);
