/**
 * hooks/useSplitter.ts — Reusable drag-splitter primitive
 *
 * Encapsulates the mousedown → global mousemove → mouseup lifecycle that
 * powers all resizable panes in the BitFlow IDE layout.
 *
 * Design decisions:
 *
 *   • onDelta is stored in a ref (onDeltaRef) so the mousemove handler
 *     registered at drag-start always calls the *current* callback without
 *     needing to be re-registered when the parent's state changes.
 *     This is the same pattern used in WaveformPanel's wheel handler.
 *
 *   • Listeners are attached to `window` (not the element) so the drag
 *     continues even when the cursor leaves the splitter div — essential for
 *     any split-pane UX.
 *
 *   • `user-select: none` is toggled on <body> during drag to prevent
 *     text selection inside Monaco editors as the cursor flies over them.
 *
 * Usage:
 *   const { handleMouseDown, isDragging } = useSplitter({
 *     axis: "y",
 *     onDelta: (_, dy) => setEditorFrac(f => clamp(f + dy / containerH)),
 *   });
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SplitterAxis = "x" | "y";

export interface UseSplitterOptions {
  /**
   * Which axis to track.
   *   "x" → horizontal splitter (left/right panes), receives dx each move
   *   "y" → vertical splitter (top/bottom panes), receives dy each move
   */
  axis: SplitterAxis;
  /**
   * Called on every mousemove during a drag with the pixel delta since the
   * previous event.  The caller is responsible for updating its own state.
   *
   * dx is always 0 for axis="y"; dy is always 0 for axis="x".
   */
  onDelta: (dx: number, dy: number) => void;
}

export interface UseSplitterResult {
  /** Attach to the splitter element's onMouseDown prop. */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** True while the user is actively dragging — use for styling. */
  isDragging: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSplitter({
  axis,
  onDelta,
}: UseSplitterOptions): UseSplitterResult {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * onDeltaRef: always points to the latest onDelta callback.
   * The mousemove handler captures this ref at drag-start and calls
   * onDeltaRef.current each frame — no stale closure, no re-registration.
   */
  const onDeltaRef = useRef(onDelta);
  useEffect(() => { onDeltaRef.current = onDelta; });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to the primary (left) mouse button
      if (e.button !== 0) return;
      e.preventDefault();

      setIsDragging(true);

      // Disable text selection globally during drag so Monaco's selection
      // logic doesn't activate as the cursor crosses the editor pane.
      document.body.style.userSelect = "none";

      let lastX = e.clientX;
      let lastY = e.clientY;

      const handleMove = (e: MouseEvent) => {
        const dx = axis === "x" ? e.clientX - lastX : 0;
        const dy = axis === "y" ? e.clientY - lastY : 0;
        lastX = e.clientX;
        lastY = e.clientY;
        onDeltaRef.current(dx, dy);
      };

      const handleUp = () => {
        setIsDragging(false);
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup",   handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup",   handleUp);
    },
    [axis],  // axis is stable (passed as a literal); re-create if it changes
  );

  return { handleMouseDown, isDragging };
}