"use client";

import { useState, useCallback } from "react";

type FFType = "D" | "T" | "JK";

export default function FlipFlopToggle() {
  const [ffType, setFfType] = useState<FFType>("D");
  const [q, setQ] = useState(false);
  const [d, setD] = useState(false);
  const [t, setT] = useState(false);
  const [j, setJ] = useState(false);
  const [k, setK] = useState(false);
  const [clk, setClk] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const tick = useCallback(() => {
    setClk(true);
    setTimeout(() => setClk(false), 200);

    let nextQ = q;
    if (ffType === "D") {
      nextQ = d;
    } else if (ffType === "T") {
      nextQ = t ? !q : q;
    } else {
      if (j && k) nextQ = !q;
      else if (j) nextQ = true;
      else if (k) nextQ = false;
    }

    setQ(nextQ);
    setHistory((h) => [
      `↑ edge: Q ← ${nextQ ? "1" : "0"} (${ffType} FF)`,
      ...h.slice(0, 7),
    ]);
  }, [q, d, t, j, k, ffType]);

  const reset = () => {
    setQ(false);
    setHistory(["Reset: Q ← 0"]);
  };

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-ghost/80">
        Set inputs, then hit <span className="text-phosphor">Clock ↑</span> to see the
        flip-flop capture on the rising edge — just like posedge clk in Verilog.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["D", "T", "JK"] as FFType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFfType(f)}
            className={`font-mono text-[10px] px-3 py-1.5 rounded border ${
              ffType === f
                ? "border-info bg-info/15 text-info"
                : "border-rim/50 text-ghost hover:border-rim"
            }`}
          >
            {f} Flip-Flop
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4 space-y-3">
          <h4 className="font-mono text-[9px] text-dim uppercase">Inputs</h4>
          {ffType === "D" && (
            <ToggleBit label="D (data)" value={d} onChange={setD} />
          )}
          {ffType === "T" && (
            <ToggleBit label="T (toggle enable)" value={t} onChange={setT} />
          )}
          {ffType === "JK" && (
            <>
              <ToggleBit label="J" value={j} onChange={setJ} />
              <ToggleBit label="K" value={k} onChange={setK} />
            </>
          )}
          <button
            type="button"
            onClick={tick}
            className={`w-full font-mono text-[11px] py-3 rounded border font-bold transition-all ${
              clk
                ? "border-phosphor bg-phosphor/30 text-phosphor scale-[0.98]"
                : "border-phosphor/50 bg-phosphor/10 text-phosphor hover:bg-phosphor/20"
            }`}
          >
            ⏱ Clock ↑ (posedge)
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-full font-mono text-[10px] py-2 rounded border border-rim/50 text-dim hover:text-ghost"
          >
            Async Reset
          </button>
        </div>

        {/* State */}
        <div className="rounded border border-rim/60 bg-pit/60 p-4 space-y-4">
          <h4 className="font-mono text-[9px] text-dim uppercase">State Register</h4>
          <div className="flex justify-center gap-8">
            <StateBit label="Q" value={q} />
            <StateBit label="Q̄" value={!q} dimmed />
          </div>

          {/* Clock waveform */}
          <div className="h-12 flex items-end gap-0.5 px-2">
            {[...history].reverse().slice(0, 12).map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all ${
                  i % 2 === 0 ? "bg-phosphor/60 h-8" : "bg-rim h-4"
                }`}
              />
            ))}
          </div>

          <div className="space-y-1 max-h-28 overflow-y-auto">
            {history.map((line, i) => (
              <p
                key={i}
                className={`font-mono text-[9px] ${
                  i === 0 ? "text-phosphor" : "text-dim"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleBit({
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
      className="flex items-center justify-between w-full px-3 py-2 rounded border border-rim/40 hover:border-rim transition-colors"
    >
      <span className="font-mono text-[10px] text-ghost">{label}</span>
      <span
        className={`w-8 h-8 rounded flex items-center justify-center font-mono text-sm font-bold border ${
          value ? "border-phosphor bg-phosphor/20 text-phosphor" : "border-rim text-dim"
        }`}
      >
        {value ? "1" : "0"}
      </span>
    </button>
  );
}

function StateBit({
  label,
  value,
  dimmed,
}: {
  label: string;
  value: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-[9px] text-dim">{label}</span>
      <div
        className={`w-20 h-20 rounded-xl flex items-center justify-center font-mono text-3xl font-bold border-2 transition-all duration-500 ${
          value
            ? dimmed
              ? "border-danger/40 bg-danger/10 text-danger/60"
              : "border-phosphor bg-phosphor/20 text-phosphor shadow-[0_0_24px_rgba(0,232,122,0.35)]"
            : "border-rim bg-surface text-dim"
        }`}
      >
        {value ? "1" : "0"}
      </div>
    </div>
  );
}
