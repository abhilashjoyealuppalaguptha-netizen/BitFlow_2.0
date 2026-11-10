"use client";
/**
 * components/pixel/PixelBurst.tsx — plays one reward moment (lib/pixel/celebrate.ts) on a canvas over
 * the page, scaled up with hard pixels; clicks go through it. Loaded by CelebrationProvider on the first
 * celebration, so pixelfx is in this chunk only.
 */

import { useEffect, useRef } from "react";
import { play, type Moment } from "@/lib/pixel/celebrate";

export default function PixelBurst({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    return play(canvas.current, moment, onDone);
  }, [moment, onDone]);
  return (
    <div className="fixed inset-x-0 top-[14vh] z-[60] flex justify-center pointer-events-none" aria-hidden>
      <canvas ref={canvas} className="max-w-[96vw] h-auto" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
