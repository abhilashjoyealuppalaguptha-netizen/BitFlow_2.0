import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/privacy-server";
import {
  FLOW_COOKIE, FLOW_TTL_S, authorizeUrl, canDisconnect, enabledProviders, encodeFlow, hasPassword, isProvider, newFlow,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/** Start "Continue with <provider>": remember state + PKCE in a short cookie and send the browser to the provider.
 *  ?next= is where to land afterwards; ?link=1 connects the provider to the signed-in account instead. */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const url = new URL(request.url);
  const { provider } = params;
  if (!isProvider(provider) || !enabledProviders().includes(provider)) {
    return NextResponse.redirect(new URL("/login?error=disabled", url.origin));
  }
  const { success } = await rateLimit(request, { limit: 20, windowMs: 60_000, prefix: "oauth" });
  if (!success) return NextResponse.redirect(new URL("/login?error=busy", url.origin));

  const flow = newFlow(provider, url.searchParams.get("next"), url.searchParams.get("link") === "1");
  const res = NextResponse.redirect(authorizeUrl(flow, url.origin));
  res.cookies.set(FLOW_COOKIE, encodeFlow(flow), {
    httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: FLOW_TTL_S, path: "/api/auth/oauth",
  });
  return res;
}

/** Disconnect <provider> from the signed-in account, unless it's the only way left to sign in. */
export async function DELETE(_request: Request, { params }: { params: { provider: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: me.id }, select: { password: true, oauthAccounts: { select: { provider: true } } },
  });
  const providers = user?.oauthAccounts.map((a) => a.provider) ?? [];
  if (!user || !canDisconnect({ hasPassword: hasPassword(user.password), providers }, params.provider)) {
    return NextResponse.json(
      { error: providers.includes(params.provider) ? "This is your only way to sign in, so it can't be disconnected." : "That account isn't connected." },
      { status: 400 },
    );
  }
  await prisma.oAuthAccount.deleteMany({ where: { userId: me.id, provider: params.provider } });
  await audit(me.id, "oauth.disconnected", me.id, params.provider);
  return NextResponse.json({ ok: true });
}
