"use client";
/**
 * components/ConsentGate.tsx — DPDP prompts (lib/privacy.ts).
 *
 * ConsentGate (root layout): a signed-in account that hasn't accepted the current notice
 * (accounts made before it, or after the notice changes) is asked before going on; an
 * account without an age also gives its month and year of birth.
 * GuardianPanel (dashboard, profile): an under-18 account gets the link to send a parent.
 */
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ConsentFields, { type ConsentValue } from "@/components/ConsentFields";

export default function ConsentGate() {
  const { user, checkSession, logout } = useAuth();
  const [value, setValue] = useState<ConsentValue>({ consent: false });
  const [username, setUsername] = useState<string | null>(null);   // null: not edited, show the suggestion
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user?.needsConsent) return null;
  const askBirth = !(user as { birthYear?: number | null }).birthYear;
  const askName = !!user.usernamePending;   // made by Google/GitHub sign-in
  const name = username ?? user.username;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = askName ? { ...value, username: name } : value;
      const res = await fetch("/api/privacy/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "That didn't work. Please try again.");
      else await checkSession();
    } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="fixed inset-0 z-[100] bg-void/90 backdrop-blur overflow-y-auto flex p-4">
      {/* m-auto centres it when it fits and lets the overlay scroll when it doesn't (short screens) */}
      <form onSubmit={submit} className="m-auto w-full max-w-md rounded-xl border border-rim bg-pit p-5 space-y-4 font-mono">
        <h2 id="consent-title" className="text-[15px] font-bold text-bright">{askName ? "Welcome to BitFlow" : "Our privacy notice"}</h2>
        {askName && (
          <div>
            <label htmlFor="consent-username" className="block text-[12px] text-pale mb-1">Choose your username</label>
            <input
              id="consent-username" type="text" required minLength={3} maxLength={24} autoComplete="username"
              pattern="(?:[A-Za-z0-9_.]|-){3,24}" title="3–24 characters: letters, numbers, dots, dashes and underscores"
              value={name} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-void border border-rim rounded-lg px-3 py-2 text-[13px] text-bright focus:outline-none focus:border-phosphor"
            />
            <p className="text-[11px] text-dim mt-1">Shown on the leaderboard and to your classes. You can&apos;t change it later.</p>
          </div>
        )}
        <p className="text-[12px] text-ghost leading-relaxed">
          India&apos;s Digital Personal Data Protection Act asks us to tell you what we keep and why, and to get your agreement.
          Please read the <Link href="/privacy" target="_blank" className="text-phosphor hover:underline">privacy notice</Link>
          {askBirth ? ", tell us your month and year of birth," : ""} and confirm to carry on.
        </p>
        <ConsentFields value={value} onChange={setValue} askBirth={askBirth} />
        {error && <p role="alert" className="text-[12px] text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-phosphor text-void text-[12px] font-bold disabled:opacity-50">Agree and continue</button>
          <button type="button" onClick={() => logout()} className="px-3 py-2 rounded-lg border border-rim text-ghost text-[12px] hover:text-bright">Sign out</button>
        </div>
        <p className="text-[11px] text-dim">Don&apos;t agree? You can sign out, or delete your account from your profile.</p>
      </form>
    </div>
  );
}

/** The parent link for an under-18 account still waiting for consent. */
export function GuardianPanel() {
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!user?.guardianPending) return null;

  const getLink = async () => {
    setError(null); setCopied(false);
    const res = await fetch("/api/privacy/guardian", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "link" }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setLink(data.link); else setError(data.error ?? "Couldn't make a link. Please try again.");
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <section aria-label="Parent consent" className="rounded-xl border border-warn/40 bg-warn/5 p-4 space-y-2 font-mono text-[12px]">
      <h2 className="text-[13px] font-bold text-warn">A parent or guardian needs to agree</h2>
      <p className="text-ghost leading-relaxed">
        You&apos;re under 18, so the law asks for a parent&apos;s or guardian&apos;s consent. Until they agree you can practise and your
        progress is saved, but you can&apos;t join a class, and the AI tutor is off. Send them this link to open on their own phone or computer.
      </p>
      {link ? (
        <div className="flex flex-wrap gap-2 items-center">
          <code className="flex-1 min-w-0 break-all bg-void border border-rim rounded px-2 py-1 text-pale">{link}</code>
          <button onClick={copy} className="px-3 py-1 rounded border border-rim text-pale hover:text-bright">{copied ? "Copied" : "Copy"}</button>
        </div>
      ) : (
        <button onClick={getLink} className="px-3 py-1.5 rounded-lg border border-warn/60 text-warn hover:bg-warn/10">Get the parent link</button>
      )}
      <p className="text-dim">The link works for 7 days. Getting a new one turns the old one off.</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </section>
  );
}
