"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import ConsentFields, { type ConsentValue } from "@/components/ConsentFields";
import LoginBackground from "@/components/login/LoginBackground";
import Bitzy, { type Mood } from "@/components/login/Bitzy";
import PasswordInput from "@/components/login/PasswordInput";

type Field = "username" | "password" | "secret" | null;
type Status = "idle" | "loading" | "success" | "error";

/** ?next= when it is a path on this site (never another origin), else the account's home. */
function destination(next: string | null, role: string) {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return role === "ADMIN" ? "/admin" : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register } = useAuth();

  // The URL is the source of truth: /login, /login?mode=register, /login?mode=register&as=admin.
  const isSignUp = params.get("mode") === "register";
  const asAdmin = isSignUp && params.get("as") === "admin";
  const tabHref = (signUp: boolean) => {
    const p = new URLSearchParams(params.toString());
    if (signUp) p.set("mode", "register");
    else { p.delete("mode"); p.delete("as"); }
    const q = p.toString();
    return q ? `/login?${q}` : "/login";
  };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretPassword, setSecretPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  // What Bitzy reacts to.
  const [focus, setFocus] = useState<Field>(null);
  const [shown, setShown] = useState({ password: false, secret: false });
  const [capsLock, setCapsLock] = useState(false);
  const [hoverSubmit, setHoverSubmit] = useState(false);

  // Sign-up spam protection (lib/bot-check.ts): a timed form token + honeypot.
  const [formToken, setFormToken] = useState("");
  const [website, setWebsite] = useState("");
  // DPDP: month/year of birth and acceptance of the notice (components/ConsentFields.tsx).
  const [consent, setConsent] = useState<ConsentValue>({ consent: false });

  useEffect(() => {
    setErrorMsg(null);
    if (!isSignUp) return;
    fetch("/api/auth/register").then((r) => r.json()).then((d) => setFormToken(d.formToken ?? "")).catch(() => {});
  }, [isSignUp]);

  const fail = (message: string) => {
    setErrorMsg(message);
    setStatus("error");
    setTimeout(() => setStatus((s) => (s === "error" ? "idle" : s)), 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus("loading");
    try {
      const res = isSignUp
        ? await register(username, password, asAdmin ? "ADMIN" : "STUDENT", asAdmin ? secretPassword : undefined, { formToken, website }, consent)
        : await login(username, password);
      if (res.error || !res.user) {
        if (asAdmin && res.error?.toLowerCase().includes("secret password")) setSecretPassword("");
        return fail(res.error ?? "Login failed");
      }
      setStatus("success");
      const go = destination(params.get("next"), res.user.role);
      // Let Bitzy celebrate for a moment, unless motion is reduced.
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => router.push(go), still ? 0 : 650);
    } catch {
      fail("An unexpected error occurred. Please try again.");
    }
  };

  const inPassword = focus === "password" || focus === "secret";
  const mood: Mood =
    status === "error" ? "error"
    : status === "success" ? "success"
    : status === "loading" ? "loading"
    : inPassword && capsLock ? "surprised"
    : inPassword && shown[focus] ? "peek"
    : inPassword ? "shy"
    : hoverSubmit ? "excited"
    : focus === "username" && username ? "curious"
    : "idle";

  const caption = {
    error: "Access denied!",
    success: isSignUp ? "Profile compiled!" : "Access granted!",
    loading: "Decrypting…",
    surprised: "Caps Lock detected!",
    peek: "Just a peek…",
    shy: "Encrypting input…",
    excited: isSignUp ? "Ready to register!" : "Ready to authorize!",
    curious: "Scanning ID…",
    idle: "Hey Hello!! I'm Bitzy 👋",
  }[mood];

  const busy = status === "loading" || status === "success";
  const tab = (active: boolean) =>
    `flex-1 py-1.5 rounded-md text-center text-[11px] font-semibold tracking-wider uppercase transition-colors duration-150 ${
      active ? "bg-phosphor/10 text-phosphor border border-phosphor/30" : "text-ghost hover:text-pale border border-transparent"
    }`;

  return (
    <div className="relative min-h-screen bg-void overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-bright">
      <style>{`
        .bf-input:-webkit-autofill,
        .bf-input:-webkit-autofill:hover,
        .bf-input:-webkit-autofill:focus,
        .bf-input:-webkit-autofill:active {
          -webkit-text-fill-color: #e8eaf6;
          -webkit-box-shadow: 0 0 0px 1000px #141a15 inset;
          box-shadow: 0 0 0px 1000px #141a15 inset;
          transition: background-color 9999s ease-in-out 0s;
          caret-color: #e8eaf6;
        }
      `}</style>
      <LoginBackground />

      <Link href="/" className="relative z-10 font-display font-bold text-lg text-bright hover:text-phosphor transition-colors mb-8">
        BitFlow
      </Link>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-[0.85fr_1fr] bg-pit/90 backdrop-blur-xl border border-phosphor/25 rounded-[20px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(0,232,122,0.08)]">
        <Bitzy mood={mood} lookX={username.length / 12 - 1} caption={caption} />

        <div className="p-6 sm:p-8 md:p-10 flex flex-col">
          <nav aria-label="Sign in or register" className="flex bg-shaft border border-rim/60 rounded-lg p-1 mb-6">
            <Link href={tabHref(false)} scroll={false} aria-current={!isSignUp ? "page" : undefined} className={tab(!isSignUp)}>
              Sign in
            </Link>
            <Link href={tabHref(true)} scroll={false} aria-current={isSignUp ? "page" : undefined} className={tab(isSignUp)}>
              Register
            </Link>
          </nav>

          <h1 className="font-serif text-2xl text-bright mb-1">
            {asAdmin ? "Admin registration" : isSignUp ? "Create your account" : "Welcome back!"}
          </h1>
          <p className="text-[12.5px] text-ghost mb-6">
            {asAdmin ? "Initialise admin credentials with the system key" : isSignUp ? "Set up a new BitFlow profile" : "Enter your login details to continue to BitFlow"}
          </p>

          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-[11px] mb-5 flex gap-2">
              <span className="font-bold">⚠ ERROR:</span>
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[11px] text-pale mb-1.5">Username</label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                {...(isSignUp && {
                  minLength: 3,
                  maxLength: 24,
                  pattern: "(?:[A-Za-z0-9_.]|-){3,24}",   // = usernameProblem(); no "-" inside the class (v-flag rules)
                  title: "3–24 characters: letters, numbers, dots, dashes and underscores",
                })}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocus("username")}
                onBlur={() => setFocus(null)}
                placeholder="e.g. system_operator"
                className="bf-input w-full bg-[#141a15] border border-rim rounded-lg px-3.5 py-2.5 text-[13px] text-bright placeholder-dim/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:outline-none focus:border-phosphor transition-colors"
              />
            </div>

            <div>
              <PasswordInput
                id="password"
                label="Password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                {...(isSignUp && { minLength: 8, maxLength: 200 })}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus(null)}
                onShownChange={(v) => setShown((s) => ({ ...s, password: v }))}
                onCapsLock={setCapsLock}
                placeholder="••••••••"
              />
              <div className="flex items-center justify-between gap-3 mt-1.5 min-h-[16px] text-[11px]">
                <span role="status" className="text-warn">{inPassword && capsLock ? "Caps Lock is on" : ""}</span>
                {!isSignUp && (
                  <Link href="/reset-password" className="text-phosphor hover:text-phosphor-glow transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
            </div>

            {asAdmin && (
              <PasswordInput
                id="admin-secret"
                label="Secret Admin Key"
                admin
                required
                value={secretPassword}
                onChange={(e) => setSecretPassword(e.target.value)}
                onFocus={() => setFocus("secret")}
                onBlur={() => setFocus(null)}
                onShownChange={(v) => setShown((s) => ({ ...s, secret: v }))}
                onCapsLock={setCapsLock}
                placeholder="Enter system master password"
                hint="Required for admin credentials initialization."
              />
            )}

            {isSignUp && <ConsentFields value={consent} onChange={setConsent} />}

            {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
            {isSignUp && (
              <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off"
                       value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              onMouseEnter={() => setHoverSubmit(true)}
              onMouseLeave={() => setHoverSubmit(false)}
              onFocus={() => setHoverSubmit(true)}
              onBlur={() => setHoverSubmit(false)}
              className={`w-full py-3 rounded-lg text-[13px] font-bold tracking-wide uppercase transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                asAdmin ? "bg-info text-void hover:bg-info/85" : "bg-phosphor text-void hover:bg-phosphor-glow"
              }`}
            >
              {status === "loading" ? "Decrypting..." : status === "success" ? "Access granted" : isSignUp ? "Create Profile" : "Authorize"}
            </button>
            {isSignUp && (
              <p className="text-[11px] text-ghost text-center">
                Using BitFlow also means following the{" "}
                <Link href="/terms" className="text-phosphor hover:underline">Terms</Link>.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
