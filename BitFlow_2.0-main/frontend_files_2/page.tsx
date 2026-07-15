/**
 * app/page.tsx — Main IDE page
 *
 * This is the only page in the app. It composes all components into
 * a fixed-height split-screen layout:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  Toolbar (48px)                         │
 *   ├────────────────────┬────────────────────┤
 *   │                    │                    │
 *   │   design.v editor  │   tb.v editor      │
 *   │   (Monaco)         │   (Monaco)         │
 *   │                    │                    │
 *   ├────────────────────┴────────────────────┤
 *   │  Terminal output (240px)                │
 *   ├─────────────────────────────────────────┤  ← appears after simulation
 *   │  Waveform panel (220px open / 32px      │    with VCD data
 *   │  collapsed) — SVG timing diagram        │
 *   └─────────────────────────────────────────┘
 *
 * Monaco Editor is loaded with `dynamic(..., { ssr: false })` because it
 * uses Web Workers and browser APIs unavailable during server rendering.
 *
 * All simulation state lives in useSimulation() — this component just
 * wires props between the hook and the child components.
 */

"use client";

import { useMemo }                   from "react";
import dynamic                        from "next/dynamic";
import Toolbar                        from "@/components/Toolbar";
import Terminal                       from "@/components/Terminal";
import WaveformPanel                  from "@/components/WaveformPanel";
import { useSimulation }              from "@/hooks/useSimulation";
import { parseVcd }                   from "@/lib/vcd-parser";
import type { ParsedVcd }             from "@/lib/vcd-parser";

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic import — excludes Monaco from the server bundle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `ssr: false` prevents Next.js from trying to render Monaco on the server.
 * Monaco needs `window`, `document`, and Web Workers — none of which exist
 * in a Node.js server environment.
 *
 * The `loading` prop shows the skeleton while the JS chunk downloads.
 */
const Editor = dynamic(() => import("@/components/Editor"), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full bg-pit animate-pulse" />
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Editor panel label (tab-style header above each editor)
// ─────────────────────────────────────────────────────────────────────────────

function EditorTab({ filename, sublabel }: { filename: string; sublabel: string }) {
  return (
    <div className="flex items-center justify-between px-4 h-tabbar shrink-0 bg-surface border-b border-rim">
      <div className="flex items-center gap-2">
        {/* File icon */}
        <svg viewBox="0 0 10 12" className="w-2.5 h-3 text-dim" fill="currentColor">
          <path d="M1 0h6l3 3v9H1V0zm6 0v3h3" fillRule="evenodd" />
        </svg>
        <span className="font-mono text-[12px] text-pale">{filename}</span>
      </div>
      <span className="font-mono text-[10px] text-dim tracking-wider">{sublabel}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Page() {
  const {
    designCode,
    testbenchCode,
    setDesignCode,
    setTestbenchCode,
    runState,
    isRunning,
    result,
    errorMsg,
    simulate,
    clearResult,
  } = useSimulation();

  /**
   * Decode and parse the VCD waveform whenever the simulation result changes.
   *
   * Dependency: result?.waveform.vcd_base64
   *   — null/undefined  → parsedVcd is null (WaveformPanel won't render)
   *   — valid base64    → decoded with atob(), parsed with parseVcd()
   *
   * useMemo avoids re-parsing on every render (e.g. when the user types in
   * an editor) since parsing can be O(n) for large VCD files.
   *
   * Errors are caught and logged so a malformed VCD never crashes the page.
   */
  const parsedVcd = useMemo<ParsedVcd | null>(() => {
    const b64 = result?.waveform.vcd_base64;
    if (!b64) return null;
    try {
      return parseVcd(atob(b64));
    } catch (e) {
      console.warn("[BitFlow] VCD parse failed:", e);
      return null;
    }
  }, [result?.waveform.vcd_base64]);

  return (
    /*
     * Root container: full viewport height, flex column.
     * overflow-hidden prevents any child from causing page-level scroll.
     * The scanlines class adds a subtle CRT texture via globals.css.
     */
    <div className="flex flex-col h-screen overflow-hidden bg-void scanlines">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <Toolbar
        runState={runState}
        result={result}
        onRun={simulate}
      />

      {/*
       * ── Editor area: grows to fill remaining height above the terminal ──
       * flex-row on md+, stacked on mobile.
       * Each editor panel is flex-1 so they share the space equally.
       */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

        {/* ── Left panel: design.v ───────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 border-b md:border-b-0 md:border-r border-rim">
          <EditorTab filename="design.v" sublabel="DUT" />
          <div className="flex-1 min-h-0">
            <Editor
              value={designCode}
              onChange={setDesignCode}
              language="verilog"
              readOnly={isRunning}
            />
          </div>
        </div>

        {/* ── Right panel: tb.v ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <EditorTab filename="tb.v" sublabel="Testbench" />
          <div className="flex-1 min-h-0">
            <Editor
              value={testbenchCode}
              onChange={setTestbenchCode}
              language="verilog"
              readOnly={isRunning}
            />
          </div>
        </div>
      </div>

      {/* ── Terminal panel ─────────────────────────────────────────────────── */}
      <div className="h-terminal shrink-0">
        <Terminal
          runState={runState}
          result={result}
          errorMsg={errorMsg}
          onClear={clearResult}
        />
      </div>

      {/*
       * ── Waveform panel ─────────────────────────────────────────────────────
       *
       * Rendered only when:
       *   1. A simulation has completed (result is non-null), AND
       *   2. The VCD was successfully decoded and parsed (parsedVcd is non-null)
       *
       * The panel manages its own open/collapsed state internally.
       * When collapsed it shrinks to its 32px header, so the editors
       * reclaim the space. When open it occupies 220px (set in WaveformPanel).
       *
       * `shrink-0` here ensures the flex parent (the outer column) never
       * squishes this panel — the editors above absorb the remaining space.
       */}
      {parsedVcd && result && (
        <div className="shrink-0">
          <WaveformPanel parsedVcd={parsedVcd} result={result} />
        </div>
      )}
    </div>
  );
}
