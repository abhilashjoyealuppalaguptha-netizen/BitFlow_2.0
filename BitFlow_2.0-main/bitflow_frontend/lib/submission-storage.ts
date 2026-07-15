/**
 * lib/submission-storage.ts — Last-submitted-code persistence
 *
 * DELIBERATELY SEPARATE from workspace persistence (bitflow_design_v / bitflow_testbench_v).
 *
 * Workspace persistence:  protects against accidental refresh/crash.
 *                         Auto-saves on every keystroke (debounced).
 *                         Always silently overwritten.
 *
 * Submission persistence: records the last intentionally SIMULATED solution.
 *                         Only written on a successful simulation run.
 *                         User can restore it explicitly.
 *
 * localStorage keys:
 *   bitflow_last_submission  — JSON blob (see SubmissionRecord)
 *
 * SSR safety: all localStorage calls are guarded with typeof window checks.
 * This file is imported client-side only.
 */

export interface SubmissionRecord {
  designCode:    string;
  testbenchCode: string;
  timestamp:     number;          // Unix ms
  durationMs:    number;          // simulation wall-clock time
  workspaceId:   string;          // for log correlation
  status:        string;          // "success" etc.
  /** Optional waveform metadata — NOT the full VCD blob (too large for localStorage) */
  waveformSize?: number;
}

const STORAGE_KEY = "bitflow_last_submission";

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the current simulation as the last submission.
 * Called by page.tsx only on result.status === "success".
 */
export function saveSubmission(record: SubmissionRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    // localStorage quota exceeded — non-fatal
    console.warn("[BitFlow] Could not save submission:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the last submission record.
 * Returns null if nothing is stored or the data is corrupt.
 */
export function loadSubmission(): SubmissionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SubmissionRecord>;
    // Basic shape validation
    if (typeof parsed.designCode !== "string" || typeof parsed.timestamp !== "number") {
      return null;
    }
    return parsed as SubmissionRecord;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable "X min ago" / "X hr ago" from a Unix timestamp.
 * Returns empty string if timestamp is falsy.
 */
export function submissionAge(timestamp: number): string {
  if (!timestamp) return "";
  const diffMs  = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr} hr ago`;
  return `${Math.floor(diffHr / 24)} days ago`;
}