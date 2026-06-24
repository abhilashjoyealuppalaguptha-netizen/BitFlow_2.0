"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretPassword, setSecretPassword] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await register(username, password, role, role === "ADMIN" ? secretPassword : undefined);
        if (res.error) {
          setErrorMsg(res.error);
          if (role === "ADMIN" && res.error.toLowerCase().includes("secret password")) {
            setSecretPassword("");
          }
        } else {
          setTimeout(() => {
            router.push(role === "ADMIN" ? "/admin" : "/sandbox");
          }, 500);
        }
      } else {
        const res = await login(username, password, role);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setTimeout(() => {
            router.push(role === "ADMIN" ? "/admin" : "/sandbox");
          }, 500);
        }
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void scanlines relative p-6">
      {/* Decorative cyber grid background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,232,122,0.05),transparent)] pointer-events-none" />
      
      {/* Container card */}
      <div className="relative w-full max-w-md bg-surface/60 border border-rim/60 rounded-lg p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center w-12 h-12 mb-3">
            <div className="absolute inset-0 rounded bg-phosphor/10 border border-phosphor/30" />
            <svg
              viewBox="0 0 16 16"
              className="w-7 h-7 text-phosphor relative z-10 animate-pulse_soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="3" y="3" width="10" height="10" rx="1" />
              <line x1="3" y1="8" x2="0" y2="8" />
              <line x1="13" y1="8" x2="16" y2="8" />
              <line x1="8" y1="3" x2="8" y2="0" />
              <line x1="8" y1="13" x2="8" y2="16" />
              <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
            </svg>
          </div>
          
          <h1 className="font-display text-2xl font-bold tracking-tight text-bright">
            BitFlow Sandbox
          </h1>
          <p className="font-mono text-[10px] text-dim/80 tracking-widest uppercase mt-1">
            Access Core Registry
          </p>
        </div>

        {/* Tab Selectors for Student / Admin */}
        <div className="flex bg-pit border border-rim/40 rounded p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setRole("STUDENT");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded font-mono text-[11px] font-semibold tracking-wider uppercase transition-all duration-150 ${
              role === "STUDENT"
                ? "bg-phosphor/10 text-phosphor border border-phosphor/30"
                : "text-ghost hover:text-pale"
            }`}
          >
            Student Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("ADMIN");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded font-mono text-[11px] font-semibold tracking-wider uppercase transition-all duration-150 ${
              role === "ADMIN"
                ? "bg-info/10 text-info border border-info/30"
                : "text-ghost hover:text-pale"
            }`}
          >
            Admin Profile
          </button>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className={`p-3 rounded border font-mono text-[11px] mb-5 ${
            role === "ADMIN" 
              ? "border-danger/30 bg-danger/10 text-danger" 
              : "border-warn/30 bg-warn/10 text-warn"
          }`}>
            <div className="flex gap-2">
              <span className="font-bold">⚠️ ERROR:</span>
              <span className="flex-1">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[9px] text-dim uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. system_operator"
              className="w-full bg-pit border border-rim/60 rounded px-3 py-2 font-mono text-[12px] text-bright placeholder-dim/40 focus:outline-none focus:border-phosphor/60 transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-[9px] text-dim uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-pit border border-rim/60 rounded px-3 py-2 font-mono text-[12px] text-bright placeholder-dim/40 focus:outline-none focus:border-phosphor/60 transition-colors"
            />
          </div>

          {/* Admin secret password field */}
          {role === "ADMIN" && isSignUp && (
            <div className="animate-pulse_once">
              <label className="block font-mono text-[9px] text-info uppercase tracking-wider mb-1.5">
                Secret Admin Key
              </label>
              <input
                type="password"
                required
                value={secretPassword}
                onChange={(e) => setSecretPassword(e.target.value)}
                placeholder="Enter system master password"
                className="w-full bg-pit border border-info/40 rounded px-3 py-2 font-mono text-[12px] text-info placeholder-info/20 focus:outline-none focus:border-info/60 transition-colors"
              />
              <span className="block font-mono text-[8px] text-dim/60 mt-1">
                Required for admin credentials initialization.
              </span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded font-mono text-[12px] font-semibold tracking-wider uppercase border transition-all duration-150 select-none ${
              role === "ADMIN"
                ? "border-info/60 bg-info/10 text-info hover:bg-info/20"
                : "border-phosphor/60 bg-phosphor/10 text-phosphor hover:bg-phosphor/20"
            } disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]`}
          >
            {loading ? "Decrypting..." : isSignUp ? "Create Profile" : "Authorize"}
          </button>
        </form>

        {/* Toggle between login / register */}
        <div className="mt-6 text-center border-t border-rim/30 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
            }}
            className="font-mono text-[10px] text-dim hover:text-ghost transition-colors underline decoration-dotted"
          >
            {isSignUp
              ? "Already registered? Sign in here"
              : "Need a new account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}
