"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-void text-bright font-mono overflow-x-hidden selection:bg-phosphor/30">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-phosphor/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-rim/50 bg-void/80 backdrop-blur-md">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <img src="/bitflow_logo_2.png" alt="BitFlow" className="w-7 h-7 object-contain" />
            <span className="font-display font-bold text-lg">BitFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold tracking-wider uppercase">
            <Link href="/" className="text-ghost hover:text-bright transition-colors pb-0.5">Home</Link>
            <Link href="/sandbox" className="text-ghost hover:text-bright transition-colors pb-0.5">Sandbox IDE</Link>
            <Link href="/learn" className="text-ghost hover:text-bright transition-colors pb-0.5">Learning</Link>
            <Link href="/about" className="text-phosphor border-b-2 border-phosphor pb-0.5">About</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-20">
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-[1.15] tracking-tight mb-8">
          About <span className="text-phosphor">BitFlow</span>
        </h1>
        
        <div className="space-y-6 text-sm text-ghost leading-relaxed">
          <p>
            BitFlow is an all-in-one platform designed to make Verilog and SystemVerilog accessible directly from your browser. 
            No cumbersome toolchains, no waiting for heavy IDEs to load — just instant compilation and simulation.
          </p>
          
          <h2 className="font-display text-xl text-bright mt-10 mb-4">The Founders</h2>
          <p>
            BitFlow was designed and built by <strong>AKD</strong>. Our mission is to democratize digital electronics and hardware description languages by bringing powerful, modern web technologies to the traditionally complex world of RTL design.
          </p>

          <h2 className="font-display text-xl text-bright mt-10 mb-4">Our Vision</h2>
          <p>
            Whether you are a student writing your first logic gate or an experienced engineer prototyping a complex state machine, BitFlow aims to provide the fastest, most frictionless path from idea to functional simulation.
          </p>
          
          <div className="pt-8">
            <Link
              href="/sandbox"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-phosphor text-void text-xs font-bold tracking-wider uppercase hover:bg-phosphor-glow transition-all shadow-[0_0_18px_rgba(0,232,122,0.25)]"
            >
              Launch Sandbox
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
