"use client";
/**
 * components/CoveragePanel.tsx — results of a Verilator run (api/verilator_sim.py):
 * failed assertions, then coverage of design.v — line, branch, toggle and `cover` points —
 * with the source annotated so the untested parts stand out. Coverage only counts the
 * design, not the testbench, the way verification teams measure it.
 */

import type { Coverage, CoverageCount, SimulateResponse } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: SimulateResponse | null;
  designCode: string;
}

const KINDS: [keyof Coverage["summary"], string, string][] = [
  ["line", "Line", "Statements that ran at least once"],
  ["branch", "Branch", "Each side of every if / case was taken"],
  ["toggle", "Toggle", "Each signal bit changed at least once"],
  ["user", "Cover", "Your cover property / cover statements that happened"],
];

function tone(p: number | null) {
  if (p === null) return "text-dim";
  return p >= 90 ? "text-phosphor" : p >= 60 ? "text-warn" : "text-danger";
}

function Card({ label, hint, c }: { label: string; hint: string; c: CoverageCount }) {
  return (
    <div className="flex-1 min-w-[120px] border border-rim rounded px-3 py-2" title={hint}>
      <div className="font-mono text-[9px] uppercase tracking-widest text-dim">{label}</div>
      <div className={`font-mono text-xl font-bold ${tone(c.percent)}`}>{c.percent === null ? "—" : `${c.percent}%`}</div>
      <div className="font-mono text-[10px] text-ghost">{c.total ? `${c.hit} of ${c.total}` : "none in this design"}</div>
    </div>
  );
}

export default function CoveragePanel({ isOpen, onClose, result, designCode }: Props) {
  if (!isOpen) return null;
  const cov = result?.coverage ?? null;
  const assertions = result?.assertions ?? [];
  const lineHits = cov?.lines["design.v"] ?? {};
  const missedBranches = new Map<number, string[]>();
  for (const b of cov?.branches ?? []) {
    if (b.file === "design.v" && b.hits === 0) missedBranches.set(b.line, [...(missedBranches.get(b.line) ?? []), b.side]);
  }
  const quietSignals = (cov?.toggles ?? []).filter((t) => t.hits === 0).map((t) => t.signal);
  const source = designCode.split("\n");

  return (
    <div className="fixed inset-0 z-50 bg-void/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}
         role="dialog" aria-modal="true" aria-label="Coverage and assertions">
      <div className="w-full max-w-5xl h-[88vh] flex flex-col bg-pit border border-rim rounded" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-rim">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-bright uppercase tracking-widest">Coverage &amp; assertions</span>
            <span className="font-mono text-[9px] text-dim">Verilator · of design.v only</span>
          </div>
          <button className="font-mono text-[10px] text-bright hover:underline" onClick={onClose}>Close</button>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4">
          {!cov && !assertions.length ? (
            <p className="font-mono text-[11px] text-ghost">
              Run with the <span className="text-pale">Verilator</span> simulator to see coverage and assertion results.
            </p>
          ) : null}

          <section aria-label="Assertions" className="space-y-1.5">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim">Assertions</h3>
            {assertions.length === 0 ? (
              <p className="font-mono text-[11px] text-phosphor">No assertion failed.</p>
            ) : (
              <ul className="space-y-1">
                {assertions.map((a, i) => (
                  <li key={i} className={`font-mono text-[11px] ${a.severity === "error" ? "text-danger" : "text-warn"}`}>
                    t={a.time} · {a.file}:{a.line} · {a.scope}{a.message ? ` — ${a.message}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {cov && (
            <>
              <section aria-label="Coverage summary" className="flex flex-wrap gap-2">
                {KINDS.map(([k, label, hint]) => <Card key={k} label={label} hint={hint} c={cov.summary[k]} />)}
              </section>

              {(quietSignals.length > 0 || cov.covers.length > 0) && (
                <section className="grid sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  {quietSignals.length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-widest text-dim mb-1">Never toggled</h3>
                      <p className="text-warn break-words">{quietSignals.slice(0, 60).join(", ")}{quietSignals.length > 60 ? " …" : ""}</p>
                    </div>
                  )}
                  {cov.covers.length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-widest text-dim mb-1">Cover points</h3>
                      <ul>
                        {cov.covers.map((c, i) => (
                          <li key={i} className={c.hits ? "text-phosphor" : "text-danger"}>
                            line {c.line}: {c.hits ? `hit ${c.hits}×` : "never happened"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              <section aria-label="Annotated design">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim mb-1">design.v</h3>
                <div className="font-mono text-[12px] leading-[20px] border border-rim rounded overflow-auto bg-void">
                  {source.map((text, i) => {
                    const n = i + 1;
                    const hits = lineHits[String(n)];
                    const missed = missedBranches.get(n);
                    const bad = hits === 0 || !!missed;
                    return (
                      <div key={n} className={`flex ${bad ? "bg-danger/10" : hits ? "bg-phosphor/5" : ""}`}>
                        <span className="w-10 shrink-0 text-right pr-2 text-dim select-none">{n}</span>
                        <span className={`w-12 shrink-0 text-right pr-2 select-none ${hits === 0 ? "text-danger" : "text-ghost"}`}
                              title={hits === undefined ? "" : `ran ${hits}×`}>{hits === undefined ? "" : hits}</span>
                        <span className="whitespace-pre text-pale flex-1">{text || " "}</span>
                        {missed && <span className="shrink-0 px-2 text-danger text-[10px]">not taken: {missed.join(", ")}</span>}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
