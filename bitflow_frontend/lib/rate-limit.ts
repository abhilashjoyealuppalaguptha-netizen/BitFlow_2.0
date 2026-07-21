/**
 * lib/rate-limit.ts
 *
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window per IP address.
 *
 * Usage:
 *   const { success } = await rateLimit(request, { limit: 10, windowMs: 60_000 });
 *   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — resets on server restart (fine for Render, not for serverless)
const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in ms (e.g. 60_000 = 1 minute) */
  windowMs: number;
  /** Optional key prefix to namespace different routes */
  prefix?: string;
}

export function rateLimit(
  request: Request,
  options: RateLimitOptions
): { success: boolean; remaining: number; resetAt: number } {
  const { limit, windowMs, prefix = "rl" } = options;

  // Derive IP from headers (Render/Vercel set x-forwarded-for)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const key = `${prefix}:${ip}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in this window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
