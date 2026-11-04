/**
 * lib/pixel/icons.ts — 12 × 12 pixel icons for the chip-and-HDL look: a DIP chip, an AND gate, a clock
 * waveform, an LED, a flickering flame, a star and a trophy; and seven-segment digits. Drawn by
 * components/pixel/PixelIcon.tsx.
 *
 * Characters: x = the icon's colour (currentColor), d = the same, dim; a = gold; w = white hot;
 * r = flame orange; . = empty. Frame 0 of an animated icon is its still. Self-check: scripts/pixel.check.ts.
 */

import { HEX_SEGS } from "../board-io";

export const ICON_SIZE = 12;

export const ICON_COLORS: Record<string, string> = {
  x: "currentColor",
  d: "color-mix(in srgb, currentColor 22%, transparent)",
  a: "var(--px-gold, #ffb84d)",
  w: "#fff4bc",
  r: "#ff7a2a",
};

const CHIP = [
  "..x.x..x.x..",
  "..x.x..x.x..",
  ".xxxxxxxxxx.",
  ".xddddddddx.",
  ".xdaddddddx.",
  ".xddddddddx.",
  ".xddddddddx.",
  ".xddddddddx.",
  ".xxxxxxxxxx.",
  "..x.x..x.x..",
  "..x.x..x.x..",
  "............",
];

const GATE = [
  "............",
  "............",
  "..xxxxx.....",
  "xxx....xx...",
  "..x......x..",
  "..x......xxx",
  "..x......x..",
  "xxx....xx...",
  "..xxxxx.....",
  "............",
  "............",
  "............",
];

// A clock trace, two frames half a period apart: animated, it marches.
const WAVE = [
  [
    "............",
    "............",
    "............",
    "...xxx...xxx",
    "...x.x...x..",
    "...x.x...x..",
    "...x.x...x..",
    "xxxx.xxxxx..",
    "............",
    "............",
    "............",
    "............",
  ],
  [
    "............",
    "............",
    "............",
    "xxx...xxx...",
    "..x...x.x...",
    "..x...x.x...",
    "..x...x.x...",
    "..xxxxx.xxxx",
    "............",
    "............",
    "............",
    "............",
  ],
];

const LED = [
  "............",
  "....xxxx....",
  "...xaaaax...",
  "...xawaax...",
  "...xaaaax...",
  "...xaaaax...",
  "..xxxxxxxx..",
  "....x..x....",
  "....x..x....",
  "....x..x....",
  "....x.......",
  "............",
];

const FLAME = [
  [
    "......r.....",
    ".....rr.....",
    ".....rrr....",
    "....rrrr.r..",
    "..r.rrarrr..",
    "..rrrraarr..",
    ".rrraaaarrr.",
    ".rraaawaarr.",
    ".rraawwaarr.",
    "..rraaaarr..",
    "...rrrrrr...",
    "............",
  ],
  [
    ".....r......",
    ".....rr.....",
    "....rrr.....",
    "..r.rrrr....",
    "..rrrarrr.r.",
    "..rrraarrrr.",
    ".rrraaaarrr.",
    ".rraawaaarr.",
    ".rraawwaarr.",
    "..rraaaarr..",
    "...rrrrrr...",
    "............",
  ],
];

const STAR = [
  ".....aa.....",
  ".....aa.....",
  "....aaaa....",
  "aaaaaaaaaaaa",
  ".aaaaaaaaaa.",
  "..aaaaaaaa..",
  "...aaaaaa...",
  "..aaaaaaaa..",
  "..aaa..aaa..",
  ".aaa....aaa.",
  ".aa......aa.",
  "............",
];

const TROPHY = [
  "............",
  "..aaaaaaaa..",
  "aaaaaaaaaaaa",
  "a.aaawaaaa.a",
  "a.aaawaaaa.a",
  ".aaaaaaaaaa.",
  "...aaaaaa...",
  ".....aa.....",
  ".....aa.....",
  "...aaaaaa...",
  "..aaaaaaaa..",
  "............",
];

export const ICONS = {
  chip:   { frames: [CHIP], fps: 1 },
  gate:   { frames: [GATE], fps: 1 },
  wave:   { frames: WAVE, fps: 4 },
  led:    { frames: [LED], fps: 1 },
  flame:  { frames: FLAME, fps: 5 },
  star:   { frames: [STAR], fps: 1 },
  trophy: { frames: [TROPHY], fps: 1 },
} as const;

export type IconName = keyof typeof ICONS;

/** The icon for each profile badge (lib/profile.ts ids); others get the chip. */
export const BADGE_ICON: Record<string, IconName> = {
  "first-solve": "chip",
  "solved-10":   "gate",
  "solved-25":   "wave",
  "solved-50":   "star",
  "streak-7":    "flame",
  "beginner":    "led",
  "contest":     "trophy",
};

// Seven-segment digits on a 4 × 7 grid, segments a–g as in lib/board-io.ts HEX_SEGS (bit 0 = a).
const SEG_PIXELS: [number, number][][] = [
  [[1, 0], [2, 0]],   // a top
  [[3, 1], [3, 2]],   // b top right
  [[3, 4], [3, 5]],   // c bottom right
  [[1, 6], [2, 6]],   // d bottom
  [[0, 4], [0, 5]],   // e bottom left
  [[0, 1], [0, 2]],   // f top left
  [[1, 3], [2, 3]],   // g middle
];

/** One character's segment pixels on its 4 × 7 grid: [x, y, lit]. Hex digits and "-"; anything else is dark. */
export function digitPixels(ch: string): [number, number, boolean][] {
  const v = parseInt(ch, 16);
  const mask = ch === "-" ? 0x40 : Number.isNaN(v) ? 0 : HEX_SEGS[v];
  return SEG_PIXELS.flatMap((pts, s) => pts.map(([x, y]) => [x, y, ((mask >> s) & 1) === 1] as [number, number, boolean]));
}
