/**
 * lib/progress-storage.ts — Frontend progress persistence
 *
 * Stores the user's problem-solving progress in localStorage.
 * Key: "bitflow_progress"
 *
 * DATABASE MIGRATION NOTE:
 *   When a database is added, only the load/save functions change.
 *   The ProgressRecord shape, XP logic, and hook interface all stay identical.
 *   This makes migration a 2-function change, not a refactor.
 *
 * IMPORTANT: All functions are SSR-safe — they check for window before
 * accessing localStorage. This prevents hydration errors in Next.js.
 */

import type {
  ProgressRecord,
  ProblemProgress,
  SubmissionResult,
} from "@/lib/problem-types";

const STORAGE_KEY = "bitflow_progress";

// ─────────────────────────────────────────────────────────────────────────────
// Default empty record
// ─────────────────────────────────────────────────────────────────────────────

export function createEmptyProgress(): ProgressRecord {
  return {
    totalXp:         0,
    problems:        {},
    unlockedModules: ["mod_logic_gates", "mod_arithmetic"], // starter modules free
    lastUpdatedAt:   Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence layer
// ─────────────────────────────────────────────────────────────────────────────

/** Load progress from localStorage. Returns empty record if nothing saved. */
export function loadProgress(): ProgressRecord {
  if (typeof window === "undefined") return createEmptyProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();
    return JSON.parse(raw) as ProgressRecord;
  } catch {
    return createEmptyProgress();
  }
}

/** Save progress to localStorage. Silently fails if storage unavailable. */
export function saveProgress(record: ProgressRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...record,
      lastUpdatedAt: Date.now(),
    }));
  } catch {
    // Storage quota exceeded or unavailable — non-fatal
  }
}

/** Reset all progress. Used for "start over" button (future). */
export function clearProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Business logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a successful submission for a problem.
 * Handles:
 *   - First solve XP award (no duplicate XP)
 *   - Module unlock side effects
 *   - Attempt counting
 *
 * Returns the updated record.
 */
export function recordSolve(
  current:    ProgressRecord,
  result:     SubmissionResult,
  moduleId:   string,
): ProgressRecord {
  const existing = current.problems[result.problemId];
  const alreadySolved = existing?.solved ?? false;

  // XP is awarded only on first solve
  const xpEarned = alreadySolved ? 0 : result.xpEarned;

  const updatedProblem: ProblemProgress = {
    problemId:     result.problemId,
    solved:        true,
    firstSolvedAt: alreadySolved ? (existing?.firstSolvedAt ?? Date.now()) : Date.now(),
    attempts:      (existing?.attempts ?? 0) + 1,
    bestSubmissionId: result.id,
    hintsUnlocked: existing?.hintsUnlocked ?? [],
    xpEarned:      existing?.xpEarned ?? 0 + xpEarned,
  };

  const updated: ProgressRecord = {
    ...current,
    totalXp: current.totalXp + xpEarned,
    problems: {
      ...current.problems,
      [result.problemId]: updatedProblem,
    },
  };

  // Unlock the module when it's first completed
  if (!updated.unlockedModules.includes(moduleId)) {
    updated.unlockedModules = [...updated.unlockedModules, moduleId];
  }

  return updated;
}

/**
 * Record a failed attempt (increments attempt counter, no XP change).
 */
export function recordAttempt(
  current:   ProgressRecord,
  problemId: string,
): ProgressRecord {
  const existing = current.problems[problemId];
  return {
    ...current,
    problems: {
      ...current.problems,
      [problemId]: {
        problemId,
        solved:        existing?.solved         ?? false,
        firstSolvedAt: existing?.firstSolvedAt  ?? null,
        attempts:      (existing?.attempts ?? 0) + 1,
        hintsUnlocked: existing?.hintsUnlocked  ?? [],
        xpEarned:      existing?.xpEarned       ?? 0,
      },
    },
  };
}

/**
 * Record a hint unlock for a problem.
 */
export function recordHintUnlock(
  current:   ProgressRecord,
  problemId: string,
  hintTier:  1 | 2 | 3,
): ProgressRecord {
  const existing = current.problems[problemId];
  const alreadyUnlocked = existing?.hintsUnlocked ?? [];
  if (alreadyUnlocked.includes(hintTier)) return current;

  return {
    ...current,
    problems: {
      ...current.problems,
      [problemId]: {
        problemId,
        solved:        existing?.solved        ?? false,
        firstSolvedAt: existing?.firstSolvedAt ?? null,
        attempts:      existing?.attempts      ?? 0,
        hintsUnlocked: [...alreadyUnlocked, hintTier],
        xpEarned:      existing?.xpEarned      ?? 0,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Total solved problems count */
export function totalSolved(record: ProgressRecord): number {
  return Object.values(record.problems).filter((p) => p.solved).length;
}

/** Check if a specific problem is solved */
export function isSolved(record: ProgressRecord, problemId: string): boolean {
  return record.problems[problemId]?.solved ?? false;
}

/** Format XP as a readable string e.g. "1,250 XP" */
export function formatXp(xp: number): string {
  return `${xp.toLocaleString()} XP`;
}