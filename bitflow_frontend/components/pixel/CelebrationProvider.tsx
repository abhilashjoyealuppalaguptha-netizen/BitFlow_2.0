"use client";
/**
 * components/pixel/CelebrationProvider.tsx — reward moments, one after another.
 *
 *   const celebrate = useCelebrate();
 *   celebrate({ kind: "accepted" }, { kind: "xp", xp: 300 });
 *
 * Each moment plays as a pixel effect (PixelBurst, loaded on the first one). With reduced motion it is a
 * still pixel toast instead. Either way a screen reader hears it once, from a live region.
 */

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Moment } from "@/lib/pixel/celebrate";
import PixelSprite from "./PixelSprite";

const PixelBurst = dynamic(() => import("./PixelBurst"), { ssr: false });

type Celebrate = (...moments: Moment[]) => void;
const Ctx = createContext<Celebrate>(() => {});
export const useCelebrate = () => useContext(Ctx);

/** What a moment says, for the toast and screen readers. */
export function momentText(m: Moment): string {
  switch (m.kind) {
    case "accepted": return "Accepted!";
    case "xp":       return `+${m.xp} XP`;
    case "level":    return `Level ${m.level}!`;
    case "badge":    return `Badge earned: ${m.label}`;
    case "win":      return "Nice work!";
  }
}

const TOAST_MS = 2600;

export default function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<{ id: number; m: Moment }[]>([]);
  const ids = useRef(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const on = () => setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const celebrate = useCallback<Celebrate>((...moments) => setQueue((q) => [...q, ...moments.map((m) => ({ id: ++ids.current, m }))].slice(0, 6)), []);
  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  const head = queue[0], current = head?.m;

  useEffect(() => {
    if (!current || !still) return;
    const t = setTimeout(next, TOAST_MS);
    return () => clearTimeout(t);
  }, [current, still, next]);

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      <div className="sr-only" role="status" aria-live="polite">{current ? momentText(current) : ""}</div>
      {current && !still && <PixelBurst key={head.id} moment={current} onDone={next} />}
      {current && still && (
        <div className="fixed inset-x-0 top-6 z-[60] flex justify-center pointer-events-none" aria-hidden>
          <div className="flex items-center gap-3 border-2 border-phosphor/50 bg-pit px-4 py-2 shadow-[0_0_24px_rgba(0,232,122,.2)]">
            <PixelSprite anim="cheer" size={48} />
            <span className="font-pixel text-[26px] leading-none text-phosphor">{momentText(current)}</span>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
