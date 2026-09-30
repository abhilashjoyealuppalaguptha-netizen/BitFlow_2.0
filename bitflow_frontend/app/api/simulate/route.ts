/**
 * app/api/simulate/route.ts — Secure server-side proxy to FastAPI
 *
 * Why this exists:
 *   The browser calls this Next.js API route (no JWT needed — session cookie
 *   handles browser auth). This route then generates a short-lived JWT and
 *   forwards the request to the FastAPI backend with the token attached.
 *
 *   This way:
 *   1. The JWT_SECRET never reaches the browser.
 *   2. External users cannot call FastAPI directly (no valid JWT).
 *   3. The browser never needs to know about JWTs at all.
 */

import { NextResponse } from "next/server";
import { generateBackendJwt } from "@/lib/jwt";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://bitflow-backend-uyji.onrender.com"
    : "http://127.0.0.1:8000");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = generateBackendJwt();

    const backendResponse = await fetch(`${BACKEND_URL}/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await backendResponse.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText.trim() || backendResponse.statusText || "Backend error" };
    }

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (err: any) {
    console.error("[Simulate Proxy] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reach simulation backend" },
      { status: 502 }
    );
  }
}
