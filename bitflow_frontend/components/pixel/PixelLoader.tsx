/**
 * components/pixel/PixelLoader.tsx — the loading states, in pixels.
 *
 *   <PixelLoader label="Loading the tool…" />            panel (md, default)
 *   <PixelLoader size="lg" label="Loading problem…" />    full page, centred
 *   <PixelLoader size="sm" label="Loading…" />            inline, one line
 *   <PixelSpinner />                                       a 3 × 3 block chase for busy buttons
 *   <PixelDots />                                          three blocks: someone is typing
 *
 * Bitzy at work above a row of blocks lit in a chase. The label is the status for screen readers.
 */

import PixelSprite from "./PixelSprite";

interface LoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** A row of blocks with a lit group running along it. */
export function PixelChase({ blocks = 10, cell = 6, className = "" }: { blocks?: number; cell?: number; className?: string }) {
  const period = 0.9;
  return (
    <span className={`inline-flex gap-[2px] ${className}`} aria-hidden>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className="px-chase block" style={{ width: cell, height: cell, animationDelay: `${(i / blocks) * period - period}s` }} />
      ))}
    </span>
  );
}

export default function PixelLoader({ label = "Loading…", size = "md", className = "" }: LoaderProps) {
  if (size === "sm") {
    return (
      <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 font-mono text-[12px] text-dim ${className}`}>
        <PixelSprite anim="work" size={24} />
        <span>{label}</span>
      </span>
    );
  }
  const lg = size === "lg";
  return (
    <div role="status" aria-live="polite"
         className={`flex flex-col items-center justify-center gap-3 ${lg ? "min-h-[60vh]" : "py-6"} ${className}`}>
      <PixelSprite anim="work" size={lg ? 96 : 48} />
      <PixelChase blocks={lg ? 12 : 10} cell={lg ? 8 : 6} />
      <p className={`font-mono ${lg ? "text-[13px]" : "text-[11px]"} text-ghost text-center max-w-sm`}>{label}</p>
    </div>
  );
}

/** Eight blocks around a dark centre, lit one after another: for busy buttons, sized to the text. */
export function PixelSpinner({ size = 12, className = "" }: { size?: number; className?: string }) {
  const ring = [0, 1, 2, 5, 8, 7, 6, 3];            // clockwise around a 3 × 3 grid
  const cell = Math.max(2, Math.floor((size - 2) / 3));
  return (
    <span className={`inline-grid grid-cols-3 gap-px align-middle ${className}`} style={{ width: cell * 3 + 2, height: cell * 3 + 2 }} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => {
        const at = ring.indexOf(i);
        return at < 0
          ? <span key={i} />
          : <span key={i} className="px-chase block" style={{ width: cell, height: cell, animationDelay: `${(at / 8) * 0.9 - 0.9}s`,
              ["--px-on" as string]: "currentColor", ["--px-off" as string]: "color-mix(in srgb, currentColor 18%, transparent)" }} />;
      })}
    </span>
  );
}

/** Three blocks lighting in turn. */
export function PixelDots({ className = "" }: { className?: string }) {
  return <PixelChase blocks={3} cell={5} className={className} />;
}
