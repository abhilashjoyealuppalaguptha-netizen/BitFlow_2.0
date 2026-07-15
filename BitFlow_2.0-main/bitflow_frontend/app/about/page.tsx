"use client";

import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

const NAV_LINKS = [
  { label: "Sandbox IDE", href: "/sandbox" },
  { label: "Learning", href: "/learn" },
  { label: "Academy", href: "/academy" },
  { label: "Arena", href: "/arena" },
  { label: "About", href: "/about" },
];

const FOUNDERS = [
  {
    name: "Abhilash Joyeal Uppalaguptha",
    initials: "AJ",
    linkedin: "https://www.linkedin.com/in/abhilash-joyeal-uppalaguptha-0a4b88325/",
  },
  {
    name: "ArunKasi Dommeti",
    initials: "AKD",
    linkedin: "https://www.linkedin.com/in/arunkasi-dommeti-49a245320/",
  },
  {
    name: "Priyanshu Sarma",
    initials: "PS",
    linkedin: "https://www.linkedin.com/in/priyanshu-sarma/",
  },
];

const WHY_POINTS = [
  {
    title: "Zero setup",
    body: "No Vivado, no ModelSim, no 10GB toolchain install. Open a browser and start writing Verilog.",
  },
  {
    title: "Real compiler, not a toy",
    body: "Every run compiles and simulates against Icarus Verilog — actual RTL semantics, not a simplified interpreter.",
  },
  {
    title: "A structured path",
    body: "From number systems to FSMs, Academy and Arena are ordered so each concept builds on the last.",
  },
];

const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.37 4.25 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </svg>
);

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-void text-bright font-mono">
      {/* Nav — consistent with the landing page */}
      <nav className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 border-b border-rim/50 bg-void/80 backdrop-blur-md">
        <Link href="/" className="justify-self-start font-display font-bold text-lg">
          BitFlow
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-ghost justify-self-center">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={link.href === "/about" ? "text-phosphor" : "hover:text-bright transition-colors"}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-5 justify-self-end">
          {user ? (
            <Link href="/profile" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full bg-phosphor text-void flex items-center justify-center font-bold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-pale group-hover:text-bright transition-colors">{user.username}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] text-ghost hover:text-bright transition-colors">
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-5 py-2 rounded-md bg-phosphor text-void text-[13px] font-bold hover:bg-phosphor-glow transition-colors"
              >
                Let&apos;s Go →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-4 text-center">
        <span className="inline-block px-3.5 py-1.5 border border-phosphor/40 rounded text-[11px] tracking-[0.18em] text-phosphor uppercase mb-6">
          About BitFlow
        </span>
        <h1 className="font-serif text-3xl md:text-4xl leading-tight">
          Hands-on hardware design, <span className="text-phosphor">without the friction.</span>
        </h1>
      </section>

      {/* Vision */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-3">Our Vision</div>
        <p className="text-[15px] text-ghost leading-relaxed">
          BitFlow exists to make hardware design as approachable as learning to code. Every ECE student
          should be able to open a browser, write Verilog, and watch it simulate — without installing a
          10GB toolchain or waiting for a lab slot. We're building toward a world where HDL is taught the
          way modern programming is: interactively, incrementally, and with instant feedback.
        </p>
      </section>

      {/* What is BitFlow */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-rim/40">
        <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-3">What is BitFlow</div>
        <p className="text-[15px] text-ghost leading-relaxed">
          BitFlow is a browser-based platform for RTL design, verification, and digital electronics
          learning. Write Verilog or SystemVerilog directly in the browser, compile and simulate against
          Icarus Verilog inside an isolated sandbox, and step through the resulting VCD waveform — no
          local installation required. Academy carries you from number systems through FSMs, and Arena
          gives you real problems to practice against.
        </p>
      </section>

      {/* Why BitFlow */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-rim/40">
        <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-3">Why BitFlow</div>
        <p className="text-[15px] text-ghost leading-relaxed mb-8">
          Most HDL learning resources are either static tutorials or expensive, install-heavy EDA suites.
          BitFlow sits in between — real compilation and simulation, zero setup, and a path built
          specifically for students rather than licensed enterprise seats.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WHY_POINTS.map((p) => (
            <div key={p.title} className="border border-rim rounded-xl p-5 bg-pit">
              <div className="font-serif text-base text-bright mb-2">{p.title}</div>
              <p className="text-[12.5px] text-ghost leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founders */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-rim/40">
        <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-3 text-center">Founders</div>
        <h2 className="font-serif text-2xl text-bright text-center mb-10">The team behind BitFlow.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FOUNDERS.map((f) => (
            <div key={f.name} className="border border-rim rounded-xl p-6 bg-pit text-center flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-full bg-phosphor/10 border border-phosphor/35 flex items-center justify-center font-display font-bold text-phosphor mb-4 ${
                  f.initials.length > 2 ? "text-sm" : "text-lg"
                }`}
              >
                {f.initials}
              </div>
              <div className="text-[13.5px] font-semibold text-bright leading-snug mb-1">{f.name}</div>
              <div className="text-[10px] text-dim uppercase tracking-wider mb-4">Co-founder</div>
              <a
                href={f.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-phosphor border border-phosphor/30 rounded-full px-3 py-1.5 hover:bg-phosphor/10 transition-colors"
              >
                <LinkedInIcon />
                View LinkedIn
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer — same structure as the landing page */}
      <footer className="border-t border-rim/50">
        <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-[0.14em] text-bright uppercase">Follow us</span>
            <a
              href="https://chat.whatsapp.com/EDj3tTHgefx1BXI95E0bPF"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-8 h-8 rounded-full border border-rim flex items-center justify-center text-bright hover:text-phosphor hover:border-phosphor/50 hover:-translate-y-0.5 transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.05.09-3.14-.65-2.64-1.02-4.34-3.7-4.47-3.87-.13-.17-1.07-1.42-1.07-2.71s.68-1.93.92-2.19c.24-.26.53-.32.7-.32.18 0 .35 0 .5.01.16.01.38-.06.6.46.24.56.8 1.95.87 2.09.07.14.11.31.02.5-.09.19-.13.31-.27.47-.13.16-.28.36-.4.48-.13.13-.27.28-.12.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.51.31.06.12.06.65-.18 1.33z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/bitflow__official?igsh=MWxtZDA0aHpiZnByMw=="
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-full border border-rim flex items-center justify-center text-bright hover:text-phosphor hover:border-phosphor/50 hover:-translate-y-0.5 transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/bitflow-vlsi-community/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-full border border-rim flex items-center justify-center text-bright hover:text-phosphor hover:border-phosphor/50 hover:-translate-y-0.5 transition-all"
            >
              <LinkedInIcon />
            </a>
          </div>

          <Link href="/about" className="text-[11px] tracking-[0.14em] text-phosphor uppercase">
            About
          </Link>

          <div className="text-[11px] text-bright">© 2026 BitFlow. All rights reserved.</div>

          <div className="text-[11px] tracking-[0.14em] text-bright uppercase">
            Designed by <b className="text-phosphor">AKD</b>
          </div>
        </div>
      </footer>
    </main>
  );
}