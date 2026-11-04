/**
 * lib/backend.ts — Server-side client for the FastAPI simulation backend.
 * Used by the /api/simulate proxy and by server-side grading. Never import
 * this from client components: it signs requests with JWT_SECRET.
 */

import { generateBackendJwt } from "@/lib/jwt";

export interface SimulateBody {
  design_v:    string;
  testbench_v: string;
  timeout?:    number;
  files?:      Record<string, string>;
  design_language?:    "verilog" | "vhdl";
  testbench_language?: "verilog" | "vhdl" | "python";
  simulator?:          "icarus" | "verilator";
}

export type FormalMode = "bmc" | "prove" | "cover";

// BACKEND_URL is read at runtime; NEXT_PUBLIC_* values are inlined at build time.
export function backendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL is not set");
  }
  return "http://127.0.0.1:8000";
}

/**
 * Every simulator instance to spread requests over. BACKEND_URLS (comma-separated) lists
 * several identical deployments, e.g. two free Render services; otherwise it is just
 * backendUrl(). The API is stateless, so any instance can serve any request.
 */
export function backendUrls(): string[] {
  const urls = (process.env.BACKEND_URLS ?? "")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return urls.length ? urls : [backendUrl().replace(/\/+$/, "")];
}

// 502/503 come from the host while an instance deploys or fails to wake: another instance can
// take the request. A 504 or any other answer is final; a 504 may be a long simulation, and
// running it again elsewhere would double the work.
const TRY_NEXT = new Set([502, 503]);

/**
 * fetch(`${url}${path}`) on the instances in turn, starting at a random one: move on when the
 * request throws or answers 502/503. The last instance's answer (or error) is final.
 */
export async function fetchWithFailover(urls: string[], path: string, init?: RequestInit): Promise<Response> {
  if (!urls.length) throw new Error("No backend URL");
  const start = Math.floor(Math.random() * urls.length);
  for (let i = 0; ; i++) {
    const isLast = i === urls.length - 1;
    try {
      const res = await fetch(`${urls[(start + i) % urls.length]}${path}`, init);
      if (isLast || !TRY_NEXT.has(res.status)) return res;
    } catch (err) {
      if (isLast) throw err;
    }
  }
}

/** POST /simulate on the backend. Returns the HTTP status and parsed body. */
export function simulateOnBackend(body: SimulateBody): Promise<{ status: number; data: any }> {
  return postToBackend("/simulate", body);
}

/** POST /metrics: gate count, flip-flop bits and logic depth of a design. */
export function metricsOnBackend(design_v: string): Promise<{ status: number; data: any }> {
  return postToBackend("/metrics", { design_v });
}

/** POST /fpga: LUT / flip-flop / block RAM / DSP estimate for an iCE40 or Xilinx 7-series part. */
export function fpgaOnBackend(design_v: string, family: "ice40" | "xc7"): Promise<{ status: number; data: any }> {
  return postToBackend("/fpga", { design_v, family });
}

/** POST /board: gate-level netlist for the virtual board (lib/gate-sim.ts). */
export function boardOnBackend(design_v: string): Promise<{ status: number; data: any }> {
  return postToBackend("/board", { design_v });
}

/** POST /equivalence: shortest input sequence (from reset) where two designs differ. */
export function equivalenceOnBackend(gold_v: string, gate_v: string, max_cycles = 16): Promise<{ status: number; data: any }> {
  return postToBackend("/equivalence", { gold_v, gate_v, max_cycles });
}

/** POST /vhdl: VHDL design -> Verilog netlist (GHDL), for the Verilog-only grading and synthesis tools. */
export function vhdlOnBackend(design_vhdl: string): Promise<{ status: number; data: any }> {
  return postToBackend("/vhdl", { design_vhdl });
}

/** Verilog source of a design in either language, or the conversion error. */
export async function designAsVerilog(code: string, language: string | undefined): Promise<{ verilog: string } | { error: string }> {
  if (language !== "vhdl") return { verilog: code };
  const { status, data } = await vhdlOnBackend(code);
  if (status !== 200) return { error: data?.detail || data?.error || "VHDL conversion failed." };
  return data?.ok ? { verilog: data.verilog } : { error: `VHDL error:\n${data?.error ?? "conversion failed"}` };
}

/** POST /formal: bounded check (bmc), induction proof (prove) or cover search of assert/assume/cover. */
export function formalOnBackend(design_v: string, harness_v: string | null, mode: FormalMode, depth = 20): Promise<{ status: number; data: any }> {
  return postToBackend("/formal", { design_v, harness_v, mode, depth });
}

/** POST /synthesize (Yosys) on the backend. */
export function synthesizeOnBackend(design_v: string): Promise<{ status: number; data: any }> {
  return postToBackend("/synthesize", { design_v });
}

/** POST /asic: Sky130 area, static timing and power; with a testbench, gate-level simulation too. */
export function asicOnBackend(body: { design_v: string; testbench_v: string | null; period_ns: number; clock: string | null }): Promise<{ status: number; data: any }> {
  return postToBackend("/asic", body);
}

/** POST /style/lint or /style/format (Verible) on the backend. */
export function styleOnBackend(action: "lint" | "format", body: unknown): Promise<{ status: number; data: any }> {
  return postToBackend(`/style/${action}`, body);
}

async function postToBackend(path: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetchWithFailover(backendUrls(), path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${generateBackendJwt()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.trim() || res.statusText || "Backend error" };
  }
  return { status: res.status, data };
}
