/**
 * scripts/pixel.check.ts — self-check for the pixel UI (npx tsx scripts/pixel.check.ts):
 * Bitzy's frames (lib/pixel/bitzy.ts) and the progress bars' block count (components/pixel/PixelBar.tsx).
 */
import assert from "node:assert/strict";
import { ANIMATIONS, COLORS, SIZE, frame, runs } from "../lib/pixel/bitzy";
import { litBlocks } from "../components/pixel/PixelBar";
import { levelFromXp, levelsGained, tierFromXp, xpForLevel } from "../lib/levels";
import { rewardMoments, unseenBadges } from "../lib/pixel/rewards";
import { effectFor, xpCoins, type Moment } from "../lib/pixel/celebrate";
import { clearFrame, createFrame, createFx } from "../lib/pixelfx/core/index.js";

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

// ── Levels (lib/levels.ts) ────────────────────────────────────────────────────
assert.deepEqual([1, 2, 3, 5].map(xpForLevel), [0, 100, 300, 1000]);
for (let xp = 0; xp <= 20000; xp += 7) {
  const { level, into, needed, next } = levelFromXp(xp);
  assert.ok(xpForLevel(level) <= xp && xp < xpForLevel(level + 1), `level of ${xp}`);
  assert.equal(into, xp - xpForLevel(level));
  assert.equal(needed, next - xpForLevel(level));
}
assert.equal(levelFromXp(-5).level, 1);
assert.equal(levelFromXp(99).level, 1);
assert.equal(levelFromXp(100).level, 2);
assert.equal(levelsGained(950, 1050), 1, "crossing 1000 is level 5");
assert.equal(levelsGained(0, 350), 2, "two levels at once");
// The tier titles keep their old thresholds.
assert.deepEqual([0, 999, 1000, 2999, 3000, 6999, 7000].map((x) => tierFromXp(x).label),
  ["Novice", "Novice", "Builder", "Builder", "Engineer", "Engineer", "Architect"]);

// ── Reward moments (lib/pixel/rewards.ts) ─────────────────────────────────────
assert.deepEqual(rewardMoments({ accepted: false, xpEarned: 0 }), []);
assert.deepEqual(rewardMoments({ accepted: true, xpEarned: 0, totalXp: 500 }), [], "a re-solve plays nothing");
assert.deepEqual(rewardMoments({ accepted: true, xpEarned: 20, totalXp: 50 }).map((m) => m.kind), ["accepted", "xp"]);
assert.deepEqual(rewardMoments({ accepted: true, xpEarned: 300, totalXp: 1050 }).at(-1), { kind: "level", level: 5 });
assert.deepEqual(rewardMoments({ accepted: true, xpEarned: 300, totalXp: null }).map((m) => m.kind), ["accepted", "xp"], "guests: no level");

const store = new Map<string, string>();
const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
const badge = (id: string, earned: boolean) => ({ id, label: id.toUpperCase(), earned });
assert.deepEqual(unseenBadges("u1", [badge("a", true), badge("b", false)], storage), [], "first visit records silently");
assert.deepEqual(unseenBadges("u1", [badge("a", true), badge("b", true)], storage), [{ kind: "badge", label: "B" }]);
assert.deepEqual(unseenBadges("u1", [badge("a", true), badge("b", true)], storage), [], "shown once");
assert.deepEqual(unseenBadges("u2", [badge("a", true)], storage), [], "per user");

// ── Celebration effects (lib/pixel/celebrate.ts + vendored pixelfx) ───────────
// Each runs to its end at 30 fps without throwing, draws something, and finishes (done()).
const moments: Moment[] = [{ kind: "accepted" }, { kind: "xp", xp: 300 }, { kind: "level", level: 7 }, { kind: "badge", label: "Quarter Century" }, { kind: "win" }];
for (const m of moments) {
  const e = effectFor(m);
  const [w, h] = e.mod.meta.size, [ox, oy] = e.mod.meta.origin;
  const frame = createFrame(w, h, -ox, -oy);
  const fx = createFx(e.mod, { ...e.options, x: 0, y: 0 });
  let drawn = 0, steps = 0;
  while (!fx.done() && steps < 30 * 10) {
    fx.update(1 / 30);
    clearFrame(frame);
    fx.draw(frame, "back");
    fx.draw(frame, "front");
    drawn = Math.max(drawn, frame.color.reduce((n: number, c: number) => n + (c ? 1 : 0), 0));
    steps++;
  }
  assert.ok(fx.done(), `${m.kind}: ends`);
  assert.ok(drawn > 50, `${m.kind}: draws`);
  for (const [k, v] of Object.entries(e.options)) {
    // Colour ramps are resampled to the effect's own step count, keeping their ends; the rest apply as given.
    if (Array.isArray(v)) assert.deepEqual([fx.options[k][0], fx.options[k].at(-1)], [v[0], v.at(-1)], `${m.kind}: ramp ${k} applies`);
    else assert.deepEqual(fx.options[k], v, `${m.kind}: option ${k} applies`);
  }
}
// The XP coins count up to exactly the XP earned, 4 to 12 coins (fewer below 4 XP).
for (const xp of [1, 5, 20, 25, 99, 300, 301, 1000, 4321]) {
  const { count, step, from } = xpCoins(xp);
  assert.ok(count >= Math.min(4, xp) && count <= 12 && step >= 1, `${xp} XP: coins`);
  assert.equal(from + step * count, xp, `${xp} XP: the counter ends on ${xp}`);
}
assert.equal(effectFor({ kind: "badge", label: "A very long badge name indeed" }).options.text, "A VERY LONG BAD…", "long labels are cut to fit");

console.log(`pixel: all checks passed (${Object.keys(ANIMATIONS).length} animations, ${Object.values(ANIMATIONS).reduce((n, a) => n + a.frames.length, 0)} frames, ${moments.length} celebrations)`);
