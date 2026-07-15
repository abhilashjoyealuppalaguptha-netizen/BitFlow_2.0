"use client";

import type { ComponentType } from "react";
import type { InteractiveWidgetId } from "@/lib/academy-types";
import BooleanAlgebraBuilder from "./BooleanAlgebraBuilder";
import NumberSystemConverter from "./NumberSystemConverter";
import LogicGatePlayground from "./LogicGatePlayground";
import FlipFlopToggle from "./FlipFlopToggle";
import FSMExplorer from "./FSMExplorer";
import MemoryVisualizer from "./MemoryVisualizer";

const WIDGETS: Record<InteractiveWidgetId, ComponentType> = {
  "boolean-algebra-builder": BooleanAlgebraBuilder,
  "number-system-converter": NumberSystemConverter,
  "logic-gate-playground":   LogicGatePlayground,
  "flip-flop-toggle":        FlipFlopToggle,
  "fsm-explorer":            FSMExplorer,
  "memory-visualizer":       MemoryVisualizer,
};

const WIDGET_TITLES: Record<InteractiveWidgetId, string> = {
  "boolean-algebra-builder": "Boolean Algebra Playground",
  "number-system-converter": "Number System Converter",
  "logic-gate-playground":   "Logic Gate Playground",
  "flip-flop-toggle":        "Flip-Flop Simulator",
  "fsm-explorer":            "FSM State Explorer",
  "memory-visualizer":       "Memory Read/Write Lab",
};

interface Props {
  id: InteractiveWidgetId;
}

export default function InteractiveWidget({ id }: Props) {
  const Component = WIDGETS[id];
  if (!Component) return null;

  return (
    <section className="rounded-lg border border-phosphor/20 bg-surface/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-rim/40 bg-phosphor/5 flex items-center gap-2">
        <span className="font-mono text-[9px] text-phosphor uppercase tracking-widest">
          Interactive
        </span>
        <span className="text-rim">·</span>
        <span className="font-mono text-[10px] text-bright">{WIDGET_TITLES[id]}</span>
      </div>
      <div className="p-4">
        <Component />
      </div>
    </section>
  );
}

export { WIDGET_TITLES };
