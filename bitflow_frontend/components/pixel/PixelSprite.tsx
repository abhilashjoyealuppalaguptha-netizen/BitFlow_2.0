/**
 * components/pixel/PixelSprite.tsx — pixel art as an inline SVG: pixel Bitzy (lib/pixel/bitzy.ts) and,
 * through PixelFrames, the icons (lib/pixel/icons.ts).
 *
 * All frames sit side by side in one <g>; a CSS steps() animation slides it one frame at a time, so it
 * needs no JS, renders on the server and stays crisp at any size. With reduced motion the global rule
 * ends the animation at once and frame 0 shows.
 */

import { ANIMATIONS, COLORS, runs, type Animation } from "@/lib/pixel/bitzy";

interface FramesProps {
  frames: readonly (readonly string[])[];
  fps: number;
  /** Pixel character → fill. */
  colors: Record<string, string>;
  /** Rendered size in CSS pixels; a multiple of the grid size keeps every pixel the same size. */
  size: number;
  label?: string;
  className?: string;
}

/** Any square pixel-art frame strip (each frame: rows of characters), stepped in CSS. */
export function PixelFrames({ frames, fps, colors, size, label, className = "" }: FramesProps) {
  const n = frames.length, grid = frames[0].length;
  return (
    <svg
      viewBox={`0 0 ${grid} ${grid}`}
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
        style={n > 1 ? { ["--px-n" as string]: n, ["--px-w" as string]: `${-grid * n}px`, animationDuration: `${n / fps}s` } : undefined}
      >
        {frames.map((rows, i) => (
          <g key={i} transform={`translate(${i * grid} 0)`}>
            {runs([...rows]).map(([x, y, w, c]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={colors[c]} />)}
          </g>
        ))}
      </g>
    </svg>
  );
}

interface Props {
  anim?: Animation;
  /** Rendered size in CSS pixels; a multiple of 24 keeps every pixel the same size. */
  size?: number;
  /** Accessible name; omitted, the sprite is decorative. */
  label?: string;
  className?: string;
}

/** Pixel Bitzy. */
export default function PixelSprite({ anim = "idle", size = 48, label, className = "" }: Props) {
  const { frames, fps } = ANIMATIONS[anim];
  return <PixelFrames frames={frames} fps={fps} colors={COLORS} size={size} label={label} className={className} />;
}
