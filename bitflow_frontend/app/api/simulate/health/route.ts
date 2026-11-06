import { NextResponse } from "next/server";
import { backendUrls } from "@/lib/backend";
import { raceHealth, type HealthResult } from "@/lib/health-race";

export const dynamic = "force-dynamic";

async function check(url: string): Promise<HealthResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/health`, { cache: "no-store" });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: "unreachable", error: text.trim() || res.statusText };
    }
    return { ok: res.ok, status: res.status, data, ms: Date.now() - t0 };
  } catch (err: any) {
    return { ok: false, status: 502, data: { status: "unreachable", error: err?.message }, ms: Date.now() - t0 };
  }
}

/**
 * Health of the simulator. With several instances (BACKEND_URLS) every one is pinged at once, which
 * also wakes each from sleep, but the answer comes as soon as ONE is healthy (lib/health-race.ts):
 * an always-on host no longer waits for a sleeping one. `instances` says which have answered
 * (`pending: true` = still waking). URLs are left out of the reply on purpose: they are server-side config.
 */
export async function GET() {
  let urls: string[];
  try {
    urls = backendUrls();
  } catch (err: any) {
    return NextResponse.json({ status: "unreachable", error: err?.message }, { status: 502 });
  }
  const results = await raceHealth(urls, check);
  const healthy = results.find((r) => r?.ok);
  const finished = results.filter((r): r is HealthResult => r !== null);
  const main = healthy ?? finished[finished.length - 1];
  const body = {
    ...main.data,
    instances: results.map((r, index) => (r ? { index, ok: r.ok, status: r.status, ms: r.ms } : { index, ok: false, pending: true })),
  };
  return NextResponse.json(body, { status: healthy ? 200 : main.status });
}
