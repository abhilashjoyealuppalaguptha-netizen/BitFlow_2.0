/**
 * lib/oauth.ts — "Continue with Google / GitHub": the authorization-code flow with PKCE. Server only.
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   Google Cloud OAuth client ("Web application")
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET   GitHub OAuth App
 *
 * A provider without both values is off and its button is hidden. Redirect URI to register:
 * <origin>/api/auth/oauth/<provider>/callback. Only the provider's account id is stored
 * (prisma OAuthAccount); the email or login is used once, to suggest a username.
 * The pure helpers below are checked by scripts/oauth.check.ts.
 */
import crypto from "crypto";

export type Provider = "google" | "github";
export const PROVIDERS: Provider[] = ["google", "github"];
export const isProvider = (p: string): p is Provider => (PROVIDERS as string[]).includes(p);

/** Stored as the password of accounts made by Google/GitHub sign-in: never matches (lib/auth-utils.ts verifyPassword). */
export const NO_PASSWORD = "oauth-only";
export const hasPassword = (stored: string) => stored !== NO_PASSWORD;

const CONFIG: Record<Provider, { authorize: string; token: string; scope: string; env: string }> = {
  google: { authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "openid email", env: "GOOGLE" },
  github: { authorize: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", scope: "", env: "GITHUB" },
};

function credentials(p: Provider) {
  const id = process.env[`${CONFIG[p].env}_CLIENT_ID`], secret = process.env[`${CONFIG[p].env}_CLIENT_SECRET`];
  return id && secret ? { id, secret } : null;
}
export const enabledProviders = () => PROVIDERS.filter((p) => credentials(p));

// ── The flow's cookie: state + PKCE verifier + where to go afterwards ─────────

export const FLOW_COOKIE = "bitflow_oauth";
export const FLOW_TTL_S = 600;
export interface Flow { provider: Provider; state: string; verifier: string; next: string | null; link: boolean }

const b64url = (b: Buffer) => b.toString("base64url");
export const newFlow = (provider: Provider, next: string | null, link: boolean): Flow =>
  ({ provider, state: b64url(crypto.randomBytes(24)), verifier: b64url(crypto.randomBytes(32)), next, link });
export const encodeFlow = (f: Flow) => b64url(Buffer.from(JSON.stringify(f)));
export function decodeFlow(raw: string | undefined): Flow | null {
  try {
    const f = JSON.parse(Buffer.from(raw ?? "", "base64url").toString());
    return isProvider(f?.provider) && typeof f.state === "string" && typeof f.verifier === "string" ? f : null;
  } catch { return null; }
}
/** The callback's state must match the cookie's, in constant time. */
export function stateMatches(flow: Flow | null, provider: string, state: string | null): flow is Flow {
  if (!flow || flow.provider !== provider || !state) return false;
  const a = Buffer.from(flow.state), b = Buffer.from(state);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const redirectUri = (p: Provider, origin: string) => `${origin}/api/auth/oauth/${p}/callback`;

export function authorizeUrl(flow: Flow, origin: string): string {
  const c = CONFIG[flow.provider];
  const q = new URLSearchParams({
    client_id: credentials(flow.provider)!.id,
    redirect_uri: redirectUri(flow.provider, origin),
    response_type: "code",
    state: flow.state,
    code_challenge: b64url(crypto.createHash("sha256").update(flow.verifier).digest()),
    code_challenge_method: "S256",
    ...(c.scope ? { scope: c.scope } : {}),
    ...(flow.provider === "google" ? { prompt: "select_account" } : { allow_signup: "true" }),
  });
  return `${c.authorize}?${q}`;
}

/** Trade the code for a token and read who signed in. Throws on any provider error. */
export async function fetchIdentity(flow: Flow, code: string, origin: string): Promise<{ id: string; suggestion: string }> {
  const creds = credentials(flow.provider);
  if (!creds) throw new Error(`${flow.provider} sign-in is not configured`);
  const res = await fetch(CONFIG[flow.provider].token, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.id, client_secret: creds.secret, code, code_verifier: flow.verifier,
      redirect_uri: redirectUri(flow.provider, origin), grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const token = (await res.json().catch(() => ({})))?.access_token;
  if (!res.ok || typeof token !== "string") throw new Error(`${flow.provider} token exchange failed (${res.status})`);

  const profileUrl = flow.provider === "google" ? "https://openidconnect.googleapis.com/v1/userinfo" : "https://api.github.com/user";
  const p = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "BitFlow" },
    signal: AbortSignal.timeout(10_000),
  });
  const me = await p.json().catch(() => ({}));
  const id = flow.provider === "google" ? me?.sub : me?.id;
  if (!p.ok || (typeof id !== "string" && typeof id !== "number")) throw new Error(`${flow.provider} profile fetch failed (${p.status})`);
  const suggestion = flow.provider === "google" ? String(me.email ?? "").split("@")[0] : String(me.login ?? "");
  return { id: String(id), suggestion };
}

// ── Usernames and disconnecting ───────────────────────────────────────────────

/** A starting username from a GitHub login or an email's local part, fitting usernameProblem (max 20, room for digits). */
export function suggestUsername(raw: string): string {
  const base = raw.replace(/[^A-Za-z0-9_.-]/g, "").replace(/^[.-]+|[.-]+$/g, "").slice(0, 20);
  return base.length >= 3 ? base : "student";
}

/** The suggestion, or the suggestion plus 4 digits, that isn't taken yet. */
export async function uniqueUsername(raw: string, taken: (name: string) => Promise<boolean>): Promise<string> {
  const base = suggestUsername(raw);
  if (!(await taken(base))) return base;
  for (let i = 0; i < 20; i++) {
    const name = `${base}${crypto.randomInt(1000, 10000)}`;
    if (!(await taken(name))) return name;
  }
  return `student${crypto.randomBytes(6).toString("hex")}`;   // 19 chars, effectively never taken
}

/** Disconnecting must leave a way to sign in: a password, or another connected provider. */
export const canDisconnect = (a: { hasPassword: boolean; providers: string[] }, provider: string) =>
  a.providers.includes(provider) && (a.hasPassword || a.providers.some((p) => p !== provider));
