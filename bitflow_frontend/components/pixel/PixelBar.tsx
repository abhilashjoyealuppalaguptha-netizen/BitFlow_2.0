"use client";
/**
 * components/pixel/PixelBar.tsx — a progress bar made of blocks.
 *
 *   <PixelBar value={7} max={12} label="Academy" />
 *
 * Lit blocks are value / max of the bar, rounded so any progress shows at least one block and only
 * complete shows all. On mount and on every change the newly lit blocks come on one after another.
 * Reduced motion: the global rule makes that instant.
 */

import { useEffect, useRef, useState } from "react";

const TONES = {
  phosphor: { on: "#00e87a", glow: "0 0 6px rgba(0,232,122,.55)" },
  gold:     { on: "#ffb84d", glow: "0 0 6px rgba(255,184,77,.5)" },
  info:     { on: "#4db8ff", glow: "0 0 6px rgba(77,184,255,.5)" },
  danger:   { on: "#ff4f4f", glow: "0 0 6px rgba(255,79,79,.5)" },
  violet:   { on: "#c084fc", glow: "0 0 6px rgba(192,132,252,.5)" },
} as const;

interface Props {
  value: number;
  max: number;
  /** Blocks in the bar. */
  segments?: number;
  tone?: keyof typeof TONES;
  /** Accessible name. */
  label?: string;
  /** Block height in px. */
  height?: number;
  className?: string;
}

/** Blocks to light for value of max out of segments: 0 only at 0, segments only when complete. */
export function litBlocks(value: number, max: number, segments: number): number {
  if (max <= 0 || value <= 0) return 0;
  if (value >= max) return segments;
  return Math.min(segments - 1, Math.max(1, Math.round((value / max) * segments)));
}

export default function PixelBar({ value, max, segments = 20, tone = "phosphor", label, height = 8, className = "" }: Props) {
  const target = litBlocks(value, max, segments);
  const shown = useRef(0);
  const [lit, setLit] = useState(0);
  const [from, setFrom] = useState(0);
  useEffect(() => {
    setFrom(shown.current);
    setLit(target);
    shown.current = target;
  }, [target]);
  const t = TONES[tone];
  return (
    <div
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}
      className={`flex gap-[2px] w-full ${className}`}
    >
      {Array.from({ length: segments }, (_, i) => {
        const on = i < lit;
        return (
          <span key={i} className="px-cell flex-1 min-w-[2px]"
                style={{ height, backgroundColor: on ? t.on : "rgba(255,255,255,.06)", boxShadow: on ? t.glow : "none",
                         transitionDelay: on && i >= from ? `${(i - from) * 35}ms` : "0ms" }} />
        );
      })}
    </div>
  );
}
