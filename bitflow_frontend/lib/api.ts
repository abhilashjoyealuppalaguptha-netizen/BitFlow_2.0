/**
 * lib/api.ts — FastAPI backend client
 *
 * All network calls go through this module. Components never import Axios
 * directly — they call the typed functions here.
 *
 * Why centralise this?
 *   - One place to change the base URL (env var → staging → production).
 *   - Typed request/response — callers get autocomplete, not `any`.
 *   - Error normalisation: Axios errors are caught here and re-thrown
 *     as plain Error objects with human-readable messages.
 */

import axios, { AxiosError } from "axios";
import type { SimulateRequest, SimulateResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base URL for the FastAPI backend.
 *
 * In development this talks directly to the uvicorn process.
 * In production, set NEXT_PUBLIC_API_URL to your deployed backend URL,
 * or rely on the /api rewrite in next.config.js to proxy requests.
 *
 * NEXT_PUBLIC_ prefix is required by Next.js for variables that must be
 * visible in the browser bundle.
 */
const BASE_URL = "/api/sandbox-proxy";

const apiClient = axios.create({
  baseURL: BASE_URL,
  // How long (ms) to wait for the HTTP response headers.
  // Simulation itself can take up to 30 s; add buffer for Docker startup.
  timeout: 90_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Error normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an Axios error into a plain Error with a useful message.
 * This is the only function that knows what the backend's error envelope
 * looks like ({ error: string, detail: string }).
 */
function normaliseError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ error?: string; detail?: string }>;

    const effectiveBackendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://bitflow-backend-uyji.onrender.com"
        : "http://127.0.0.1:8000");

    // Network-level failure (backend not running, CORS, timeout)
    if (!axErr.response) {
      return new Error(
        `Cannot reach the backend at ${effectiveBackendUrl}. ` +
        "Is the FastAPI server running? (uvicorn api.main:app --reload)"
      );
    }

    // Backend returned a structured error envelope
    const data = axErr.response.data;
    if (data?.detail) return new Error(data.detail);
    if (data?.error)  return new Error(data.error);

    // 429 / 502 / 503 / 504 Gateway & Rate limit errors
    if (
      axErr.response.status === 429 ||
      axErr.response.status === 502 ||
      axErr.response.status === 503 ||
      axErr.response.status === 504
    ) {
      return new Error(
        "Backend server is rate-limited or cold starting (Render Free Limit). Retrying automatically..."
      );
    }

    // Fall back to HTTP status text
    return new Error(
      `Server error ${axErr.response.status}: ${axErr.response.statusText || "Bad Gateway"}`
    );
  }

  // Not an Axios error — re-wrap as Error
  return err instanceof Error ? err : new Error(String(err));
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /simulate
 *
 * Submit Verilog source strings and run the sandbox simulation.
 * Returns the full SimulateResponse on success.
 * Throws a normalised Error on network / infrastructure failure.
 *
 * Note: compile errors and runtime errors are NOT thrown — they come back
 * inside the response body with status !== "success". Only infrastructure
 * failures (backend down, image not found, timeout waiting for HTTP) throw.
 *
 * @param payload - design_v, testbench_v, optional timeout override
 */
export async function runSimulation(
  payload: SimulateRequest,
  retries = 6
): Promise<SimulateResponse> {
  try {
    const { data } = await apiClient.post<SimulateResponse>(
      "/simulate",
      payload
    );
    return data;
  } catch (err) {
    // If connection dropped, socket timed out, cold starting, or rate limited (429/502/503/504), auto-retry
    const isRetryable =
      axios.isAxiosError(err) &&
      (!err.response || (err.response.status && [429, 502, 503, 504].includes(err.response.status)));

    if (isRetryable && retries > 0) {
      const delayMs = Math.min((7 - retries) * 3000, 10000); // 3s, 6s, 9s, 10s, 10s, 10s backoff
      console.log(`[BitFlow] Server connection/response issue (Render cold start). Auto-retrying in ${delayMs / 1000}s (${retries} attempts left)...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return runSimulation(payload, retries - 1);
    }
    throw normaliseError(err);
  }
}

/**
 * GET /health
 *
 * Quick liveness check — useful for showing a "backend offline" banner
 * before the user hits Run.
 * Returns true if the backend responds, false otherwise (never throws).
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await apiClient.get("/health", { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VCD download helper (runs entirely in the browser, no API call needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decode a base64 VCD string and trigger a browser file download.
 *
 * The VCD content comes back from the API as a base64 string embedded in
 * the JSON response. This helper converts it to a Blob and creates a
 * temporary <a> element to trigger the browser's save dialog.
 *
 * @param vcdBase64 - The waveform.vcd_base64 field from SimulateResponse
 * @param filename  - Downloaded filename (default: wave.vcd)
 */
export function downloadVcd(
  vcdBase64: string,
  filename = "wave.vcd"
): void {
  // atob() decodes base64 → binary string; then convert to Uint8Array
  const binary = atob(vcdBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Create an object URL from a Blob and click an invisible <a> tag
  const blob = new Blob([bytes], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = filename;
  link.click();

  // Clean up the object URL — browsers garbage-collect after a short delay
  // but releasing explicitly is best practice
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
