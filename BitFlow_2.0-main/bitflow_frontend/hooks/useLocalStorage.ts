/**
 * hooks/useLocalStorage.ts — Debounced localStorage state hook
 *
 * Drop-in replacement for useState that additionally:
 *   1. Reads the initial value from localStorage on mount (SSR-safe).
 *   2. Writes back to localStorage on every change, debounced by `delayMs`.
 *
 * ─── Why debounce? ────────────────────────────────────────────────────────────
 * Monaco fires onChange on every single keystroke.  Writing to localStorage
 * synchronously on every keystroke would:
 *   • Serialize the full editor content (potentially 10 KB+) on every char
 *   • Block the main thread for ~0.1–0.5 ms per keystroke on large files
 *   • Cause noticeable typing lag on slower machines
 *
 * 500 ms debounce means the last write fires ≤500 ms after typing stops.
 * The ref pattern (timer stored in useRef) means the timer is cleared
 * correctly on unmount — no stale writes after the component is gone.
 *
 * ─── SSR safety ───────────────────────────────────────────────────────────────
 * Next.js renders pages on the server where `window` and `localStorage` don't
 * exist.  We guard every access with `typeof window !== "undefined"` so the
 * hook returns the defaultValue on the server and hydrates correctly on the
 * client without a mismatch.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *   const [code, setCode] = useLocalStorage("design_v", DEFAULT_DESIGN);
 *   // code and setCode behave identically to useState
 *   // code is additionally persisted to localStorage key "design_v"
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param key        localStorage key — must be unique across the app
 * @param defaultVal value used when no stored value exists
 * @param delayMs    debounce delay in milliseconds (default 500)
 */
export function useLocalStorage<T>(
  key:        string,
  defaultVal: T,
  delayMs     = 500,
): [T, (value: T | ((prev: T) => T)) => void] {

  // ── Initial value ──────────────────────────────────────────────────────────

  /**
   * Lazy initialiser — called once by useState on the first render.
   * Avoids a JSON.parse on every render cycle.
   *
   * The `typeof window` guard makes this safe during SSR (Next.js server render).
   */
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultVal;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultVal;
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted JSON or security error — fall back silently
      return defaultVal;
    }
  });

  // ── Debounce infrastructure ────────────────────────────────────────────────

  /**
   * timerRef: holds the id of the pending setTimeout.
   * Using a ref (not state) means updating the timer never triggers a re-render.
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Write to localStorage after the debounce delay.
   * Clears any pending write when a new value arrives.
   */
  const debouncedWrite = useCallback(
    (value: T) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (typeof window === "undefined") return;
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // QuotaExceededError or similar — silently ignore.
          // The in-memory state is still correct; only persistence fails.
        }
        timerRef.current = null;
      }, delayMs);
    },
    [key, delayMs],
  );

  /**
   * Flush: clear the pending timer on unmount to prevent writing stale
   * values after the component has been torn down.
   */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Key change: reload from storage ────────────────────────────────────────

  /**
   * If the key prop changes (unusual but possible), re-read from storage.
   * This also covers the case where the same hook instance is reused with
   * a different key between renders.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setStoredValue(JSON.parse(raw) as T);
    } catch {
      // Ignore — keep current in-memory value
    }
  }, [key]);

  // ── Setter ────────────────────────────────────────────────────────────────

  /**
   * setValue: identical signature to React's useState setter.
   * Accepts both a new value and a functional update form: setValue(v => v + 1).
   *
   * Updates in-memory state synchronously (like useState) so the UI is
   * never blocked by the localStorage write.
   */
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;
        debouncedWrite(next);
        return next;
      });
    },
    [debouncedWrite],
  );

  return [storedValue, setValue];
}