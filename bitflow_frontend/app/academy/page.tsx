/**
 * app/academy/page.tsx — Digital Electronics Academy hub
 */

import Link from "next/link";
import ScrollUnlock from "@/components/ScrollUnlock";
import type { Metadata } from "next";
import {
  ACADEMY_TOPIC_META,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
} from "@/lib/academy-content";

export const metadata: Metadata = {
  title: "Academy — BitFlow",
  description:
    "Digital Electronics Academy: Boolean algebra, gates, sequential logic, FSMs, and memory.",
};

export default function AcademyHubPage() {
  return (
    <div className="min-h-screen bg-void text-bright">
      <ScrollUnlock />

      <header className="sticky top-0 z-10 h-12 flex items-center justify-between px-6 bg-surface/90 border-b border-rim backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/bitflow_logo_2.png"
              alt="BitFlow"
              className="w-6 h-6 object-contain rounded opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <span className="font-display text-[13px] font-bold text-bright">BitFlow</span>
          </Link>
          <span className="text-rim">·</span>
          <span className="font-mono text-[11px] text-ghost">Digital Electronics Academy</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/learn"
            className="font-mono text-[10px] text-dim hover:text-ghost transition-colors"
          >
            Learning Path
          </Link>
          <Link
            href="/arena"
            className="font-mono text-[10px] text-dim hover:text-ghost transition-colors"
          >
            HDL Arena
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] text-dim hover:text-ghost transition-colors"
          >
            ← Sandbox
          </Link>
        </div>
      </header>

      <div className="px-6 py-10 border-b border-rim/30 bg-gradient-to-b from-info/5 to-transparent">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] text-info/70 uppercase tracking-widest border border-info/20 px-2 py-0.5 rounded">
              Digital Electronics Academy
            </span>
          </div>
          <h1 className="font-display text-[28px] font-bold text-bright leading-tight mb-3">
            Learn digital logic,<br />
            <span className="text-info">play with circuits.</span>
          </h1>
          <p className="font-mono text-[11px] text-ghost/80 leading-relaxed max-w-lg">
            Eight curated modules covering Boolean algebra through memory systems.
            Read articles, flip flashcards, take quizzes, and explore interactive
            animations — all before you write your first line of Verilog.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-4">
          {ACADEMY_TOPIC_META.map((topic) => (
            <Link
              key={topic.slug}
              href={`/academy/${topic.slug}`}
              className="group flex items-start gap-4 p-4 rounded-lg border border-rim/50 bg-surface/20 hover:border-info/40 hover:bg-surface/50 transition-all duration-150"
            >
              <span className="shrink-0 w-12 h-12 rounded-lg border border-rim/50 bg-pit flex items-center justify-center font-mono text-lg text-info group-hover:border-info/50 transition-colors">
                {topic.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[8px] text-dim tabular-nums">
                    {String(topic.order).padStart(2, "0")}
                  </span>
                  <h2 className="font-mono text-[13px] text-bright font-semibold group-hover:text-info transition-colors">
                    {topic.title}
                  </h2>
                  <span
                    className={`font-mono text-[8px] px-2 py-0.5 rounded border uppercase tracking-wider ${
                      DIFFICULTY_STYLES[topic.difficulty] ?? ""
                    }`}
                  >
                    {DIFFICULTY_LABELS[topic.difficulty]}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-dim/80 leading-relaxed">
                  {topic.summary}
                </p>
                <p className="font-mono text-[8px] text-dim/50 mt-1.5">
                  ~{topic.estimatedMinutes} min
                </p>
              </div>
              <svg
                viewBox="0 0 8 8"
                className="w-2.5 h-2.5 text-dim/30 group-hover:text-info shrink-0 mt-2 fill-none stroke-current"
                strokeWidth="1.2"
              >
                <path d="M1 4h6M4 1l3 3-3 3" />
              </svg>
            </Link>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-rim/30 text-center">
        <p className="font-mono text-[9px] text-dim/40">
          BitFlow · Digital Electronics Academy
          <span className="mx-2">·</span>
          8 modules · articles · quizzes · flashcards · interactives
        </p>
      </footer>
    </div>
  );
}
