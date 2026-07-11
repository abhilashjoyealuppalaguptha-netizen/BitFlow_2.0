"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

/* ── Pure-CSS animated chip with circuit traces ─────────────────── */
function AnimatedChip() {
  return (
    <div className="relative w-[280px] h-[280px]" style={{ perspective: "800px" }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-phosphor/10 blur-[60px]" />

      {/* Rotating chip body */}
      <div
        className="absolute inset-4 animate-float"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(15deg) rotateY(-15deg)",
        }}
      >
        {/* Main chip body */}
        <div className="absolute inset-0 rounded-xl border-2 border-phosphor/40 bg-pit/80 backdrop-blur-sm shadow-[0_0_40px_rgba(0,232,122,0.15)]">
          {/* Die (inner square) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-lg border border-phosphor/60 bg-phosphor/5 shadow-[inset_0_0_20px_rgba(0,232,122,0.1)]">
            {/* Grid lines inside die */}
            <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-px opacity-40">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-phosphor/30 rounded-[2px]" />
              ))}
            </div>
            {/* Central glowing dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-phosphor animate-pulse_soft shadow-[0_0_12px_rgba(0,232,122,0.8)]" />
          </div>

          {/* Pins - Top */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`t${i}`}
              className="absolute bg-phosphor/50 rounded-sm"
              style={{
                width: "2px", height: "14px",
                top: "-14px",
                left: `${20 + i * 10}%`,
              }}
            />
          ))}
          {/* Pins - Bottom */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`b${i}`}
              className="absolute bg-phosphor/50 rounded-sm"
              style={{
                width: "2px", height: "14px",
                bottom: "-14px",
                left: `${20 + i * 10}%`,
              }}
            />
          ))}
          {/* Pins - Left */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`l${i}`}
              className="absolute bg-phosphor/50 rounded-sm"
              style={{
                width: "14px", height: "2px",
                left: "-14px",
                top: `${20 + i * 10}%`,
              }}
            />
          ))}
          {/* Pins - Right */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`r${i}`}
              className="absolute bg-phosphor/50 rounded-sm"
              style={{
                width: "14px", height: "2px",
                right: "-14px",
                top: `${20 + i * 10}%`,
              }}
            />
          ))}

          {/* Corner notch */}
          <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-phosphor/30 rounded-tl" />

          {/* Gate labels */}
          <div className="absolute bottom-3 left-3 font-mono text-[8px] text-phosphor/40 tracking-widest">
            AND · OR · XOR
          </div>
          <div className="absolute top-3 right-3 font-mono text-[8px] text-phosphor/40 tracking-widest">
            FPGA
          </div>
        </div>
      </div>

      {/* Orbiting data particles */}
      <div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 -ml-0.5 rounded-full bg-phosphor shadow-[0_0_6px_rgba(0,232,122,0.8)]" />
      </div>
      <div className="absolute inset-0 animate-[spin_8s_linear_infinite_reverse]">
        <div className="absolute bottom-0 left-1/2 w-1 h-1 -ml-0.5 rounded-full bg-info shadow-[0_0_6px_rgba(77,184,255,0.8)]" />
      </div>
      <div className="absolute inset-0 animate-[spin_16s_linear_infinite]">
        <div className="absolute top-1/2 right-0 w-1 h-1 -mt-0.5 rounded-full bg-warn shadow-[0_0_6px_rgba(255,184,77,0.8)]" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();

  const navLinks = [
    { label: "Home", href: "/", active: true },
    { label: "Sandbox IDE", href: "/sandbox" },
    { label: "Learning", href: "/learn" },
    { label: "Academy", href: "/academy" },
    { label: "Arena", href: "/arena" },
  ];

  const cards = [
    {
      href: "/sandbox",
      title: "Sandbox IDE",
      body: "Write, compile, simulate and debug Verilog/SystemVerilog projects in a powerful online IDE.",
      action: "Launch Sandbox",
      colorClass: "text-phosphor",
      bgClass: "bg-phosphor/10",
      borderHover: "hover:border-phosphor/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(0,232,122,0.15)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      href: "/learn",
      title: "Learning Path",
      body: "Follow structured learning paths with hands-on exercises and progress tracking.",
      action: "Continue Learning",
      colorClass: "text-info",
      bgClass: "bg-info/10",
      borderHover: "hover:border-info/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(77,184,255,0.15)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      href: "/academy",
      title: "Digital Electronics Academy",
      body: "Master digital electronics, logic design, sequential circuits, FSMs, and computer architecture.",
      action: "Explore Academy",
      colorClass: "text-purple-400",
      bgClass: "bg-purple-400/10",
      borderHover: "hover:border-purple-400/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      )
    },
    {
      href: "/arena",
      title: "HDL Arena",
      body: "Solve real-world RTL and verification challenges. Practice, compete and improve your skills.",
      action: "Enter Arena",
      colorClass: "text-warn",
      bgClass: "bg-warn/10",
      borderHover: "hover:border-warn/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(255,184,77,0.15)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-bright font-mono flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-void text-bright font-mono overflow-x-hidden selection:bg-phosphor/30">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-phosphor/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-phosphor/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-rim/50 bg-void/80 backdrop-blur-md">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <img src="/bitflow_logo_2.png" alt="BitFlow" className="w-7 h-7 object-contain" />
            <span className="font-display font-bold text-lg">BitFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold tracking-wider uppercase">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={link.active
                  ? "text-phosphor border-b-2 border-phosphor pb-0.5"
                  : "text-ghost hover:text-bright transition-colors pb-0.5"}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button className="text-ghost hover:text-bright transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button className="text-ghost hover:text-bright transition-colors relative">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-phosphor rounded-full" />
          </button>
          {user ? (
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-7 h-7 rounded-full bg-phosphor text-void flex items-center justify-center font-bold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-pale group-hover:text-bright transition-colors">
                {user.username}
              </span>
            </div>
          ) : (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-phosphor/10 text-phosphor hover:bg-phosphor/20 border border-phosphor/30 transition-colors text-[11px] font-bold tracking-wider">
              SIGN IN
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section — compact so cards are visible */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left text */}
        <div className="flex-1 max-w-xl">
          {user && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-phosphor/10 border border-phosphor/20 text-phosphor text-[9px] font-bold tracking-[0.2em] mb-5 uppercase">
              WELCOME BACK, {user.username} 👋
            </div>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-[1.15] tracking-tight mb-4">
            Everything you need to{" "}
            <span className="text-phosphor">Design. Learn. Build.</span>
          </h1>
          <p className="text-sm text-ghost leading-relaxed mb-6 max-w-md">
            The all-in-one platform for RTL design, verification, and digital electronics learning.
          </p>
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-phosphor text-void text-xs font-bold tracking-wider uppercase hover:bg-phosphor-glow transition-all hover:scale-[1.03] shadow-[0_0_18px_rgba(0,232,122,0.25)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Project
          </Link>
        </div>

        {/* Right — animated CSS chip */}
        <div className="flex-shrink-0">
          <AnimatedChip />
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <Link
              key={i}
              href={card.href}
              className={`group flex flex-col justify-between p-5 rounded-2xl bg-surface/40 backdrop-blur-xl border border-rim transition-all duration-300 ${card.borderHover} ${card.shadowHover} hover:-translate-y-1 min-h-[220px] relative overflow-hidden`}
            >
              <div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${card.bgClass} ${card.colorClass} border border-current/20`}>
                  {card.icon}
                </div>
                <h3 className="text-sm font-bold text-bright mb-2">{card.title}</h3>
                <p className="text-[11px] text-ghost leading-relaxed">{card.body}</p>
              </div>
              <div className={`mt-4 flex items-center gap-1.5 text-[11px] font-bold ${card.colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
                {card.action}
                <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Carousel dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-1.5 h-1.5 rounded-full bg-phosphor" />
          <div className="w-1.5 h-1.5 rounded-full bg-rim" />
          <div className="w-1.5 h-1.5 rounded-full bg-rim" />
          <div className="w-1.5 h-1.5 rounded-full bg-rim" />
        </div>
      </section>
    </main>
  );
}
