/**
 * components/pixel/PixelIcon.tsx — the chip-and-HDL pixel set (lib/pixel/icons.ts).
 *
 *   <PixelIcon name="chip" size={24} />            a 12 × 12 icon in the text colour (2× = 24 px)
 *   <PixelDigits value={42} height={14} />         seven-segment LED digits, unlit segments faint
 *   <LevelChip level={7} />                        a DIP-chip badge reading LV 7
 */

import Link from "next/link";
import { BADGE_ICON, ICONS, ICON_COLORS, digitPixels, type IconName } from "@/lib/pixel/icons";
import { PixelFrames } from "./PixelSprite";

export function PixelIcon({ name, size = 24, label, className = "" }: { name: IconName; size?: number; label?: string; className?: string }) {
  const { frames, fps } = ICONS[name];
  return <PixelFrames frames={frames} fps={fps} colors={ICON_COLORS} size={size} label={label} className={className} />;
}

export const badgeIcon = (id: string): IconName => BADGE_ICON[id] ?? "chip";

/** Seven-segment digits, each 4 × 7 pixels with a 1-pixel gap; lit in the text colour. */
export function PixelDigits({ value, height = 14, className = "" }: { value: number | string; height?: number; className?: string }) {
  const chars = String(value).split("");
  const w = chars.length * 5 - 1;
  return (
    <svg viewBox={`0 0 ${w} 7`} height={height} width={(height / 7) * w} shapeRendering="crispEdges"
         className={`inline-block align-[-2px] ${className}`} role="img" aria-label={String(value)}>
      {chars.map((ch, i) => digitPixels(ch).map(([x, y, lit]) => (
        <rect key={`${i}-${x}-${y}`} x={i * 5 + x} y={y} width={1} height={1}
              fill="currentColor" opacity={lit ? 1 : 0.12} />
      )))}
    </svg>
  );
}

/** The level as a little DIP chip: pins top and bottom, "LV" and LED digits on the package. */
export function LevelChip({ level, href, className = "" }: { level: number; href?: string; className?: string }) {
  const body = (
    <span className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 border-2 border-phosphor/70 bg-pit text-phosphor ${className}`}
          title={`Level ${level}`}>
      {/* the pins */}
      <span aria-hidden className="absolute -top-[5px] inset-x-1 flex justify-between">
        {[0, 1, 2, 3].map((i) => <span key={i} className="w-[3px] h-[3px] bg-phosphor/70" />)}
      </span>
      <span aria-hidden className="absolute -bottom-[5px] inset-x-1 flex justify-between">
        {[0, 1, 2, 3].map((i) => <span key={i} className="w-[3px] h-[3px] bg-phosphor/70" />)}
      </span>
      <span className="font-pixel text-[13px] leading-none text-phosphor/80">LV</span>
      <PixelDigits value={level} height={11} />
    </span>
  );
  return href ? <Link href={href} aria-label={`Level ${level}: your profile`} className="inline-flex">{body}</Link> : body;
}
