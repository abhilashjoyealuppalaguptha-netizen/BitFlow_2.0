"use client";
/**
 * hooks/useArenaProblem.ts — Arena simulation + submission engine
 *
 * Parallel to hooks/useProblem.ts but operates on ArenaProblem objects.
 * Reuses the same backend /simulate endpoint via lib/api.ts runSimulation().
 *
 * Key differences from useProblem:
 *   - No hiddenTestbench string fallback (Arena always uses hiddenTestcases[])
 *   - No moduleId / learning-path coupling
 *   - Verdict comparison uses the same compareStdout sentinel logic
 *   - ✅ NOW: Saves all submissions to Prisma via saveSubmission()
 */

import { useState, useCallback } from "react";
import type { ArenaProblem, ArenaSubmissionResult, ArenaVerdictItem } from "@/lib/arena/types";
import type { SimulateResponse } from "@/lib/types";
import { runSimulation } from "@/lib/api";
import { saveSubmission } from "@/lib/save-submission";
import { useAuth } from "@/hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Run state
// ─────────────────────────────────────────────────────────────────────────────

export type ArenaRunState =
  | "idle"
  | "running"
  | "run_done"
  | "submitting"
  | "submitted"
  | "error";

export interface UseArenaProblemReturn {
  // Editor state
  designCode:       string;
  testbenchCode:    string;
  setDesignCode:    (v: string) => void;
  setTestbenchCode: (v: string) => void;

  // State
  runState:         ArenaRunState;
  isRunning:        boolean;
  isSubmitting:     boolean;

  // Results
  runResult:        SimulateResponse | null;
  submission:       ArenaSubmissionResult | null;
  errorMsg:         string | null;

  // Progress during multi-testcase submission
  submittingIndex:  number;
  submittingTotal:  number;

  // Actions
  run:            () => Promise<void>;
  submit:         () => Promise<ArenaSubmissionResult | null>;
  resetToStarter: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict comparison
// ─────────────────────────────────────────────────────────────────────────────

function compareStdout(actual: string, expected: string): boolean {
  const normalise = (s: string) =>
    s.trim().split("\n").map((l) => l.trim()).filter(Boolean);

  const actualLines   = normalise(actual);
  const expectedLines = normalise(expected);

  // Fast path: "ALL TESTS PASSED" sentinel
  if (expectedLines.length === 1 && expectedLines[0] === "ALL TESTS PASSED") {
    return (
      actual.includes("ALL TESTS PASSED") &&
      !actual.includes("TESTS FAILED") &&
      !actual.includes("FAIL:")
    );
  }

  return expectedLines.every((el) =>
    actualLines.some((al) => al.includes(el)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useArenaProblem(problem: ArenaProblem): UseArenaProblemReturn {
  const { user } = useAuth();
  const [designCode,    setDesignCode]    = useState(problem.starterCode);
  // Arena exposes the public testbench in the editor (read-only view)
  const [testbenchCode, setTestbenchCode] = useState(problem.testbenchSkeleton);
  const [runState,      setRunState]      = useState<ArenaRunState>("idle");
  const [runResult,     setRunResult]     = useState<SimulateResponse | null>(null);
  const [submission,    setSubmission]    = useState<ArenaSubmissionResult | null>(null);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [submittingIndex, setSubmittingIndex] = useState(0);
  const [submittingTotal, setSubmittingTotal] = useState(0);

  // ── Run against public testbench ──────────────────────────────────────────
  const run = useCallback(async () => {
    if (runState === "running" || runState === "submitting") return;
    setRunState("running");
    setErrorMsg(null);
    setRunResult(null);
    try {
      const result = await runSimulation({
        design_v:    designCode,
        testbench_v: testbenchCode,
        timeout:     30,
      });
      setRunResult(result);
      setRunState("run_done");

      // ✅ Save submission to database (fire-and-forget)
      saveSubmission({
        userId:         user?.id,
        problemSlug:    problem.slug,
        designCode:     designCode,
        testbenchCode:  testbenchCode,
        submissionType: "RUN",
        simStatus:      result.success ? "SUCCESS" : "COMPILE_ERROR",
        simStdout:      result.stdout ?? null,
        simStderr:      result.stderr ?? null,
        simExitCode:    result.exit_code ?? null,
        durationMs:     result.duration_ms ?? null,
        testcaseResults: [],
        waveformVcd:    result.waveform?.vcd_base64 ?? null,
        xpEarned:       0,
        accepted:       false,
      }).catch(err => console.warn("[useArenaProblem.run] submission save:", err));

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setRunState("error");
    }
  }, [runState, designCode, testbenchCode, problem, user?.id]);

  // ── Submit against all hidden testcases ───────────────────────────────────
  const submit = useCallback(async (): Promise<ArenaSubmissionResult | null> => {
    if (runState === "running" || runState === "submitting") return null;

    const testcases = problem.hiddenTestcases ?? [];

    setRunState("submitting");
    setSubmittingTotal(testcases.length);
    setSubmittingIndex(0);
    setErrorMsg(null);

    const verdicts: ArenaVerdictItem[] = [];
    let totalDurationMs = 0;

    for (let i = 0; i < testcases.length; i++) {
      setSubmittingIndex(i);
      const tc = testcases[i];

      let verdict: ArenaVerdictItem;
      try {
        const t0     = performance.now();
        const result = await runSimulation({
          design_v:    designCode,
          testbench_v: tc.testbench,
          timeout:     30,
        });
        const elapsed = performance.now() - t0;
        totalDurationMs += elapsed;

        if (!result.success) {
          verdict = {
            testcaseId:     tc.id,
            description:    tc.description,
            passed:         false,
            actualOutput:   result.stdout ?? "",
            expectedOutput: tc.expected,
            durationMs:     elapsed,
            error:          result.stderr || `Exit status: ${result.status}`,
          };
        } else {
          const stdout = result.stdout ?? "";
          const passed = compareStdout(stdout, tc.expected);
          verdict = {
            testcaseId:     tc.id,
            description:    tc.description,
            passed,
            actualOutput:   stdout,
            expectedOutput: tc.expected,
            durationMs:     elapsed,
          };
        }
      } catch (err) {
        verdict = {
          testcaseId:     tc.id,
          description:    tc.description,
          passed:         false,
          actualOutput:   "",
          expectedOutput: tc.expected,
          durationMs:     0,
          error:          err instanceof Error ? err.message : "Network error",
        };
      }

      verdicts.push(verdict);
    }

    const passedCount = verdicts.filter((v) => v.passed).length;
    const accepted    = passedCount === testcases.length;

    const sub: ArenaSubmissionResult = {
      id:              crypto.randomUUID(),
      problemId:       problem.id,
      timestamp:       Date.now(),
      verdicts,
      passed:          passedCount,
      total:           testcases.length,
      accepted,
      totalDurationMs,
      submittedCode:   designCode,
      xpEarned:        accepted ? problem.xpReward : 0,
    };

    setSubmission(sub);
    setRunState("submitted");

    // ✅ Save submission to database (fire-and-forget)
    saveSubmission({
      userId:         user?.id,
      problemSlug:    problem.slug,
      designCode:     designCode,
      testbenchCode:  testbenchCode,
      submissionType: "SUBMIT",
      simStatus:      accepted ? "SUCCESS" : "RUNTIME_ERROR",
      simStdout:      null,
      simStderr:      null,
      simExitCode:    null,
      durationMs:     totalDurationMs,
      testcaseResults: verdicts.map(v => ({
        id:          v.testcaseId,
        description: v.description,
        passed:      v.passed,
        expected:    v.expectedOutput,
        actual:      v.actualOutput || null,
      })),
      waveformVcd:    null,
      xpEarned:       accepted ? problem.xpReward : 0,
      accepted:       accepted,
    }).catch(err => console.warn("[useArenaProblem.submit] submission save:", err));

    return sub;
  }, [runState, problem, designCode, testbenchCode, user?.id]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetToStarter = useCallback(() => {
    setDesignCode(problem.starterCode);
    setTestbenchCode(problem.testbenchSkeleton);
    setRunState("idle");
    setRunResult(null);
    setSubmission(null);
    setErrorMsg(null);
  }, [problem]);

  return {
    designCode,
    testbenchCode,
    setDesignCode,
    setTestbenchCode,
    runState,
    isRunning:      runState === "running",
    isSubmitting:   runState === "submitting",
    runResult,
    submission,
    errorMsg,
    submittingIndex,
    submittingTotal,
    run,
    submit,
    resetToStarter,
  };
}