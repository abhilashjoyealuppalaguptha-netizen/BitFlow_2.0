"use client";

import { useState } from "react";

type GateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";

const GATES: GateType[] = ["AND", "OR", "NOT", "XOR", "NAND", "NOR"];

function evalGate(gate: GateType, a: boolean, b: boolean): boolean {
  switch (gate) {
    case "AND":  return a && b;
    case "OR":   return a || b;
    case "NOT":  return !a;
    case "XOR":  return a !== b;
    case "NAND": return !(a && b);
    case "NOR":  return !(a || b);
  }
}

const GATE_SYMBOLS: Record<GateType, string> = {
  AND:  "&",
  OR:   "≥1",
  NOT:  "1",
  XOR:  "=1",
  NAND: "&̄",
  NOR:  "≥̄1",
};

export default function LogicGatePlayground() {
  const [gate, setGate] = useState<GateType>("AND");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);

  const isUnary = gate === "NOT";
  const out = evalGate(gate, a, b);

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-ghost/80">
        Pick a gate, flip inputs, and explore the full truth table. Watch the output
        glow when it&apos;s HIGH!
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        {GATES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGate(g)}
            className={`font-mono text-[10px] px-3 py-1.5 rounded border transition-all ${
              gate === g
                ? "border-phosphor bg-phosphor/15 text-phosphor"
                : "border-rim/50 text-ghost hover:border-rim"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Circuit diagram */}
      <div className="rounded border border-rim/60 bg-pit/60 p-6 flex items-center justify-center gap-4 flex-wrap min-h-[140px]">
        <InputWire label="A" value={a} onClick={() => setA(!a)} />
        {!isUnary && <InputWire label="B" value={b} onClick={() => setB(!b)} />}

        <div className="relative flex items-center">
          <div className="w-8 h-0.5 bg-rim" />
          <div
            className={`w-16 h-14 rounded-lg border-2 flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-300 ${
              out
                ? "border-phosphor bg-phosphor/10 text-phosphor shadow-[0_0_16px_rgba(0,232,122,0.25)]"
                : "border-info/50 bg-info/5 text-info"
            }`}
          >
            {GATE_SYMBOLS[gate]}
            <span className="absolute -top-4 font-mono text-[8px] text-dim">{gate}</span>
          </div>
          <div
            className={`w-10 h-0.5 transition-colors duration-300 ${
              out ? "bg-phosphor" : "bg-rim"
            }`}
          />
        </div>

        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center font-mono text-xl font-bold border-2 transition-all duration-300 ${
            out
              ? "bg-phosphor/25 border-phosphor text-phosphor animate-glow"
              : "bg-surface border-rim text-dim"
          }`}
        >
          {out ? "1" : "0"}
        </div>
      </div>

      {/* Truth table */}
      <div className="rounded border border-rim/60 overflow-hidden">
        <table className="w-full font-mono text-[10px]">
          <thead>
            <tr className="bg-surface/60 text-dim border-b border-rim/40">
              <th className="py-2 px-3 text-center">A</th>
              {!isUnary && <th className="py-2 px-3 text-center">B</th>}
              <th className="py-2 px-3 text-center">Y</th>
            </tr>
          </thead>
          <tbody>
            {(isUnary ? [0, 1] : [0, 1].flatMap((av) => [0, 1].map((bv) => [av, bv]))).map(
              (row) => {
                const av = isUnary ? (row as number) : (row as number[])[0];
                const bv = isUnary ? false : (row as number[])[1];
                const y = evalGate(gate, !!av, !!bv);
                const active = av === (a ? 1 : 0) && (isUnary || bv === (b ? 1 : 0));
                return (
                  <tr
                    key={isUnary ? `a${av}` : `a${av}b${bv}`}
                    className={`border-b border-rim/20 cursor-pointer hover:bg-surface/40 ${
                      active ? "bg-phosphor/10 text-phosphor" : "text-ghost"
                    }`}
                    onClick={() => {
                      setA(!!av);
                      if (!isUnary) setB(!!bv);
                    }}
                  >
                    <td className="py-1.5 px-3 text-center">{av}</td>
                    {!isUnary && <td className="py-1.5 px-3 text-center">{bv}</td>}
                    <td className="py-1.5 px-3 text-center font-bold">{y ? "1" : "0"}</td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputWire({
  label,
  value,
  onClick,
}: {
  label: string;
  value: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 group">
      <span
        className={`w-10 h-10 rounded flex items-center justify-center font-mono text-lg font-bold border-2 transition-all duration-200 group-active:scale-95 ${
          value
            ? "bg-phosphor/20 border-phosphor text-phosphor"
            : "bg-surface border-rim text-dim"
        }`}
      >
        {value ? "1" : "0"}
      </span>
      <span className="font-mono text-[9px] text-dim">{label}</span>
      <div
        className={`w-6 h-0.5 transition-colors ${value ? "bg-phosphor" : "bg-rim"}`}
      />
    </button>
  );
}
