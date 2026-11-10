/**
 * components/pixel/PixelEmpty.tsx — an empty state: Bitzy, a short pixel-font title, the message
 * and an optional action.
 *
 *   <PixelEmpty title="Nothing yet" action={<Link href="/problems">Solve a problem</Link>}>
 *     Your submissions will show up here.
 *   </PixelEmpty>
 */

import type { ReactNode } from "react";
import PixelSprite from "./PixelSprite";
import type { Animation } from "@/lib/pixel/bitzy";

interface Props {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  anim?: Animation;
  compact?: boolean;
  className?: string;
}

export default function PixelEmpty({ title, children, action, anim = "sleep", compact = false, className = "" }: Props) {
  return (
    <div className={`flex ${compact ? "flex-row text-left gap-3 py-3" : "flex-col text-center gap-2 py-8"} items-center justify-center ${className}`}>
      <PixelSprite anim={anim} size={compact ? 36 : 72} />
      <div className={compact ? "" : "max-w-sm"}>
        {title && <p className="font-pixel text-[22px] leading-none text-pale tracking-wide">{title}</p>}
        {children && <div className="font-mono text-[12px] text-ghost mt-1">{children}</div>}
        {action && <div className="mt-3 font-mono text-[12px]">{action}</div>}
      </div>
    </div>
  );
}
