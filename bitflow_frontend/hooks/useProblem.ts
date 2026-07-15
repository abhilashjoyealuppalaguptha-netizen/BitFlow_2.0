"use client";
/**
 * hooks/useProblem.ts — Problem-mode simulation + submission engine
 *
 * SEPARATION FROM useSimulation:
 *   useSimulation owns Sandbox state (persistent editors, workspace storage).
 *   useProblem owns Problem Arena state (injected starter code, verdict tracking).
 *   They share the same backend /simulate endpoint but are independent hooks.
 *
 * RUN vs SUBMIT:
 *   run()    → single simulation with the public testbench (fast feedback)
 *   submit() → sequential simulation of each hidden testcase → verdicts → XP
 *
 * The sequential submission approach (one fetch per testcase) keeps the backend
 * stateless and avoids any new API routes. For now this is fine; when a proper
 * judge queue is added, only the submit() implementation changes here.
 *
 * ✅ NOW: Saves all submissions to Prisma via saveSubmission()
 */

import { useState, useCallback } from "react";
import type { Problem, SubmissionResult, TestcaseVerdict } from "@/lib/problem-types";
import type { SimulateResponse } from "@/lib/types";
import { runSimulation } from "@/lib/api";
import { saveSubmission } from "@/lib/save-submission";
import { useAuth } from "@/hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProblemRunState =
  | "idle"
  | "running"     // local run in progress
  | "run_done"    // local run completed
  | "submitting"  // submission in progress (multiple testcases)
  | "submitted"   // submission completed
  | "error";      // network/infra error

export interface UseProblemReturn {
  // Editor state (problem-owned, not localStorage)
  designCode:       string;
  testbenchCode:    string;
  setDesignCode:    (v: string) => void;
  setTestbenchCode: (v: string) => void;

  // Run state
  runState:         ProblemRunState;
  isRunning:        boolean;
  isSubmitting:     boolean;

  // Results
  runResult:        SimulateResponse | null;   // last local run result
  submission:       SubmissionResult | null;   // last submission result
  errorMsg:         string | null;

  // Submission progress (for UI during sequential evaluation)
  submittingIndex:  number;                    // which testcase is running (0-based)
  submittingTotal:  number;

  // Actions
  run:              () => Promise<void>;
  submit:           () => Promise<SubmissionResult | null>;
  resetToStarter:   () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict comparison helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare actual stdout against expected output.
 *
 * Strategy (in order):
 *   1. If expected is "ALL TESTS PASSED" → check stdout contains it and no FAIL lines.
 *   2. Otherwise → normalised line-by-line substring match.
 *      The actual stdout may contain VCD info lines before/after the logic output,
 *      so we check that every expected line appears somewhere in actual, not strict equality.
 */
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

  // General path: every expected line must appear in actual
  return expectedLines.every((el) =>
    actualLines.some((al) => al.includes(el))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useProblem(problem: Problem): UseProblemReturn {
  const { user } = useAuth();
  const [designCode,    setDesignCode]    = useState(problem.starterCode);
  const [testbenchCode, setTestbenchCode] = useState(problem.publicTestbench);
  const [runState,      setRunState]      = useState<ProblemRunState>("idle");
  const [runResult,     setRunResult]     = useState<SimulateResponse | null>(null);
  const [submission,    setSubmission]    = useState<SubmissionResult | null>(null);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [submittingIndex, setSubmittingIndex] = useState(0);
  const [submittingTotal, setSubmittingTotal] = useState(0);

  // ── Local run (public testbench) ──────────────────────────────────────────

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
      }).catch(err => console.warn("[useProblem.run] submission save:", err));

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setRunState("error");
    }
  }, [runState, designCode, testbenchCode, problem, user?.id]);

  // ── Submit (hidden testcases) ─────────────────────────────────────────────

  const submit = useCallback(async (): Promise<SubmissionResult | null> => {
    if (runState === "running" || runState === "submitting") return null;

    // ── Path A: single hiddenTestbench string (current beginner problems) ──
    const testcases = problem.hiddenTestcases ?? [];
    const hasSingleHidden = !!(problem as any).hiddenTestbench && testcases.length === 0;

    if (hasSingleHidden) {
      setRunState("submitting");
      try {
        const t0 = performance.now();
        const result = await runSimulation({
          design_v:    designCode,
          testbench_v: (problem as any).hiddenTestbench as string,
          timeout:     30,
        });
        const elapsed = performance.now() - t0;

        // Hidden testbench prints "ALL TESTS PASSED" on success, "FAIL:..." on failure
        const stdout = result.stdout ?? "";
        const passed =
          result.success &&
          (stdout.includes("ALL TESTS PASSED") ||
           (!stdout.includes("FAIL") && !stdout.includes("TESTS FAILED")));

        const sub: SubmissionResult = {
          id:              crypto.randomUUID(),
          problemId:       problem.id,
          timestamp:       Date.now(),
          verdicts:        [],
          passed:          passed ? 1 : 0,
          total:           1,
          accepted:        passed,
          totalDurationMs: elapsed,
          submittedCode:   designCode,
          xpEarned:        passed ? problem.xpReward : 0,
          errorMessage:    passed ? undefined : result.stderr || stdout || "Tests failed",
        };
        setSubmission(sub);
        setRunState("submitted");

        // ✅ Save submission to database
        saveSubmission({
          userId:         user?.id,
          problemSlug:    problem.slug,
          designCode:     designCode,
          testbenchCode:  testbenchCode,
          submissionType: "SUBMIT",
          simStatus:      passed ? "SUCCESS" : "RUNTIME_ERROR",
          simStdout:      stdout ?? null,
          simStderr:      result.stderr ?? null,
          simExitCode:    result.exit_code ?? null,
          durationMs:     elapsed,
          testcaseResults: [],
          waveformVcd:    null,
          xpEarned:       passed ? problem.xpReward : 0,
          accepted:       passed,
        }).catch(err => console.warn("[useProblem.submit-single] submission save:", err));

        return sub;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setRunState("error");
        return null;
      }
    }

    // ── Path B: no hidden testbench at all — fall back to public testbench ──
    if (testcases.length === 0) {
      setRunState("submitting");
      try {
        const result = await runSimulation({
          design_v:    designCode,
          testbench_v: problem.publicTestbench,
          timeout:     30,
        });
        const stdout = result.stdout ?? "";
        const passed =
          result.success &&
          (stdout.includes("ALL TESTS PASSED") ||
           (!stdout.includes("FAIL") && !stdout.includes("TESTS FAILED")));
        const sub: SubmissionResult = {
          id:              crypto.randomUUID(),
          problemId:       problem.id,
          timestamp:       Date.now(),
          verdicts:        [],
          passed:          passed ? 1 : 0,
          total:           1,
          accepted:        passed,
          totalDurationMs: result.duration_ms,
          submittedCode:   designCode,
          xpEarned:        passed ? problem.xpReward : 0,
          errorMessage:    passed ? undefined : result.stderr || result.stdout,
        };
        setSubmission(sub);
        setRunState("submitted");

        // ✅ Save submission to database
        saveSubmission({
          userId:         user?.id,
          problemSlug:    problem.slug,
          designCode:     designCode,
          testbenchCode:  testbenchCode,
          submissionType: "SUBMIT",
          simStatus:      passed ? "SUCCESS" : "RUNTIME_ERROR",
          simStdout:      stdout ?? null,
          simStderr:      result.stderr ?? null,
          simExitCode:    result.exit_code ?? null,
          durationMs:     result.duration_ms ?? null,
          testcaseResults: [],
          waveformVcd:    null,
          xpEarned:       passed ? problem.xpReward : 0,
          accepted:       passed,
        }).catch(err => console.warn("[useProblem.submit-fallback] submission save:", err));

        return sub;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setRunState("error");
        return null;
      }
    }

    setRunState("submitting");
    setSubmittingTotal(testcases.length);
    setSubmittingIndex(0);
    setErrorMsg(null);

    const verdicts: TestcaseVerdict[] = [];
    let totalDurationMs = 0;

    for (let i = 0; i < testcases.length; i++) {
      setSubmittingIndex(i);
      const tc = testcases[i];

      let verdict: TestcaseVerdict;
      try {
        const t0 = performance.now();
        const result = await runSimulation({
          design_v:    designCode,
          testbench_v: tc.testbench,
          timeout:     30,
        });
        const elapsed = performance.now() - t0;
        totalDurationMs += elapsed;

        // Compile or runtime failure → automatic fail for this testcase
        if (!result.success) {
          verdict = {
            testcaseId:     tc.id,
            description:    tc.description,
            passed:         false,
            actualOutput:   result.stdout,
            expectedOutput: tc.expected,
            durationMs:     elapsed,
            error:          result.stderr || `Exit status: ${result.status}`,
          };
        } else {
          // Compare output according to the problem's expected mode.
          // "stdout" and "stdout_compare" both do text comparison.
          // Fallback: trust exit code + absence of FAIL lines.
          const stdout = result.stdout ?? "";
          const passed =
            problem.expectedOutputMode === "stdout_compare" ||
            problem.expectedOutputMode === "signal_compare"
              ? compareStdout(stdout, tc.expected)
              : result.success &&
                !stdout.includes("FAIL") &&
                !stdout.includes("TESTS FAILED");

          verdict = {
            testcaseId:     tc.id,
            description:    tc.description,
            passed,
            actualOutput:   result.stdout ?? "",
            expectedOutput: tc.expected,
            durationMs:     elapsed,
          };
        }
      } catch (err) {
        // Network error for this testcase
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

    const sub: SubmissionResult = {
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

    // ✅ Save submission to database
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
    }).catch(err => console.warn("[useProblem.submit-multi] submission save:", err));

    return sub;
  }, [runState, problem, designCode, testbenchCode, user?.id]);

  // ── Reset to starter code ─────────────────────────────────────────────────

  const resetToStarter = useCallback(() => {
    setDesignCode(problem.starterCode);
    setTestbenchCode(problem.publicTestbench);
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