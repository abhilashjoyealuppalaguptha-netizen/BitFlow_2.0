/**
 * hooks/useAI.ts — AI Assistant state management
 *
 * CHANGE MODEL (Cursor / Codex style):
 * ──────────────────────────────────────
 * When the AI suggests code for design.v or tb.v:
 *
 *   1. The change is applied to the editor IMMEDIATELY (user sees it live).
 *   2. The previous code is stored in a "pending" snapshot.
 *   3. A banner appears: "AI modified design.v — Accept or Undo"
 *   4. Accept  → clears the snapshot (change stays).
 *   5. Undo    → restores previous code from snapshot (change reverted).
 *
 * This mirrors Cursor's workflow exactly.  The user always has one-click
 * escape — no risk of losing their work.
 *
 * State owned here:
 *   - Chat message history
 *   - Loading / error state
 *   - Token usage tracking (placeholder for Oogway credit system)
 *   - Extracted code suggestions from AI responses
 *   - Pending change snapshots for accept / undo
 *
 * TODO: Add session-level credit tracking when Oogway credit system ships.
 * TODO: Add streaming support when API route supports SSE.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { AIMessage } from "@/lib/ai-providers";
import type { IDEContext } from "@/lib/ai-prompts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: number;
  suggestions?: CodeSuggestion[];
  tokensUsed?:  number | null;
}

export interface CodeSuggestion {
  target:  "design" | "testbench";
  code:    string;
  label:   string;
}

/**
 * A pending change that the user has not yet accepted or undone.
 * Stored per-file; at most one pending change per file at a time.
 */
export interface PendingChange {
  target:       "design" | "testbench";
  previousCode: string;
  proposedCode: string;
  label:        string;
  added:        number;   // lines added (for banner display)
  removed:      number;   // lines removed (for banner display)
}

export interface UseAIReturn {
  messages:         ChatMessage[];
  isLoading:        boolean;
  error:            string | null;
  totalTokens:      number;

  /** Pending change for design.v — non-null while awaiting accept/undo */
  pendingDesign:    PendingChange | null;
  /** Pending change for tb.v — non-null while awaiting accept/undo */
  pendingTestbench: PendingChange | null;

  sendMessage:      (prompt: string, context: IDEContext) => Promise<void>;
  clearHistory:     () => void;

  /**
   * Immediately writes code to design.v editor, saves snapshot for undo.
   * Called when user clicks the suggestion button.
   */
  applyToDesign:    (code: string, label: string) => void;
  /**
   * Immediately writes code to tb.v editor, saves snapshot for undo.
   */
  applyToTestbench: (code: string, label: string) => void;

  /** Accept pending design.v change — clears snapshot, change stays. */
  acceptDesign:     () => void;
  /** Undo pending design.v change — restores previous code. */
  undoDesign:       () => void;

  /** Accept pending tb.v change — clears snapshot, change stays. */
  acceptTestbench:  () => void;
  /** Undo pending tb.v change — restores previous code. */
  undoTestbench:    () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Code extraction helper
// ─────────────────────────────────────────────────────────────────────────────

const DESIGN_MARKER    = /\/\/\s*---\s*DESIGN\.V SUGGESTION\s*---/i;
const TESTBENCH_MARKER = /\/\/\s*---\s*TB\.V SUGGESTION\s*---/i;
const END_MARKER       = /\/\/\s*---\s*END SUGGESTION\s*---/i;

function extractSuggestions(text: string): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];

  // Marker-based extraction first (structured AI responses)
  const lines = text.split("\n");
  let target: "design" | "testbench" | null = null;
  let collecting = false;
  let block: string[] = [];

  for (const line of lines) {
    if (DESIGN_MARKER.test(line))    { target = "design";    collecting = true; block = []; continue; }
    if (TESTBENCH_MARKER.test(line)) { target = "testbench"; collecting = true; block = []; continue; }
    if (END_MARKER.test(line) && collecting) {
      const code = block.join("\n").trim();
      if (code && target) {
        suggestions.push({
          target,
          code,
          label: code.split("\n").find((l) => l.trim().startsWith("//"))
                   ?.trim().replace(/^\/\/\s*/, "")
                 ?? `${target} suggestion`,
        });
      }
      collecting = false; target = null; block = [];
      continue;
    }
    if (collecting) block.push(line);
  }

  // Fallback: bare ```verilog fences
  if (suggestions.length === 0) {
    const fenceRegex = /```(?:verilog|systemverilog)?\n([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    while ((match = fenceRegex.exec(text)) !== null) {
      const code = match[1].trim();
      if (code.length > 10) {
        const isTestbench = /\b(tb_|testbench|initial\s+begin.*\$finish)/i.test(code);
        suggestions.push({ target: isTestbench ? "testbench" : "design", code, label: "Code suggestion" });
      }
    }
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAI(
  designCode:      string,
  testbenchCode:   string,
  setDesignCode:   (code: string) => void,
  setTestbenchCode:(code: string) => void,
): UseAIReturn {
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [isLoading,        setIsLoading]        = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [totalTokens,      setTotalTokens]      = useState(0);
  const [pendingDesign,    setPendingDesign]    = useState<PendingChange | null>(null);
  const [pendingTestbench, setPendingTestbench] = useState<PendingChange | null>(null);

  const historyRef = useRef<AIMessage[]>([]);

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (prompt: string, context: IDEContext) => {
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user",
      content: prompt.trim(), timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    historyRef.current = [...historyRef.current, { role: "user", content: prompt.trim() }];

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: historyRef.current, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `API error ${res.status}`);
      }

      const data       = await res.json();
      const content    = (data.content    as string)       ?? "";
      const tokensUsed = (data.tokensUsed as number | null) ?? null;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content, timestamp: Date.now(),
        suggestions: extractSuggestions(content),
        tokensUsed,
      };

      historyRef.current = [...historyRef.current, { role: "assistant", content }];
      setMessages((prev) => [...prev, assistantMsg]);
      if (tokensUsed) setTotalTokens((t) => t + tokensUsed);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      historyRef.current = historyRef.current.slice(0, -1);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearHistory = useCallback(() => {
    setMessages([]); setError(null); historyRef.current = [];
  }, []);

  // ── Line-diff engine ───────────────────────────────────────────────────────

  /**
   * computeDiffStats — counts how many lines were added/removed between two
   * versions.  Used to populate the PendingBanner with "+X −Y lines".
   *
   * Algorithm: compare line sets with positional awareness.
   * Good enough for banner display — not a full Myers diff.
   */
  function computeDiffStats(
    oldCode: string,
    newCode: string,
  ): { added: number; removed: number } {
    const oldLines = oldCode.split("\n");
    const newLines = newCode.split("\n");

    // Build a frequency map for old lines
    const oldFreq = new Map<string, number>();
    for (const l of oldLines) oldFreq.set(l, (oldFreq.get(l) ?? 0) + 1);

    let added = 0;
    const newFreq = new Map<string, number>();
    for (const l of newLines) {
      newFreq.set(l, (newFreq.get(l) ?? 0) + 1);
      const oldCount = oldFreq.get(l) ?? 0;
      const newCount = newFreq.get(l) ?? 0;
      if (newCount > oldCount) added++;
    }

    let removed = 0;
    const consumedFreq = new Map<string, number>();
    for (const l of oldLines) {
      consumedFreq.set(l, (consumedFreq.get(l) ?? 0) + 1);
      const newCount2 = newFreq.get(l) ?? 0;
      const consumed  = consumedFreq.get(l) ?? 0;
      if (consumed > newCount2) removed++;
    }

    return { added, removed };
  }

  /**
   * applyLineDiff — the core of the Cursor-style change model.
   *
   * The AI always returns the COMPLETE modified file (enforced by the system
   * prompt).  We use the AI's complete file as the authoritative new version.
   * This means:
   *
   *   - A 3-line fix in a 50-line file:  AI returns all 50 lines, 3 changed.
   *     Editor shows the 50-line file.  Visually only 3 lines look different.
   *
   *   - A full rewrite:  AI returns the new file.  Editor shows the new file.
   *
   * The "surgical" feeling comes from the AI being instructed to preserve
   * everything except what it changes — not from us doing partial patching.
   *
   * If the AI returned a partial snippet (old behaviour, fallback):
   *   We inject it before endmodule so it doesn't obliterate the file.
   */
  function applyLineDiff(existing: string, aiOutput: string): string {
    const trimmed = aiOutput.trim();
    if (!existing.trim()) return trimmed;              // empty editor — just insert

    // If AI returned a complete file (has module...endmodule), use it as-is.
    // The AI was instructed to return the full file, so this is the happy path.
    const isCompleteFile = /\bmodule\b[\s\S]*\bendmodule\b/i.test(trimmed);
    if (isCompleteFile) return trimmed;

    // Fallback: AI returned a partial snippet — inject before final endmodule
    // so we don't obliterate the user's code.
    const endIdx = existing.trimEnd().lastIndexOf("endmodule");
    if (endIdx === -1) return existing.trimEnd() + "\n\n" + trimmed;

    const before = existing.trimEnd().slice(0, endIdx).trimEnd();
    const after  = existing.trimEnd().slice(endIdx);
    const indented = trimmed.split("\n").map((l) => (l.trim() ? "    " + l : "")).join("\n");
    return before + "\n\n    // AI suggestion\n" + indented + "\n\n" + after;
  }

  // ── Apply (Cursor-style: line diff + snapshot for undo) ────────────────────

  const applyToDesign = useCallback((code: string, label: string) => {
    const next  = applyLineDiff(designCode, code);
    const stats = computeDiffStats(designCode, next);
    setPendingDesign({
      target:       "design",
      previousCode: designCode,
      proposedCode: next,
      label,
      added:   stats.added,
      removed: stats.removed,
    });
    setDesignCode(next);
  }, [designCode, setDesignCode]);

  const applyToTestbench = useCallback((code: string, label: string) => {
    const next  = applyLineDiff(testbenchCode, code);
    const stats = computeDiffStats(testbenchCode, next);
    setPendingTestbench({
      target:       "testbench",
      previousCode: testbenchCode,
      proposedCode: next,
      label,
      added:   stats.added,
      removed: stats.removed,
    });
    setTestbenchCode(next);
  }, [testbenchCode, setTestbenchCode]);

  // ── Accept: keep the change, discard the snapshot ──────────────────────────

  const acceptDesign    = useCallback(() => setPendingDesign(null),    []);
  const acceptTestbench = useCallback(() => setPendingTestbench(null), []);

  // ── Undo: restore previous code, discard the snapshot ──────────────────────

  const undoDesign = useCallback(() => {
    if (!pendingDesign) return;
    setDesignCode(pendingDesign.previousCode);
    setPendingDesign(null);
  }, [pendingDesign, setDesignCode]);

  const undoTestbench = useCallback(() => {
    if (!pendingTestbench) return;
    setTestbenchCode(pendingTestbench.previousCode);
    setPendingTestbench(null);
  }, [pendingTestbench, setTestbenchCode]);

  return {
    messages, isLoading, error, totalTokens,
    pendingDesign, pendingTestbench,
    sendMessage, clearHistory,
    applyToDesign, applyToTestbench,
    acceptDesign, undoDesign,
    acceptTestbench, undoTestbench,
  };
}