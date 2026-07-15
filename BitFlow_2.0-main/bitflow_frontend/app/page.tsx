"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

/* ── Nav links logo and Sign In ────────────────── */
const NAV_LINKS = [
  { label: "Sandbox IDE", href: "/sandbox" },
  { label: "Learning", href: "/learn" },
  { label: "Academy", href: "/academy" },
  { label: "Arena", href: "/arena" },
  { label: "About", href: "/about" },
];

/* ── Real product─────────────────────── */
const STATS = [
  { value: "97+", label: "Practice Problems" },
  { value: "8", label: "Academy Modules" },
  { value: "100%", label: "Browser-Based" },
];

/* ── Why BitFlow cards ─────────────────────────────────────────────── */
const WHY_CARDS = [
  {
    title: "Browser-based Verilog IDE",
    badge: "Zero Setup",
    body: "Full write-to-simulate pipeline runs in your browser. No Vivado, no ModelSim — open a problem and start writing Verilog.",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "Real-time Waveform Viewer",
    badge: "Live Debug",
    body: "Every simulation generates an interactive VCD waveform. Inspect signals and catch timing issues, inline.",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
    ),
  },
  {
    title: "Structured Learning Path",
    badge: "Guided",
    body: "From number systems to FSMs, each Academy module builds on the last — with problems tied to every concept.",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.25v13M12 6.25C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5c1.75 0 3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18c-1.75 0-3.33.48-4.5 1.25"
        />
      </svg>
    ),
  },
];

/* ── Academy categories ────── */
const CATEGORIES = [
  { title: "Number Systems", tags: "Binary · Hex · BCD" },
  { title: "Boolean Algebra", tags: "K-Maps · SOP · POS" },
  { title: "Logic Gates", tags: "AND · OR · XOR" },
  { title: "Combinational Logic", tags: "Mux · Decoder · Adder" },
  { title: "Sequential Logic", tags: "Flip-Flops · Latches" },
  { title: "FSMs", tags: "Mealy · Moore" },
  { title: "Memory", tags: "RAM · ROM · FIFO" },
  { title: "Timing", tags: "Setup · Hold · Skew" },
];

/* ── 12 traces ────────── */
const TRACES = [
  { d: "M170,180 L170,20" }, { d: "M210,180 L210,20" }, { d: "M250,180 L250,20" },
  { d: "M170,320 L170,480" }, { d: "M210,320 L210,480" }, { d: "M250,320 L250,480" },
  { d: "M140,210 L20,210" }, { d: "M140,250 L20,250" }, { d: "M140,290 L20,290" },
  { d: "M280,210 L400,210" }, { d: "M280,250 L400,250" }, { d: "M280,290 L400,290" },
];
const PADS = [
  { cx: 170, cy: 20 }, { cx: 210, cy: 20 }, { cx: 250, cy: 20 },
  { cx: 170, cy: 480 }, { cx: 210, cy: 480 }, { cx: 250, cy: 480 },
  { cx: 20, cy: 210 }, { cx: 20, cy: 250 }, { cx: 20, cy: 290 },
  { cx: 400, cy: 210 }, { cx: 400, cy: 250 }, { cx: 400, cy: 290 },
];
const DIE_CELLS = [
  { x: 151.4, y: 216.2, delay: "0s" },
  { x: 176.2, y: 265.8, delay: ".3s" },
  { x: 201, y: 191.4, delay: ".6s" },
  { x: 201, y: 290.6, delay: ".9s" },
  { x: 225.8, y: 241, delay: "1.2s" },
  { x: 250.6, y: 216.2, delay: "1.5s" },
  { x: 176.2, y: 216.2, delay: "1.8s" },
  { x: 225.8, y: 290.6, delay: "2.1s" },
];
const GR_RINGS = [
  { x: 180, y: 220, s: 60 },
  { x: 162.7, y: 202.7, s: 94.6 },
  { x: 134.9, y: 174.9, s: 150.2 },
  { x: 88.5, y: 128.5, s: 243 },
  { x: 10.8, y: 50.8, s: 398.4 },
];

/* ── The 2D chip: signals flow ────── */
function ChipVisual() {
  return (
    <div className="relative h-[560px] w-full">
      {/* ambient glow to keep the column filled, no dead space */}
      <div
        className="absolute -inset-[12%] pointer-events-none blur-[8px]"
        style={{
          background:
            "radial-gradient(circle at 50% 46%, rgba(0,232,122,.18), rgba(0,232,122,.05) 45%, transparent 72%)",
        }}
      />

      {/* golden-ratio concentric rings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 500" preserveAspectRatio="xMidYMid meet">
        <g>
          {GR_RINGS.map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.s}
              height={r.s}
              fill="none"
              stroke="rgba(0,232,122,.15)"
              strokeWidth={1}
              className="animate-pulse_glow"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </g>
      </svg>

      {/* the chip */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 500" preserveAspectRatio="xMidYMid meet">
        {TRACES.map((t, i) => (
          <g key={i}>
            <path d={t.d} fill="none" stroke="rgba(0,232,122,.22)" strokeWidth={1.4} />
            <path
              d={t.d}
              pathLength={100}
              fill="none"
              stroke="#00ff88"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray="16 84"
              className="animate-trace_flow"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
            <circle r={3.2} fill="#00ff88" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,136,.85))" }}>
              <animateMotion
                path={t.d}
                dur={`${1.5 + (i % 3) * 0.35}s`}
                begin={`${i * 0.14}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}

        {PADS.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={5} fill="#0d0e11" stroke="#00e87a" strokeWidth={1.4} />
            <circle
              cx={p.cx}
              cy={p.cy}
              r={2}
              fill="#00e87a"
              className="animate-pulse_glow"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          </g>
        ))}

        <rect x={140} y={180} width={140} height={140} rx={8} fill="#0d0e11" stroke="rgba(0,232,122,.5)" strokeWidth={1.5} />
        <g stroke="rgba(0,232,122,.15)" strokeWidth={1}>
          <line x1={172.8} y1={188} x2={172.8} y2={312} />
          <line x1={197.6} y1={188} x2={197.6} y2={312} />
          <line x1={222.4} y1={188} x2={222.4} y2={312} />
          <line x1={247.2} y1={188} x2={247.2} y2={312} />
          <line x1={148} y1={212.8} x2={272} y2={212.8} />
          <line x1={148} y1={237.6} x2={272} y2={237.6} />
          <line x1={148} y1={262.4} x2={272} y2={262.4} />
          <line x1={148} y1={287.2} x2={272} y2={287.2} />
        </g>
        {DIE_CELLS.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={18}
            height={18}
            rx={2}
            fill="#00e87a"
            className="animate-cell_pulse"
            style={{ animationDelay: c.delay }}
          />
        ))}
        <circle cx={210} cy={250} r={6} fill="#00e87a" className="animate-pulse_soft" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-bright font-mono flex items-center justify-center">
        <span className="text-ghost text-sm">
          <span className="text-phosphor">►</span> booting bitflow
          <span className="animate-blink">_</span>
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-void text-bright font-mono overflow-x-hidden selection:bg-phosphor/30">
      {/* Navigation — 3-column grid, links always centered between logo and Sign In */}
      <nav className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 border-b border-rim/50 bg-void/80 backdrop-blur-md">
        <Link href="/" className="justify-self-start font-display font-bold text-lg">
          BitFlow
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-ghost justify-self-center">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-bright transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-5 justify-self-end">
          {user ? (
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-7 h-7 rounded-full bg-phosphor text-void flex items-center justify-center font-bold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-pale group-hover:text-bright transition-colors">{user.username}</span>
            </div>
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

      {/* Hero — golden-ratio split (61.8% text / 38.2% visual) */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 pb-12 grid grid-cols-1 lg:grid-cols-[1.618fr_1fr] gap-10 items-center animate-fade_up">
        <div>
          <span className="inline-block px-3.5 py-1.5 border border-phosphor/40 rounded text-[11px] tracking-[0.18em] text-phosphor uppercase mb-6">
            HDL Engineering Platform
          </span>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.12] mb-6">
            Design. <span className="text-phosphor">Learn.</span>
            <br />
            Build.
          </h1>
          <p className="text-[15px] text-ghost leading-relaxed max-w-md mb-8">
            The all-in-one platform for RTL design, verification, and digital electronics learning — write,
            simulate, and debug Verilog and SystemVerilog right in your browser.
          </p>
          <div className="flex flex-wrap gap-3.5 mb-10">
            <Link
              href="/sandbox"
              className="px-7 py-3.5 rounded-lg bg-phosphor text-void text-[13px] font-bold hover:bg-phosphor-glow transition-colors hover:-translate-y-0.5"
            >
              Let&apos;s Get Started →
            </Link>
            <Link
              href="/arena"
              className="px-7 py-3.5 rounded-lg border border-rim text-ghost text-[13px] font-semibold hover:border-muted hover:text-bright transition-colors"
            >
              Explore Problems
            </Link>
          </div>
          <div className="flex gap-14 border-t border-rim pt-6 max-w-md">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-2xl text-bright">{s.value}</div>
                <div className="text-[10px] text-dim uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <ChipVisual />
      </section>

      {/* Why BitFlow */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
        <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-2">Why BitFlow</div>
        <h2 className="font-serif text-3xl md:text-4xl mb-10 leading-tight">
          The Ultimate
          <br />
          HDL Workbench.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WHY_CARDS.map((c) => (
            <div key={c.title} className="border border-rim rounded-xl p-6 bg-pit">
              <div className="w-9 h-9 border border-phosphor/35 rounded-lg flex items-center justify-center text-phosphor mb-5">
                {c.icon}
              </div>
              <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                <span className="font-serif text-lg text-bright">{c.title}</span>
                <span className="text-[10px] uppercase tracking-wide text-phosphor border border-phosphor/30 rounded-full px-2.5 py-0.5">
                  {c.badge}
                </span>
              </div>
              <p className="text-[13px] text-ghost leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories — hover pop animation */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pb-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-[11px] tracking-[0.18em] text-phosphor uppercase mb-2">Built for HDL learners</div>
          <h2 className="font-serif text-2xl md:text-3xl text-pale">
            Everything you need to go from Verilog to verified design.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rim border border-rim rounded-xl overflow-hidden">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              className="group relative bg-void hover:bg-pit p-6 cursor-pointer
                         transition-[background-color,transform,box-shadow] duration-300
                         ease-[cubic-bezier(0.34,1.56,0.64,1)]
                         hover:scale-[1.07] hover:-translate-y-1.5 hover:z-10
                         hover:shadow-[0_14px_26px_rgba(0,0,0,.35),0_0_0_1px_rgba(0,232,122,.4),0_0_22px_rgba(0,232,122,.18)]"
            >
              <div className="font-serif text-base text-bright mb-1.5 group-hover:text-phosphor transition-colors">
                {cat.title}
              </div>
              <div className="text-[11px] text-dim group-hover:text-pale transition-colors">{cat.tags}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-xl mx-auto text-center px-6 pb-28 pt-10">
        <h2 className="font-serif text-3xl md:text-4xl mb-4">
          Ready to compile
          <br />
          your first design?
        </h2>
        <p className="text-sm text-ghost leading-relaxed mb-8">
          Join BitFlow and start writing Verilog in your browser — no installs, no waiting.
        </p>
        <Link
          href="/login"
          className="inline-block px-7 py-3.5 rounded-lg bg-phosphor text-void text-[13px] font-bold hover:bg-phosphor-glow transition-colors"
        >
          Let&apos;s Get Started — It&apos;s Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-rim/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif text-base text-dim">BitFlow</span>
          <span className="text-[11px] tracking-wider text-dim uppercase">
            Designed by <b className="text-phosphor">AKD</b>
          </span>
          <div className="flex gap-6 text-[11px] tracking-wide text-dim uppercase">
            <Link href="/about" className="hover:text-bright transition-colors">
              About Founders
            </Link>
            <a
              href="#"
              className="hover:text-bright transition-colors"
              title="Add BitFlow company LinkedIn URL here"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <div className="text-center text-[11px] text-muted pb-6">© 2026 BitFlow. All rights reserved.</div>
      </footer>
    </main>
  );
}