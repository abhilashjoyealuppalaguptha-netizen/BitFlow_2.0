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

const PERIOD = 8;
/** A clock and a data bus as pixels across `cells` columns (plus one period, for a seamless scroll). */
export function tracePixels(cells: number): [x: number, y: number, dim: boolean][] {
  const out: [number, number, boolean][] = [];
  for (let x = 0; x < cells + PERIOD; x++) {
    const p = x % PERIOD, high = p < PERIOD / 2;
    out.push([x, high ? 0 : 3, false]);                                     // clk: high on y 0, low on y 3
    if (p === 0 || p === PERIOD / 2) out.push([x, 1, false], [x, 2, false]); // and its edges
    const cross = (x + 2) % PERIOD === 0;                                    // data changes just after the edge
    out.push(...(cross ? [[x, 6, true]] as [number, number, boolean][] : [[x, 5, true], [x, 7, true]] as [number, number, boolean][]));
  }
  return out;
}

/** A waveform viewer in pixels: clk and a data bus scrolling left, one step at a time. */
export function PixelTrace({ cells = 40, scale = 3, className = "" }: { cells?: number; scale?: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${cells} 8`} width={cells * scale} height={8 * scale} shapeRendering="crispEdges"
         className={`overflow-hidden text-phosphor ${className}`} aria-hidden>
      <g className="px-scroll" style={{ ["--px-shift" as string]: `${-PERIOD}px`, ["--px-steps" as string]: PERIOD }}>
        {tracePixels(cells).map(([x, y, dim]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" opacity={dim ? 0.55 : 1} />
        ))}
      </g>
    </svg>
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
      <PixelTrace cells={lg ? 48 : 40} scale={lg ? 3 : 2} />
      <p className={`font-mono ${lg ? "text-[13px]" : "text-[11px]"} text-ghost text-center max-w-sm`}>
        <span className="text-phosphor" aria-hidden>&gt; </span>{label}
        <span aria-hidden className="px-blink inline-block w-[0.55em] h-[1em] align-[-0.15em] ml-1 bg-phosphor" />
      </p>
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
