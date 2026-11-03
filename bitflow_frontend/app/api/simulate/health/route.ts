import { NextResponse } from "next/server";
import { backendUrls } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; status: number; data: any };

async function check(url: string): Promise<Check> {
  try {
    const res = await fetch(`${url}/health`, { cache: "no-store" });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: "unreachable", error: text.trim() || res.statusText };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 502, data: { status: "unreachable", error: err?.message } };
  }
}

/**
 * Health of the simulator. With several instances (BACKEND_URLS) every one is checked at
 * once, which also wakes each from sleep; the answer is OK when any instance is. URLs are
 * left out of the reply on purpose: they are server-side config.
 */
export async function GET() {
  let urls: string[];
  try {
    urls = backendUrls();
  } catch (err: any) {
    return NextResponse.json({ status: "unreachable", error: err?.message }, { status: 502 });
  }
  const checks = await Promise.all(urls.map(check));
  const healthy = checks.find((c) => c.ok);
  const main = healthy ?? checks[checks.length - 1];
  const body = {
    ...main.data,
    instances: checks.map((c, index) => ({ index, ok: c.ok, status: c.status })),
  };
  return NextResponse.json(body, { status: healthy ? 200 : main.status });
}
