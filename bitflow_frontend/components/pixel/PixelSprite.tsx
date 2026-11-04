/**
 * components/pixel/PixelSprite.tsx — pixel-art Bitzy (lib/pixel/bitzy.ts) as an inline SVG.
 *
 * All frames of the animation sit side by side in one <g>; a CSS steps() animation slides it one
 * frame (24 user units) at a time, so it needs no JS, renders on the server and stays crisp at any
 * size. With reduced motion the global rule ends the animation at once and frame 0 shows.
 */

import { ANIMATIONS, COLORS, SIZE, runs, type Animation } from "@/lib/pixel/bitzy";

interface Props {
  anim?: Animation;
  /** Rendered size in CSS pixels; a multiple of 24 keeps every pixel the same size. */
  size?: number;
  /** Accessible name; omitted, the sprite is decorative. */
  label?: string;
  className?: string;
}

export default function PixelSprite({ anim = "idle", size = 48, label, className = "" }: Props) {
  const { frames, fps } = ANIMATIONS[anim];
  const n = frames.length;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`overflow-hidden shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g
        className={n > 1 ? "px-frames" : undefined}
        style={{ ["--px-n" as string]: n, ["--px-w" as string]: `${-SIZE * n}px`, animationDuration: `${n / fps}s` }}
      >
        {frames.map((rows, i) => (
          <g key={i} transform={`translate(${i * SIZE} 0)`}>
            {runs(rows).map(([x, y, w, c]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={COLORS[c]} />)}
          </g>
        ))}
      </g>
    </svg>
  );
}
