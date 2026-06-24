"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProgressRecord, SubmissionResult } from "@/lib/problem-types";
import { createEmptyProgress } from "@/lib/progress-storage";

export interface UseProgressReturn {
  progress:       ProgressRecord;
  isLoaded:       boolean;
  isSolved:       (problemId: string) => boolean;
  totalSolved:    number;
  recordSolve:    (result: SubmissionResult, moduleId: string) => void;
  recordAttempt:  (problemId: string) => void;
  resetProgress:  () => void;
}

export function useProgress(): UseProgressReturn {
  const [progress, setProgress] = useState<ProgressRecord>(createEmptyProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch initial progress from database API
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/progress");
      const data = await res.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error("[BitFlow] Failed to load progress from DB:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const recordSolve = useCallback(async (result: SubmissionResult, moduleId: string) => {
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "solve",
          problemId: result.problemId,
          moduleId,
          xpReward: result.xpEarned,
        }),
      });
      const data = await res.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error("[BitFlow] Failed to record solve in DB:", err);
    }
  }, []);

  const recordAttempt = useCallback(async (problemId: string) => {
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "attempt",
          problemId,
        }),
      });
      const data = await res.json();
      if (data.progress) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error("[BitFlow] Failed to record attempt in DB:", err);
    }
  }, []);

  const resetProgress = useCallback(async () => {
    // Reset path is not supported on DB for now (simple stub)
    const fresh = createEmptyProgress();
    setProgress(fresh);
  }, []);

  const isSolved = useCallback((problemId: string) => {
    return progress.problems[problemId]?.solved ?? false;
  }, [progress.problems]);

  const totalSolved = Object.values(progress.problems).filter((p) => p.solved).length;

  return {
    progress,
    isLoaded,
    isSolved,
    totalSolved,
    recordSolve,
    recordAttempt,
    resetProgress,
  };
}