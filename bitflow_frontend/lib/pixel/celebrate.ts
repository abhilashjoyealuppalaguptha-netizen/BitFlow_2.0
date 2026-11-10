/**
 * lib/pixel/celebrate.ts — the reward moments, played with pixelfx (lib/pixelfx, MIT, vendored at a
 * pinned commit) in the site's phosphor greens and reward gold.
 *
 *   effectFor(moment)          which effect, with which options (pure: scripts/pixel.check.ts runs it)
 *   play(canvas, moment, done) runs it on a canvas until it ends; returns a cancel function
 *
 * Only components/pixel/PixelBurst.tsx imports this, and that loads on the first celebration, so
 * pixelfx never weighs on a page's first load. Level-up wraps a character: we pass pixel Bitzy as
 * the actor (its mask) and draw it in the middle of the effect ourselves.
 */

import { clearFrame, composite, createFrame, createFx, hex, painterFor, actorAlphaOf } from "@/lib/pixelfx/core/index.js";
import * as questComplete from "@/lib/pixelfx/fx/ui/quest-complete.js";
import * as levelUp from "@/lib/pixelfx/fx/ui/level-up.js";
import * as achievement from "@/lib/pixelfx/fx/ui/achievement.js";
import * as coinCollect from "@/lib/pixelfx/fx/ui/coin-collect.js";
import * as confetti from "@/lib/pixelfx/fx/ui/confetti.js";
import { ANIMATIONS } from "./bitzy";

export type Moment =
  | { kind: "accepted" }
  | { kind: "xp"; xp: number }
  | { kind: "level"; level: number }
  | { kind: "badge"; label: string }
  | { kind: "win" };

/** Dark to bright phosphor, for light and lettering. */
export const GREEN = ["#04140c", "#08301c", "#0c5a32", "#109050", "#00c864", "#00e87a", "#9dffc8", "#ffffff"];
/** Cloth and banners: darker, so the gold seal and the letters stand out. */
const RIBBON = ["#03140b", "#062a17", "#0a4a28", "#0e6e3b", "#13a356", "#00e87a", "#8dffbf"];

type Mod = { meta: { size: number[]; origin: number[]; duration: number; actor?: number } };
interface Effect { mod: Mod; options: Record<string, unknown>; bitzy?: boolean; scale: number }

const clampText = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** 4 to 12 coins (fewer below 4 XP) whose values add up to the XP: the counter starts at the remainder and ends on "+xp". */
export function xpCoins(xp: number) {
  const count = Math.max(Math.min(4, Math.max(1, xp)), Math.min(12, Math.round(xp / 25)));
  const step = Math.max(1, Math.floor(xp / count));
  return { count, step, from: Math.max(0, xp - step * count), prefix: "+" };
}

export function effectFor(m: Moment): Effect {
  switch (m.kind) {
    case "accepted": return { mod: questComplete as Mod, options: { text: "ACCEPTED", ribbon: RIBBON }, scale: 3 };
    case "xp":       return { mod: coinCollect as Mod, options: xpCoins(m.xp), scale: 3 };
    case "level":    return { mod: levelUp as Mod, options: { text: `LEVEL ${m.level}!`, palette: GREEN }, bitzy: true, scale: 3 };
    case "badge":    return { mod: achievement as Mod, options: { title: "BADGE", text: clampText(m.label.toUpperCase(), 16), ribbon: RIBBON }, scale: 3 };
    case "win":      return { mod: confetti as Mod, options: {}, scale: 3 };
  }
}

// Pixel Bitzy cheering, as an actor: its rows without the ground shadow, feet at (0, 0).
const BITZY_HEX: Record<string, string> = {
  o: "#00e87a", b: "#0d0e11", d: "#0d3a25", p: "#0a8c4c", e: "#00e87a", a: "#ffb84d", g: "#ffb84d", r: "#ff4f4f", z: "#5fd49a",
};
function bitzyActor() {
  const rows = ANIMATIONS.cheer.frames[0].map((r) => r.replace(/h/g, "."));
  const top = rows.findIndex((r) => /[^.]/.test(r));
  const bottom = rows.length - 1 - [...rows].reverse().findIndex((r) => /[^.]/.test(r));
  const body = rows.slice(top, bottom + 1);
  const w = body[0].length, h = body.length;
  const data = new Uint8Array(w * h), pixels = new Uint32Array(w * h);
  body.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === ".") return;
    data[y * w + x] = 1;
    pixels[y * w + x] = hex(BITZY_HEX[c]);
  }));
  const x = -Math.floor(w / 2), y = -h;
  return { rows: body, actor: { mask: { w, h, data }, pixels, x, y, w, h, k: 2, head: [0, y], chest: [0, Math.round(y / 2)] } };
}

/** Play a moment on a canvas sized to the effect; done() when it has ended. Returns a cancel function. */
export function play(canvas: HTMLCanvasElement, m: Moment, done: () => void): () => void {
  const e = effectFor(m);
  const [w, h] = e.mod.meta.size, [ox, oy] = e.mod.meta.origin;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * e.scale}px`;   // height follows (h-auto), so max-width keeps the shape on phones
  const ctx = canvas.getContext("2d");
  if (!ctx) { done(); return () => {}; }
  const frame = createFrame(w, h, -ox, -oy);
  const img = new ImageData(w, h);
  const bz = e.bitzy ? bitzyActor() : null;
  const fx = createFx(e.mod, { ...e.options, x: 0, y: 0, ...(bz ? { actor: bz.actor } : {}) });

  let last = performance.now(), raf = 0, stopped = false;
  const tick = (now: number) => {
    if (stopped) return;
    // Real time, so a slow device or a dropped frame keeps the pace (pixelfx substeps simulations itself);
    // capped so a tab coming back from the background resumes rather than skips to the end.
    fx.update(Math.min(0.25, (now - last) / 1000));
    last = now;
    clearFrame(frame);
    fx.draw(frame, "back");
    if (bz) {
      const p = painterFor(frame);
      p.place(0, 0, false, 0);
      p.sprite(bz.rows, BITZY_HEX, bz.actor.x, bz.actor.y, { a: actorAlphaOf(e.mod, fx.t, fx.options) });
    }
    fx.draw(frame, "front");
    composite(frame, img.data, null);
    ctx.putImageData(img, 0, 0);
    if (fx.done()) { stopped = true; done(); return; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
