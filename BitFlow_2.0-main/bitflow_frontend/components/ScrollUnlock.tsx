"use client";
/**
 * components/ScrollUnlock.tsx
 *
 * Adds `page-scrollable` to <html> when mounted (Learn page, etc.)
 * and removes it on unmount (when navigating back to the IDE).
 *
 * This is needed because globals.css sets `overflow: hidden` on html/body
 * for the IDE layout — scrollable pages must opt out.
 */
import { useEffect } from "react";

export default function ScrollUnlock() {
  useEffect(() => {
    document.documentElement.classList.add("page-scrollable");
    return () => {
      document.documentElement.classList.remove("page-scrollable");
    };
  }, []);
  return null;
}