"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

export default function LandingPage() {
  const { user, loading } = useAuth();

  // Navigation Links
  const navLinks = [
    { label: "Home", href: "/", active: true },
    { label: "Sandbox IDE", href: "/sandbox" },
    { label: "Learning", href: "/learn" },
    { label: "Academy", href: "/academy" },
    { label: "Arena", href: "/arena" },
  ];

  // Feature Cards Data
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
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      href: "/learn",
      title: "Learning Path",
      body: "Follow structured learning paths with hands-on exercises and progress tracking.",
      action: "Continue Learning",
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
      borderHover: "hover:border-blue-500/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      href: "/academy",
      title: "Digital Electronics Academy",
      body: "Master digital electronics, logic design, sequential circuits, FSMs, and computer architecture.",
      action: "Explore Academy",
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10",
      borderHover: "hover:border-purple-500/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      )
    },
    {
      href: "/arena",
      title: "HDL Arena",
      body: "Solve real-world RTL and verification challenges. Practice, compete and improve your skills.",
      action: "Enter Arena",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
      borderHover: "hover:border-amber-500/50",
      shadowHover: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-bright flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-void text-bright font-sans overflow-x-hidden selection:bg-phosphor/30">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-phosphor/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-phosphor/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-rim/50 bg-void/80 backdrop-blur-md">
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/bitflow_logo_2.png" alt="BitFlow" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl tracking-wide">BitFlow</span>
          </Link>
          
          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) => (
              <Link 
                key={link.label} 
                href={link.href}
                className={`${link.active ? 'text-phosphor border-b-2 border-phosphor pb-1' : 'text-ghost hover:text-bright transition-colors pb-1'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-6">
          <button className="text-ghost hover:text-bright transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button className="text-ghost hover:text-bright transition-colors relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute top-0 right-0 w-2 h-2 bg-phosphor rounded-full"></span>
          </button>
          {user ? (
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-phosphor text-void flex items-center justify-center font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-pale group-hover:text-bright transition-colors">
                {user.username}
              </span>
            </div>
          ) : (
            <Link href="/login" className="px-5 py-2 rounded-full bg-phosphor/10 text-phosphor hover:bg-phosphor/20 border border-phosphor/30 transition-colors text-sm font-bold">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-16 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Text */}
        <div className="flex-1 max-w-2xl">
          {user && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-phosphor/10 border border-phosphor/20 text-phosphor text-[10px] font-bold tracking-widest mb-8 uppercase">
              WELCOME BACK, {user.username} 👋
            </div>
          )}
          
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Everything you need to <br/>
            <span className="text-phosphor">Design. Learn. Build.</span>
          </h1>
          
          <p className="text-lg text-pale mb-10 max-w-xl leading-relaxed">
            The all-in-one platform for RTL design, verification, and digital electronics learning.
          </p>

          <Link href="/sandbox" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-phosphor text-void font-bold hover:bg-phosphor-glow transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,232,122,0.3)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Project
          </Link>
        </div>

        {/* Right Graphic (Animated Chip) */}
        <div className="flex-1 relative flex items-center justify-center w-full max-w-[600px] h-[500px]">
          {/* Circuit background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,232,122,0.15),transparent_60%)]" />
          
          {/* Animated Chip Image */}
          <img 
            src="/glowing_microchip.png" 
            alt="BitFlow Microchip" 
            className="relative z-10 w-full h-auto object-contain animate-float drop-shadow-[0_0_30px_rgba(0,232,122,0.3)]"
          />
        </div>
      </section>

      {/* Cards Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <Link 
              key={i} 
              href={card.href}
              className={`group flex flex-col justify-between p-6 rounded-2xl bg-surface/40 backdrop-blur-xl border border-rim transition-all duration-300 ${card.borderHover} ${card.shadowHover} hover:-translate-y-1 min-h-[280px] relative overflow-hidden`}
            >
              {/* Top content */}
              <div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${card.bgClass} ${card.colorClass} border border-current/20`}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-bright mb-3">{card.title}</h3>
                <p className="text-sm text-ghost leading-relaxed">{card.body}</p>
              </div>

              {/* Bottom action */}
              <div className={`mt-6 flex items-center gap-2 text-sm font-bold ${card.colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
                {card.action}
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Carousel Indicators (Decorative as requested by the mockup) */}
        <div className="flex items-center justify-center gap-3 mt-12">
          <div className="w-2 h-2 rounded-full bg-phosphor glow"></div>
          <div className="w-2 h-2 rounded-full bg-rim"></div>
          <div className="w-2 h-2 rounded-full bg-rim"></div>
          <div className="w-2 h-2 rounded-full bg-rim"></div>
        </div>
      </section>
      
    </main>
  );
}
