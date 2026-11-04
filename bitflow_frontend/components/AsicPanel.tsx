"use client";
/**
 * components/AsicPanel.tsx — "ASIC": the design as a chip on SkyWater's 130 nm process.
 *
 * Modal opened from the Sandbox toolbar. POST /api/asic maps the design to Sky130 standard
 * cells (Yosys) and times it (OpenSTA): area, Fmax, setup and hold slack, the critical path
 * stage by stage, and power. With the testbench it also runs a gate-level simulation and takes
 * the power estimate's input activity from the RTL run.
 */

import { useCallback, useEffect, useState } from "react";

interface Stage { pin: string; cell: string; edge: "rise" | "fall"; delay: number; arrival: number; net: string | null }
interface Path {
  startpoint: string | null; startKind: string | null; endpoint: string | null; endKind: string | null;
  stages: Stage[]; arrival: number | null; slack: number | null; met: boolean;
}
interface SimRun { passed: boolean; stdout: string }
interface AsicResult {
  ok: boolean;
  error?: string;
  top?: string;
  parameters?: Record<string, number>;
  corner?: string;
  areaUm2?: number;
  cells?: number;
  registers?: number;
  byType?: Record<string, number>;
  timing?: {
    clock: string | null; periodNs: number; setup: Path | null; hold: Path | null;
    wnsNs: number | null; tnsNs: number | null; fmaxMhz: number | null; delayNs: number | null;
  };
  power?: {
    internal: number; switching: number; leakage: number; total: number; sequential: number; combinational: number;
    activitySource: "simulation" | "default"; activity: Record<string, { activity: number; duty: number }>; defaultActivity: number;
  };
  gls?: { error: string } | { rtl: SimRun; gates: SimRun; sameOutput: boolean } | null;
  netlist?: string | null;
}

interface Props {
  isOpen:         boolean;
  onClose:        () => void;
  designCode:     string;
  testbenchCode?: string;
  language?:      "verilog" | "vhdl";
}

function watts(w: number): string {
  if (w >= 1e-3) return `${(w * 1e3).toFixed(2)} mW`;
  if (w >= 1e-6) return `${(w * 1e6).toFixed(1)} µW`;
  return `${(w * 1e9).toFixed(1)} nW`;
}

function Card({ label, value, sub, tone = "text-bright", hint }: { label: string; value: string; sub?: string; tone?: string; hint?: string }) {
  return (
    <div className="flex-1 min-w-[130px] border border-rim rounded px-3 py-2" title={hint}>
      <div className="font-mono text-[9px] uppercase tracking-widest text-dim">{label}</div>
      <div className={`font-mono text-xl font-bold ${tone}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-ghost">{sub}</div>}
    </div>
  );
}

function PathTable({ path }: { path: Path }) {
  const longest = Math.max(...path.stages.map((s) => s.delay), 0.001);
  return (
    <div className="overflow-auto border border-rim rounded">
      <table className="w-full font-mono text-[11px]">
        <thead className="text-dim text-[9px] uppercase tracking-widest">
          <tr className="border-b border-rim">
            <th className="text-left px-2 py-1">Pin</th><th className="text-left px-2">Cell</th><th className="text-left px-2">Net</th>
            <th className="text-right px-2">Delay ns</th><th className="text-right px-2">Arrival ns</th><th className="w-1/4 px-2" />
          </tr>
        </thead>
        <tbody>
          {path.stages.map((s, i) => (
            <tr key={i} className="border-b border-rim/40 last:border-0">
              <td className="px-2 py-0.5 text-pale whitespace-nowrap">{s.pin} <span className="text-dim">{s.edge === "rise" ? "↑" : "↓"}</span></td>
              <td className="px-2 text-ghost whitespace-nowrap">{s.cell}</td>
              <td className="px-2 text-ghost whitespace-nowrap">{s.net ?? ""}</td>
              <td className="px-2 text-right text-pale">{s.delay.toFixed(3)}</td>
              <td className="px-2 text-right text-bright">{s.arrival.toFixed(3)}</td>
              <td className="px-2"><div className="h-1.5 rounded bg-phosphor/60" style={{ width: `${(100 * s.delay) / longest}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AsicPanel({ isOpen, onClose, designCode, testbenchCode = "", language = "verilog" }: Props) {
  const [periodNs, setPeriodNs] = useState(10);
  const [clock, setClock]       = useState("");
  const [useTb, setUseTb]       = useState(true);
  const [result, setResult]     = useState<AsicResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const hasTb = testbenchCode.trim().length > 0;

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/asic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designCode, testbenchCode: hasTb && useTb ? testbenchCode : null, periodNs, clock: clock.trim() || null, language }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(res.ok ? data : { ok: false, error: data.error ?? `Request failed (${res.status})` });
    } catch {
      setResult({ ok: false, error: "Network error." });
    } finally {
      setLoading(false);
    }
  }, [designCode, testbenchCode, hasTb, useTb, periodNs, clock, language]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isOpen && !result && !loading) run(); }, [isOpen]);

  if (!isOpen) return null;
  const t = result?.timing;
  const p = result?.power;
  const gls = result?.gls;

  const downloadNetlist = () => {
    if (!result?.netlist) return;
    const url = URL.createObjectURL(new Blob([result.netlist], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${result.top ?? "design"}_sky130.v` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-void/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}
         role="dialog" aria-modal="true" aria-label="ASIC area, timing and power">
      <div className="w-full max-w-5xl h-[88vh] flex flex-col bg-pit border border-rim rounded" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-rim">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-bright uppercase tracking-widest">ASIC · SkyWater 130 nm</span>
            <span className="font-mono text-[9px] text-dim">Yosys + OpenSTA · {result?.corner ?? "typical corner"}</span>
          </div>
          <button className="font-mono text-[10px] text-bright hover:underline" onClick={onClose}>Close</button>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-rim/60 font-mono text-[11px] text-ghost">
          <label className="flex items-center gap-1.5">Clock period
            <input type="number" min={0.5} max={1000} step={0.5} value={periodNs} onChange={(e) => setPeriodNs(Number(e.target.value) || 10)}
                   className="w-20 h-6 px-1 bg-void border border-rim rounded text-pale" /> ns
            <span className="text-dim">({(1000 / periodNs).toFixed(0)} MHz)</span>
          </label>
          <label className="flex items-center gap-1.5">Clock port
            <input value={clock} onChange={(e) => setClock(e.target.value)} placeholder="auto" maxLength={64}
                   className="w-24 h-6 px-1 bg-void border border-rim rounded text-pale" />
          </label>
          {hasTb && (
            <label className="flex items-center gap-1.5" title="Run tb.v on the RTL (its activity drives the power estimate) and on the gate netlist">
              <input type="checkbox" checked={useTb} onChange={(e) => setUseTb(e.target.checked)} /> Run my testbench on the gates
            </label>
          )}
          <button onClick={run} disabled={loading}
                  className="ml-auto h-7 px-3 rounded border border-phosphor/50 text-phosphor hover:bg-phosphor/10 disabled:opacity-50">
            {loading ? "Running…" : "Run"}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4">
          {loading && <p className="font-mono text-[11px] text-ghost">Mapping to Sky130 cells and timing the netlist…</p>}
          {result && !result.ok && <pre className="font-mono text-[11px] text-danger whitespace-pre-wrap">{result.error}</pre>}

          {result?.ok && t && p && (
            <>
              <section aria-label="Summary" className="flex flex-wrap gap-2">
                <Card label="Area" value={`${result.areaUm2?.toLocaleString()} µm²`} sub={`${result.cells} cells · ${result.registers} registers`}
                      hint="Total standard-cell area, before placement (a real block also needs routing space)" />
                {t.clock ? (
                  <Card label="Fmax" value={t.fmaxMhz ? `${t.fmaxMhz} MHz` : "—"} sub={`clock ${t.clock}`}
                        hint="The fastest clock the slowest register-to-register path allows" />
                ) : (
                  <Card label="Delay" value={t.delayNs !== null ? `${t.delayNs.toFixed(3)} ns` : "—"} sub="input to output, no clock" />
                )}
                <Card label="Setup slack" value={t.setup?.slack !== null && t.setup?.slack !== undefined ? `${t.setup.slack.toFixed(3)} ns` : "—"}
                      sub={t.setup ? (t.setup.met ? `met at ${t.periodNs} ns` : `violated · TNS ${t.tnsNs ?? 0} ns`) : "no paths"}
                      tone={t.setup && !t.setup.met ? "text-danger" : "text-phosphor"}
                      hint="Time to spare before the clock edge on the slowest path; negative means the clock is too fast" />
                <Card label="Hold slack" value={t.hold?.slack !== null && t.hold?.slack !== undefined ? `${t.hold.slack.toFixed(3)} ns` : "—"}
                      sub={t.hold ? (t.hold.met ? "met" : "violated") : "no paths"} tone={t.hold && !t.hold.met ? "text-danger" : "text-phosphor"}
                      hint="Margin on the fastest path, so data doesn't change too soon after the clock edge" />
                <Card label="Power" value={watts(p.total)} sub={`${watts(p.internal)} internal · ${watts(p.switching)} switching · ${watts(p.leakage)} leakage`}
                      hint={`At ${(1000 / t.periodNs).toFixed(0)} MHz`} />
              </section>

              <p className="font-mono text-[10px] text-dim">
                Estimates before layout: typical corner (25 °C, 1.8 V), ideal clock and no wire delay. After place and route a chip is slower.
                {result.parameters && Object.keys(result.parameters).length > 0 && (
                  <> Built as your testbench configures {result.top}: {Object.entries(result.parameters).map(([k, v]) => `${k} = ${v}`).join(", ")}.</>
                )}
              </p>

              {t.setup && t.setup.stages.length > 0 && (
                <section aria-label="Critical path" className="space-y-1.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim"
                      title={`From ${t.setup.startpoint}: ${t.setup.startKind}\nTo ${t.setup.endpoint}: ${t.setup.endKind}`}>
                    Critical path · {t.setup.startpoint} → {t.setup.endpoint} · {t.setup.arrival?.toFixed(3)} ns
                  </h3>
                  <PathTable path={t.setup} />
                  <p className="font-mono text-[10px] text-ghost">
                    The longest stages are where to look: shorten the logic between these registers, or add a pipeline register in the middle.
                  </p>
                </section>
              )}

              {gls && (
                <section aria-label="Gate-level simulation" className="space-y-1.5 font-mono text-[11px]">
                  <h3 className="text-[10px] uppercase tracking-widest text-dim">Gate-level simulation (tb.v on the Sky130 netlist)</h3>
                  {"error" in gls ? (
                    <pre className="text-danger whitespace-pre-wrap">{gls.error}</pre>
                  ) : (
                    <>
                      <p>
                        RTL <span className={gls.rtl.passed ? "text-phosphor" : "text-danger"}>{gls.rtl.passed ? "passed" : "failed"}</span>
                        {" · "}gates <span className={gls.gates.passed ? "text-phosphor" : "text-danger"}>{gls.gates.passed ? "passed" : "failed"}</span>
                        {" · "}{gls.sameOutput
                          ? <span className="text-phosphor">same output: the gates behave like your RTL</span>
                          : <span className="text-warn">the output differs</span>}
                      </p>
                      {!gls.sameOutput && (
                        <>
                          <ul className="text-ghost list-disc pl-4 space-y-0.5">
                            <li>The testbench changes inputs exactly at the clock edge (<code>@(posedge clk) en = 1;</code>): a race that RTL and gates resolve
                              differently. Change them just after the edge (<code>@(posedge clk); #1;</code>) or on the falling edge.</li>
                            <li>An initial value (<code>reg q = 0</code>) or <code>initial</code> block: silicon has none, so add a reset.</li>
                            <li>A register that is never reset: in gates it starts at X.</li>
                            <li><code>casez</code> or comparisons with <code>x</code>, which simulate differently from the gates they become.</li>
                          </ul>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {(["rtl", "gates"] as const).map((k) => (
                              <div key={k}>
                                <div className="text-[9px] uppercase tracking-widest text-dim">{k === "rtl" ? "RTL" : "Gates"}</div>
                                <pre className="max-h-48 overflow-auto bg-void border border-rim rounded p-2 text-pale whitespace-pre-wrap">{gls[k].stdout}</pre>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </section>
              )}

              <section className="grid sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-dim mb-1">Switching activity</h3>
                  {p.activitySource === "simulation" ? (
                    <ul className="text-ghost">
                      <li className="text-pale mb-0.5">From your testbench&apos;s run (transitions per clock):</li>
                      {Object.entries(p.activity).map(([n, a]) => <li key={n}>{n}: {a.activity} · high {Math.round(a.duty * 100)}% of the time</li>)}
                    </ul>
                  ) : (
                    <p className="text-ghost">
                      Every input assumed to switch {p.defaultActivity} times a clock. Run your testbench on the gates for activity from a real run
                      (its <code>$dumpvars</code> output).
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-dim mb-1">Cells used</h3>
                  <ul className="text-ghost columns-2">
                    {Object.entries(result.byType ?? {}).slice(0, 16).map(([c, n]) => <li key={c}>{n}× {c}</li>)}
                  </ul>
                  {result.netlist && (
                    <button onClick={downloadNetlist} className="mt-2 text-bright hover:underline">Download the gate netlist (.v)</button>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
