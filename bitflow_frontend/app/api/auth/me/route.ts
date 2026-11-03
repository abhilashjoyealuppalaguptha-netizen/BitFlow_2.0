import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { hasPassword } from "@/lib/oauth";
import { reportError } from "@/lib/error-log";
import { canUseAi, guardianPending, isMinor, needsConsent } from "@/lib/privacy";

export const dynamic = "force-dynamic";

// The signed-in user plus the privacy flags the UI acts on (lib/privacy.ts).
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null });
    // For the profile's Connected accounts (components/AccountSecurity.tsx).
    const login = await prisma.user.findUnique({
      where: { id: user.id }, select: { password: true, oauthAccounts: { select: { provider: true } } },
    });
    return NextResponse.json({
      user: {
        ...user,
        oauth:           login?.oauthAccounts.map((a) => a.provider) ?? [],
        hasPassword:     login ? hasPassword(login.password) : true,
        minor:           isMinor(user),
        needsConsent:    needsConsent(user),
        guardianPending: guardianPending(user),
        aiAllowed:       canUseAi(user),
      },
    });
  } catch (err) {
    await reportError("Session fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
