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

/** One simulator instance and its share of the traffic. */
export interface PoolEntry { url: string; weight: number }

/**
 * Every simulator instance to spread requests over, with weights. BACKEND_URLS
 * (comma-separated) lists several identical deployments; an entry may end in `|weight`
 * (default 1) so a stronger host gets a bigger share, e.g.
 *   https://sim.example.com|8,https://free-1.onrender.com,https://free-2.onrender.com
 * Without BACKEND_URLS it is just backendUrl(). The API is stateless, so any instance can
 * serve any request.
 */
export function backendPool(): PoolEntry[] {
  const pool = (process.env.BACKEND_URLS ?? "")
    .split(",")
    .map((entry) => {
      const [url, w] = entry.trim().split("|");
      const weight = Number(w);
      return { url: (url ?? "").trim().replace(/\/+$/, ""), weight: Number.isFinite(weight) && weight > 0 ? weight : 1 };
    })
    .filter((e) => e.url);
  return pool.length ? pool : [{ url: backendUrl().replace(/\/+$/, ""), weight: 1 }];
}

/** The instance URLs alone (health checks wake all of them, whatever their weight). */
export function backendUrls(): string[] {
  return backendPool().map((e) => e.url);
}

// 502/503 come from the host while an instance deploys or fails to wake: another instance can
// take the request. A 504 or any other answer is final; a 504 may be a long simulation, and
// running it again elsewhere would double the work.
const TRY_NEXT = new Set([502, 503]);

/** Instances in the order to try them: weighted random draws without replacement. */
function tryOrder(entries: PoolEntry[]): string[] {
  const left = [...entries];
  const order: string[] = [];
  while (left.length) {
    let r = Math.random() * left.reduce((sum, e) => sum + e.weight, 0);
    let i = 0;
    while (i < left.length - 1 && (r -= left[i].weight) >= 0) i++;
    order.push(left.splice(i, 1)[0].url);
  }
  return order;
}

/** Strongest instance first (ties in random order): for jobs that are slow on a weak host. */
function strongestOrder(entries: PoolEntry[]): string[] {
  return entries
    .map((e) => ({ e, tie: Math.random() }))
    .sort((a, b) => b.e.weight - a.e.weight || a.tie - b.tie)
    .map(({ e }) => e.url);
}

/**
 * Heavy jobs (Verilator builds, VHDL and Python testbenches, formal checks, FPGA place-and-route,
 * equivalence, ASIC) take many seconds even on a good server and tens on a 0.1-vCPU one, so they go
 * to the strongest instance first. Everything else is light: Icarus runs, style checks, quick Yosys jobs.
 */
export function jobClass(path: string, body: unknown): "light" | "heavy" {
  if (["/fpga", "/equivalence", "/formal", "/asic"].includes(path)) return "heavy";
  if (path === "/simulate") {
    const b = (body ?? {}) as Partial<SimulateBody>;
    const plain = (!b.simulator || b.simulator === "icarus") && (!b.design_language || b.design_language === "verilog")
      && (!b.testbench_language || b.testbench_language === "verilog");
    return plain ? "light" : "heavy";
  }
  return "light";
}

export interface FailoverOptions {
  /** Try the strongest instance first instead of drawing by weight. */
  strongestFirst?: boolean;
  /**
   * Hedge: if an instance hasn't answered after this many ms, also ask the next one and take the
   * first good answer. For light jobs only: a sleeping free instance can hold a request for a minute,
   * while a light job normally answers in under a second. 0 or unset = no hedging.
   */
  hedgeMs?: number;
}

/**
 * Race the instances in `urls` order: start the first; start the next when one throws or answers
 * 502/503, or when `hedgeMs` passes without an answer; the first non-502/503 answer wins and the
 * others are cancelled. If every instance fails, the last failure (response or error) is final.
 */
function hedgedFetch(urls: string[], path: string, init: RequestInit | undefined, hedgeMs: number): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const controllers: AbortController[] = [];
    let launched = 0, inflight = 0, done = false;
    let lastRes: Response | undefined, lastErr: unknown;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const allFailed = () => { done = true; clearTimeout(timer); lastRes ? resolve(lastRes) : reject(lastErr); };
    const win = (idx: number, res: Response) => {
      done = true; clearTimeout(timer);
      controllers.forEach((c, i) => { if (i !== idx) c.abort(); });   // never abort the winner: its body is still to be read
      resolve(res);
    };
    const launch = (): void => {
      if (done || launched >= urls.length) return;
      const idx = launched++;
      const ac = new AbortController();
      controllers[idx] = ac;
      inflight++;
      clearTimeout(timer);
      if (launched < urls.length) timer = setTimeout(launch, hedgeMs);
      fetch(`${urls[idx]}${path}`, { ...init, signal: ac.signal }).then(
        (res) => {
          inflight--;
          if (done) return;
          if (!TRY_NEXT.has(res.status)) return win(idx, res);
          lastRes = res;
          if (launched < urls.length) launch(); else if (inflight === 0) allFailed();
        },
        (err) => {
          inflight--;
          if (done) return;
          lastErr = err;
          if (launched < urls.length) launch(); else if (inflight === 0) allFailed();
        },
      );
    };
    launch();
  });
}

/**
 * fetch(`${url}${path}`) on the instances in turn, the first chosen at random by weight (a
 * plain URL has weight 1) or, with `strongestFirst`, the strongest: move on when the request throws or
 * answers 502/503. The last instance's answer (or error) is final. With `hedgeMs` the next instance is
 * also asked when the current one is slow (see FailoverOptions).
 */
export async function fetchWithFailover(
  pool: (string | PoolEntry)[], path: string, init?: RequestInit, opts: FailoverOptions = {},
): Promise<Response> {
  if (!pool.length) throw new Error("No backend URL");
  const entries = pool.map((e) => (typeof e === "string" ? { url: e, weight: 1 } : e));
  const urls = opts.strongestFirst ? strongestOrder(entries) : tryOrder(entries);
  if (opts.hedgeMs && opts.hedgeMs > 0 && urls.length > 1) return hedgedFetch(urls, path, init, opts.hedgeMs);
  for (let i = 0; ; i++) {
    const isLast = i === urls.length - 1;
    try {
      const res = await fetch(`${urls[i]}${path}`, init);
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
  const heavy = jobClass(path, body) === "heavy";
  const hedgeMs = Number(process.env.BACKEND_HEDGE_MS ?? 10_000);   // 0 turns hedging off
  const res = await fetchWithFailover(backendPool(), path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${generateBackendJwt()}`,
    },
    body: JSON.stringify(body),
  }, heavy ? { strongestFirst: true } : { hedgeMs: Number.isFinite(hedgeMs) ? hedgeMs : 10_000 });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.trim() || res.statusText || "Backend error" };
  }
  return { status: res.status, data };
}
