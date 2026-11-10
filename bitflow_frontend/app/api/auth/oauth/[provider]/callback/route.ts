import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUser } from "@/lib/auth-utils";
import { reportError } from "@/lib/error-log";
import { audit } from "@/lib/privacy-server";
import { safeNext } from "@/lib/site";
import { FLOW_COOKIE, NO_PASSWORD, decodeFlow, fetchIdentity, stateMatches, uniqueUsername } from "@/lib/oauth";

export const dynamic = "force-dynamic";

/**
 * Where Google/GitHub send the browser back. Signs in the account connected to this identity,
 * or connects it to the signed-in account (?link=1 at the start), or makes a new student account
 * (no age or consent yet: components/ConsentGate.tsx asks for those and the username first).
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const url = new URL(request.url);
  const flow = decodeFlow(cookies().get(FLOW_COOKIE)?.value);
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, url.origin));
    res.cookies.set(FLOW_COOKIE, "", { maxAge: 0, path: "/api/auth/oauth" });   // single use
    return res;
  };
  const back = flow?.link ? "/profile" : "/login";
  const fail = (code: string) => go(`${back}?error=${code}`);

  if (url.searchParams.get("error")) return fail("cancelled");   // the person said no at the provider
  const code = url.searchParams.get("code");
  if (!stateMatches(flow, params.provider, url.searchParams.get("state")) || !code) return fail("state");

  try {
    const identity = await fetchIdentity(flow, code, url.origin);
    const where = { provider_providerAccountId: { provider: flow.provider, providerAccountId: identity.id } };
    const existing = await prisma.oAuthAccount.findUnique({ where, select: { user: { select: { id: true, role: true, bannedAt: true } } } });

    if (flow.link) {
      const me = await getSessionUser();
      if (!me) return go("/login?error=signin");
      if (existing) return existing.user.id === me.id ? go(`/profile?linked=${flow.provider}`) : fail("taken");
      if (await prisma.oAuthAccount.findFirst({ where: { userId: me.id, provider: flow.provider } })) return fail("already");
      await prisma.oAuthAccount.create({ data: { provider: flow.provider, providerAccountId: identity.id, userId: me.id } });
      await audit(me.id, "oauth.connected", me.id, flow.provider);
      return go(`/profile?linked=${flow.provider}`);
    }

    let user = existing?.user;
    if (user?.bannedAt) return fail("banned");
    if (!user) {
      const username = await uniqueUsername(identity.suggestion,
        async (name) => !!(await prisma.user.findUnique({ where: { username: name }, select: { id: true } })));
      user = await prisma.user.create({
        data: {
          username,
          password: NO_PASSWORD,
          usernamePending: true,
          oauthAccounts: { create: { provider: flow.provider, providerAccountId: identity.id } },
          xp: { create: { totalXp: 0, unlockedModules: JSON.stringify(["mod_logic_gates", "mod_arithmetic"]) } },
        },
        select: { id: true, role: true, bannedAt: true },
      });
      await audit(user.id, "oauth.signup", user.id, flow.provider);
    }
    await createSession(user.id);
    return go(safeNext(flow.next, user.role));
  } catch (err) {
    await reportError(`OAuth ${params.provider} callback error:`, err);
    return fail("provider");
  }
}
