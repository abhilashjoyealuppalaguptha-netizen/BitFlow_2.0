/**
 * lib/health-race.ts: answer the simulator health check as soon as ONE instance is healthy.
 *
 * Every instance is still pinged at once (that is what wakes a sleeping free instance), but the
 * reply no longer waits for the slowest: with an always-on host next to sleeping ones, the
 * check used to take as long as the slowest wake-up (about a minute).
 */

export interface HealthResult { ok: boolean; status: number; data: any; ms: number }

/**
 * Start `check(url)` for every url. Resolve with the results so far (null = still running) as soon
 * as one is ok, or when all have finished. Checks left running keep going; they never reject.
 */
export function raceHealth(urls: string[], check: (url: string) => Promise<HealthResult>): Promise<(HealthResult | null)[]> {
  return new Promise((resolve) => {
    const results: (HealthResult | null)[] = urls.map(() => null);
    if (!urls.length) return resolve(results);
    let left = urls.length, done = false;
    urls.forEach((url, i) => {
      const t0 = Date.now();
      check(url).catch((err: any): HealthResult => ({ ok: false, status: 502, data: { status: "unreachable", error: err?.message }, ms: Date.now() - t0 }))
        .then((r) => {
          results[i] = r;
          left--;
          if (!done && (r.ok || left === 0)) { done = true; resolve([...results]); }
        });
    });
  });
}
