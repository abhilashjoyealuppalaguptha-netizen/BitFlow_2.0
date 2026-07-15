/**
 * lib/export-image.ts — LinkedIn-ready PNG snapshot export
 *
 * WHY THE CLONE-CAPTURE-REMOVE PATTERN?
 * ───────────────────────────────────────
 * html-to-image serialises the DOM to SVG via foreignObject, then draws
 * it to a <canvas>.  It reads computed styles at capture time.
 *
 * Capturing an element that has:
 *   • position:fixed at left:-9999px  →  scrollWidth may return 0
 *   • zIndex:-1                       →  element rendered behind page backdrop
 *   • a parent with overflow:hidden   →  content clipped in computed layout
 *
 * All three conditions applied to the previous ExportCard, causing blank PNGs.
 *
 * The reliable pattern:
 *   1. Deep-clone the element (preserves all inline styles + SVG content).
 *   2. Override the clone's positioning to static inside a fixed container
 *      that is off-screen vertically (top:-9999px) — fully laid out by the
 *      browser, no z-index stacking issue, correct scrollWidth/scrollHeight.
 *   3. Capture the clone with html-to-image.
 *   4. Remove the container.
 *
 * This approach is independent of where the live element is positioned,
 * so ExportCard no longer needs to manage its own off-screen placement.
 *
 * TODO: Add clipboard copy (navigator.clipboard.write) as an alternative.
 */

/**
 * Capture `element` as a 2× retina PNG and trigger a browser download.
 *
 * @param element  — The ExportCard DOM node (ref.current)
 * @param filename — Override filename; defaults to bitflow_snapshot_YYYY-MM-DD.png
 */
export async function exportSnapshotPng(
  element:   HTMLElement,
  filename?: string,
): Promise<void> {
  if (!element) throw new Error("ExportCard element is not mounted.");

  // ── Step 1: lazy-load html-to-image ────────────────────────────────────────
  const { toPng } = await import("html-to-image");

  // ── Step 2: create a capture container off the visible viewport ────────────
  //
  // position:fixed at top:-9999px, left:0 means:
  //   • The browser performs full layout (computes widths, heights, wrapping).
  //   • scrollWidth / scrollHeight return the true content dimensions.
  //   • No z-index conflict with the page — it's a new stacking context.
  //   • Not visible to the user (1px past the top edge of the viewport).
  //
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:0",
    "z-index:99999",
    "pointer-events:none",
    "overflow:visible",
  ].join(";");
  document.body.appendChild(container);

  // ── Step 3: deep-clone the ExportCard node ─────────────────────────────────
  //
  // cloneNode(true) copies all child nodes and their inline styles.
  // ExportCard uses only inline styles (no Tailwind classes) specifically so
  // the clone captures correctly without needing the JIT stylesheet.
  //
  const clone = element.cloneNode(true) as HTMLElement;

  // Override the self-positioning styles that were on the original element.
  // These are no longer needed because the container handles off-screen placement.
  clone.style.position      = "static";
  clone.style.left          = "auto";
  clone.style.top           = "auto";
  clone.style.zIndex        = "auto";
  clone.style.pointerEvents = "none";
  clone.style.opacity       = "1";

  container.appendChild(clone);

  // ── Step 4: wait two animation frames ──────────────────────────────────────
  //
  // One rAF commits the DOM append.  The second rAF ensures the browser has
  // completed layout and paint for the new subtree.  Without this, SVG paths
  // and text nodes may report incorrect bounding boxes.
  //
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  // ── Step 5: capture ────────────────────────────────────────────────────────
  try {
    const w = clone.scrollWidth  || CARD_WIDTH_FALLBACK;
    const h = clone.scrollHeight || 600;

    const dataUrl = await toPng(clone, {
      pixelRatio:  2,        // 2× → retina quality for LinkedIn / Twitter
      width:       w,
      height:      h,
      // Skip external font inlining — fonts are in browser cache from Google Fonts.
      // Attempting to inline them triggers CORS fetch failures.
      skipFonts:   true,
      // Bust the image cache so stale SVG snapshots don't appear.
      cacheBust:   true,
      // Explicit background — prevents transparent captures if the element
      // background style is dropped during clone serialisation.
      backgroundColor: "#07080a",
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(dataUrl, filename ?? `bitflow_snapshot_${dateStr}.png`);
  } finally {
    // ── Step 6: always clean up ───────────────────────────────────────────────
    document.body.removeChild(container);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback dimensions (used if clone is not yet laid out when scrollWidth=0)
// ─────────────────────────────────────────────────────────────────────────────

/** Matches CARD_WIDTH in ExportCard.tsx */
const CARD_WIDTH_FALLBACK = 900;

// ─────────────────────────────────────────────────────────────────────────────
// Download trigger
// ─────────────────────────────────────────────────────────────────────────────

function triggerDownload(dataUrl: string, filename: string): void {
  const link     = document.createElement("a");
  link.href      = dataUrl;
  link.download  = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}