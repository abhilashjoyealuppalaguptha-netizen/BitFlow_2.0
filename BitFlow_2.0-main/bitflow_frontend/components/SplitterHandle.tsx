/**
 * components/SplitterHandle.tsx — Draggable resize handles
 *
 * Renders a thin, hoverable handle for resizing adjacent panels.
 * Provides visual feedback (highlight on hover) and supports both
 * mouse and touch interactions.
 *
 * Usage:
 *   <SplitterHandle
 *     direction="vertical"
 *     onDragStart={(e) => handleVerticalDragStart(e, containerWidth)}
 *     isDragging={isDragging}
 *   />
 */

"use client";

import React from "react";

interface SplitterHandleProps {
  direction: "vertical" | "horizontal";
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isDragging: boolean;
}

export default function SplitterHandle({
  direction,
  onDragStart,
  isDragging,
}: SplitterHandleProps) {
  const isVertical = direction === "vertical";

  return (
    <div
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      className={`
        select-none transition-colors
        ${
          isDragging
            ? isVertical
              ? "bg-phosphor-dim hover:bg-phosphor-dim"
              : "bg-phosphor-dim hover:bg-phosphor-dim"
            : isVertical
              ? "bg-rim hover:bg-phosphor-dim/40"
              : "bg-rim hover:bg-phosphor-dim/40"
        }
        ${isVertical ? "w-1 h-full cursor-col-resize" : "h-1 w-full cursor-row-resize"}
      `}
    />
  );
}
