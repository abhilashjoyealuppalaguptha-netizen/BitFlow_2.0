import { NextResponse } from "next/server";
import { enabledProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

/** Which "Continue with …" buttons the login page shows (lib/oauth.ts). */
export function GET() {
  return NextResponse.json({ providers: enabledProviders() });
}
