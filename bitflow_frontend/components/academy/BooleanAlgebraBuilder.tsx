"use client";

import { useState } from "react";

const LAWS: { name: string; expr: string; result: string }[] = [
  { name: "Identity (OR)",   expr: "A + 0",     result: "A" },
  { name: "Identity (AND)",  expr: "A · 1",     result: "A" },
  { name: "Domination (OR)", expr: "A + 1",     result: "1" },
  { name: "Domination (AND)",expr: "A · 0",     result: "0" },
  { name: "Idempotent (OR)", expr: "A + A",     result: "A" },
  { name: "Idempotent (AND)",expr: "A · A",     result: "A" },
  { name: "Complement (OR)", expr: "A + Ā",     result: "1" },
  { name: "Complement (AND)",expr: "A · Ā",     result: "0" },
  { name: "Absorption",      expr: "A + A·B",   result: "A" },
  { name: "De Morgan",       expr: "(A+B)̄",    result: "Ā·B̄" },
];

function evalExpr(a: boolean, b: boolean, op: "and" | "or" | "xor" | "nand"): boolean {
  switch (op) {
    case "and":  return a && b;
    case "or":   return a || b;
    case "xor":  return a !== b;
    case "nand": return !(a && b);
  }
}

export default function BooleanAlgebraBuilder() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [op, setOp] = useState<"and" | "or" | "xor" | "nand">("and");
  const [lawIdx, setLawIdx] = useState(0);

  const result = evalExpr(a, b, op);
  const law = LAWS[lawIdx];

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-ghost/80">
        Toggle inputs and pick an operator — watch the live truth table update.
        Step through Boolean laws on the right.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Expression builder */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4 space-y-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <BitToggle label="A" value={a} onChange={setA} />
            <span className="font-mono text-phosphor text-lg">
              {op === "and" ? "·" : op === "or" ? "+" : op === "xor" ? "⊕" : "↑"}
            </span>
            <BitToggle label="B" value={b} onChange={setB} />
            <span className="font-mono text-ghost">=</span>
            <span
              className={`w-12 h-12 rounded-lg flex items-center justify-center font-mono text-xl font-bold border-2 transition-all duration-300 ${
                result
                  ? "bg-phosphor/20 border-phosphor text-phosphor shadow-[0_0_20px_rgba(0,232,122,0.3)]"
                  : "bg-surface border-rim text-dim"
              }`}
            >
              {result ? "1" : "0"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {(["and", "or", "xor", "nand"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOp(o)}
                className={`font-mono text-[10px] px-3 py-1.5 rounded border transition-all ${
                  op === o
                    ? "border-phosphor bg-phosphor/15 text-phosphor"
                    : "border-rim/50 text-ghost hover:border-rim"
                }`}
              >
                {o.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Mini truth table */}
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr className="text-dim border-b border-rim/40">
                <th className="py-1 text-center">A</th>
                <th className="py-1 text-center">B</th>
                <th className="py-1 text-center">Out</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].flatMap((av) =>
                [0, 1].map((bv) => {
                  const out = evalExpr(!!av, !!bv, op);
                  const highlight = av === (a ? 1 : 0) && bv === (b ? 1 : 0);
                  return (
                    <tr
                      key={`${av}${bv}`}
                      className={`border-b border-rim/20 ${
                        highlight ? "bg-phosphor/10 text-phosphor" : "text-ghost"
                      }`}
                    >
                      <td className="py-1 text-center">{av}</td>
                      <td className="py-1 text-center">{bv}</td>
                      <td className="py-1 text-center font-bold">{out ? "1" : "0"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Laws explorer */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4 space-y-3">
          <h4 className="font-mono text-[10px] text-dim uppercase tracking-wider">
            Boolean Laws
          </h4>
          <div className="font-mono text-[13px] text-bright text-center py-4">
            <span className="text-info">{law.expr}</span>
            <span className="text-ghost mx-2">=</span>
            <span className="text-phosphor">{law.result}</span>
          </div>
          <p className="font-mono text-[9px] text-dim text-center">{law.name}</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setLawIdx((i) => (i - 1 + LAWS.length) % LAWS.length)}
              className="font-mono text-[10px] px-3 py-1 rounded border border-rim/50 text-ghost hover:border-rim"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setLawIdx((i) => (i + 1) % LAWS.length)}
              className="font-mono text-[10px] px-3 py-1 rounded border border-rim/50 text-ghost hover:border-rim"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BitToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex flex-col items-center gap-1 transition-transform active:scale-95`}
    >
      <span className="font-mono text-[9px] text-dim">{label}</span>
      <span
        className={`w-14 h-14 rounded-xl flex items-center justify-center font-mono text-2xl font-bold border-2 transition-all duration-300 ${
          value
            ? "bg-phosphor/25 border-phosphor text-phosphor"
            : "bg-surface border-rim text-dim hover:border-ghost"
        }`}
      >
        {value ? "1" : "0"}
      </span>
    </button>
  );
}
