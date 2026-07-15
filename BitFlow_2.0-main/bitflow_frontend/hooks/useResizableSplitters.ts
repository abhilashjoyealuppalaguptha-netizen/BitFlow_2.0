/**
 * hooks/useResizableSplitters.ts — Splitter state management
 *
 * Manages the positions of three splitters:
 *   • verticalSplit: divides design.v and tb.v editors (0–100%)
 *   • terminalSplit: divides editors and terminal (0–100%)
 *   • waveformSplit: divides terminal and waveform (0–100%)
 *
 * All positions persist to localStorage so they survive page reloads.
 * Constraints ensure minimum panel heights are respected.
 */

"use client";

import { useState, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum height for each panel (px) */
const MIN_EDITOR_HEIGHT = 80;
const MIN_TERMINAL_HEIGHT = 60;
const MIN_WAVEFORM_HEIGHT = 32;

/** Local storage keys */
const STORAGE_KEYS = {
  verticalSplit: "bitflow-vertical-split",
  terminalSplit: "bitflow-terminal-split",
  waveformSplit: "bitflow-waveform-split",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ResizableSplitters {
  /** Horizontal position of vertical splitter between editors (0–1) */
  verticalSplit: number;
  /** Vertical position of terminal splitter (0–1, relative to editor+terminal area) */
  terminalSplit: number;
  /** Vertical position of waveform splitter (0–1, relative to terminal+waveform area) */
  waveformSplit: number;
  isDragging: boolean;
  activeHandle: "vertical" | "terminal" | "waveform" | null;
}

export interface DragState {
  startX: number;
  startY: number;
  startValue: number;
  containerSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useResizableSplitters() {
  // ── Initial state (hydrated from localStorage on mount)
  const [verticalSplit, setVerticalSplit] = useState(0.5);
  const [terminalSplit, setTerminalSplit] = useState(0.7);
  const [waveformSplit, setWaveformSplit] = useState(0.8);

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<
    "vertical" | "terminal" | "waveform" | null
  >(null);

  // ── Hydrate from localStorage on mount
  useEffect(() => {
    const savedVertical = localStorage.getItem(STORAGE_KEYS.verticalSplit);
    const savedTerminal = localStorage.getItem(STORAGE_KEYS.terminalSplit);
    const savedWaveform = localStorage.getItem(STORAGE_KEYS.waveformSplit);

    if (savedVertical) {
      const value = parseFloat(savedVertical);
      if (!Number.isNaN(value)) setVerticalSplit(clamp(value, 0.2, 0.8));
    }
    if (savedTerminal) {
      const value = parseFloat(savedTerminal);
      if (!Number.isNaN(value)) setTerminalSplit(clamp(value, 0.3, 0.95));
    }
    if (savedWaveform) {
      const value = parseFloat(savedWaveform);
      if (!Number.isNaN(value)) setWaveformSplit(clamp(value, 0.2, 0.98));
    }
  }, []);

  // ── Persist to localStorage whenever a split changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.verticalSplit, verticalSplit.toString());
  }, [verticalSplit]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.terminalSplit, terminalSplit.toString());
  }, [terminalSplit]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.waveformSplit, waveformSplit.toString());
  }, [waveformSplit]);

  // ── Vertical splitter (between design.v and tb.v)
  const handleVerticalDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, containerWidth: number) => {
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      setIsDragging(true);
      setActiveHandle("vertical");
      let dragState: DragState = {
        startX: clientX,
        startY: 0,
        startValue: verticalSplit,
        containerSize: containerWidth,
      };
      const moveFn = (evt: MouseEvent | TouchEvent) => {
        const currentX =
          evt instanceof TouchEvent ? evt.touches[0].clientX : evt.clientX;
        const delta = currentX - dragState.startX;
        const newSplit = Math.max(
          0.2,
          Math.min(0.8, dragState.startValue + delta / dragState.containerSize)
        );
        setVerticalSplit(newSplit);
      };
      const upFn = () => {
        setIsDragging(false);
        setActiveHandle(null);
        document.removeEventListener("mousemove", moveFn);
        document.removeEventListener("touchmove", moveFn);
        document.removeEventListener("mouseup", upFn);
        document.removeEventListener("touchend", upFn);
      };
      document.addEventListener("mousemove", moveFn);
      document.addEventListener("touchmove", moveFn);
      document.addEventListener("mouseup", upFn);
      document.addEventListener("touchend", upFn);
    },
    [verticalSplit]
  );

  // ── Terminal splitter (between editors and terminal)
  const handleTerminalDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, containerHeight: number) => {
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setIsDragging(true);
      setActiveHandle("terminal");
      let dragState: DragState = {
        startX: 0,
        startY: clientY,
        startValue: terminalSplit,
        containerSize: containerHeight,
      };
      const moveFn = (evt: MouseEvent | TouchEvent) => {
        const currentY =
          evt instanceof TouchEvent ? evt.touches[0].clientY : evt.clientY;
        const delta = currentY - dragState.startY;
        const newSplit = Math.max(
          0.3,
          Math.min(0.95, dragState.startValue + delta / dragState.containerSize)
        );
        setTerminalSplit(newSplit);
      };
      const upFn = () => {
        setIsDragging(false);
        setActiveHandle(null);
        document.removeEventListener("mousemove", moveFn);
        document.removeEventListener("touchmove", moveFn);
        document.removeEventListener("mouseup", upFn);
        document.removeEventListener("touchend", upFn);
      };
      document.addEventListener("mousemove", moveFn);
      document.addEventListener("touchmove", moveFn);
      document.addEventListener("mouseup", upFn);
      document.addEventListener("touchend", upFn);
    },
    [terminalSplit]
  );

  // ── Waveform splitter (between terminal and waveform)
  const handleWaveformDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, containerHeight: number) => {
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setIsDragging(true);
      setActiveHandle("waveform");
      let dragState: DragState = {
        startX: 0,
        startY: clientY,
        startValue: waveformSplit,
        containerSize: containerHeight,
      };
      const moveFn = (evt: MouseEvent | TouchEvent) => {
        const currentY =
          evt instanceof TouchEvent ? evt.touches[0].clientY : evt.clientY;
        const delta = currentY - dragState.startY;
        const newSplit = Math.max(
          0.2,
          Math.min(0.98, dragState.startValue + delta / dragState.containerSize)
        );
        setWaveformSplit(newSplit);
      };
      const upFn = () => {
        setIsDragging(false);
        setActiveHandle(null);
        document.removeEventListener("mousemove", moveFn);
        document.removeEventListener("touchmove", moveFn);
        document.removeEventListener("mouseup", upFn);
        document.removeEventListener("touchend", upFn);
      };
      document.addEventListener("mousemove", moveFn);
      document.addEventListener("touchmove", moveFn);
      document.addEventListener("mouseup", upFn);
      document.addEventListener("touchend", upFn);
    },
    [waveformSplit]
  );

  return {
    verticalSplit,
    setVerticalSplit,
    terminalSplit,
    setTerminalSplit,
    waveformSplit,
    setWaveformSplit,
    isDragging,
    activeHandle,
    handleVerticalDragStart,
    handleTerminalDragStart,
    handleWaveformDragStart,
  };
}
