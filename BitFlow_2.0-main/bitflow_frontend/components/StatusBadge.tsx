/**
 * components/StatusBadge.tsx — Simulation outcome badge
 *
 * A small pill that communicates the result at a glance.
 * Shown in the terminal panel header after a run completes.
 *
 * Design:
 *   • Green  — success
 *   • Red    — compile_error / runtime_error / internal_error / file_missing
 *   • Amber  — timeout
 *   • Blue   — running (animated pulse)
 *   • Ghost  — idle (not shown)
 */

"use client";

import type { RunState, SimulationStatus } from "@/lib/types";

interface StatusBadgeProps {
  runState: RunState;
  status?: SimulationStatus;
}

// Map each SimulationStatus → { label, colour classes }
const STATUS_CONFIG: Record<
  SimulationStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  success:        { label: "PASS",     dot: "bg-phosphor",        text: "text-phosphor",       bg: "bg-phosphor/10 border-phosphor/30"  },
  compile_error:  { label: "COMPILE",  dot: "bg-danger",          text: "text-danger",         bg: "bg-danger/10 border-danger/30"      },
  runtime_error:  { label: "RUNTIME",  dot: "bg-danger",          text: "text-danger",         bg: "bg-danger/10 border-danger/30"      },
  timeout:        { label: "TIMEOUT",  dot: "bg-warn",            text: "text-warn",           bg: "bg-warn/10 border-warn/30"          },
  file_missing:   { label: "MISSING",  dot: "bg-danger",          text: "text-danger",         bg: "bg-danger/10 border-danger/30"      },
  internal_error: { label: "ERROR",    dot: "bg-danger",          text: "text-danger",         bg: "bg-danger/10 border-danger/30"      },
  unknown:        { label: "UNKNOWN",  dot: "bg-ghost",           text: "text-ghost",          bg: "bg-surface border-rim"              },
};

export default function StatusBadge({ runState, status }: StatusBadgeProps) {
  // While running — animated blue chip
  if (runState === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-info/30 bg-info/10 font-mono text-[10px] tracking-widest text-info">
        <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse_soft" />
        RUNNING
      </span>
    );
  }

  // Network/infra error (not a simulation result)
  if (runState === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-danger/30 bg-danger/10 font-mono text-[10px] tracking-widest text-danger">
        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
        NETWORK ERR
      </span>
    );
  }

  // No run yet or cleared
  if (!status || runState === "idle") return null;

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] tracking-widest ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
