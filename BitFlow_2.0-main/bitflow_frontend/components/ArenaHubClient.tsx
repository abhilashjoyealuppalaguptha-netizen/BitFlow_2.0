"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbProblem } from "@/lib/db-loader";

interface ArenaHubClientProps {
  problems: DbProblem[];
}

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard", "Expert"];

function difficultyRank(value: string) {
  const index = DIFFICULTY_ORDER.findIndex((item) => item.toLowerCase() === value.toLowerCase());
  return index === -1 ? DIFFICULTY_ORDER.length : index;
}

export default function ArenaHubClient({ problems }: ArenaHubClientProps) {
  const difficulties = Array.from(new Set(problems.map((p) => p.difficulty)))
    .sort((a, b) => difficultyRank(a) - difficultyRank(b) || a.localeCompare(b));

  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  const visibleProblems = useMemo(() => {
    if (selectedDifficulty === "All") return problems;
    return problems.filter((p) => p.difficulty === selectedDifficulty);
  }, [problems, selectedDifficulty]);

  const byDifficulty = useMemo(() => {
    const groups = new Map<string, DbProblem[]>();
    for (const problem of visibleProblems) {
      const existing = groups.get(problem.difficulty) ?? [];
      existing.push(problem);
      groups.set(problem.difficulty, existing);
    }

    return Array.from(groups.entries()).sort(
      ([a], [b]) => difficultyRank(a) - difficultyRank(b) || a.localeCompare(b)
    );
  }, [visibleProblems]);

  return (
    <main className="min-h-screen bg-void text-bright">
      <header className="sticky top-0 z-10 h-12 flex items-center justify-between px-6 bg-surface/90 border-b border-rim backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bitflow_logo_2.png" alt="BitFlow" className="w-7 h-7 object-contain" />
          <div className="leading-none">
            <div className="font-display text-[13px] font-bold">BitFlow</div>
            <div className="font-mono text-[9px] text-dim uppercase tracking-widest">HDL Arena</div>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/" className="font-mono text-[10px] text-dim hover:text-ghost transition-colors">
            Home
          </Link>
          <Link href="/sandbox" className="font-mono text-[10px] text-dim hover:text-ghost transition-colors">
            Sandbox IDE
          </Link>
          <Link href="/learn" className="font-mono text-[10px] text-dim hover:text-ghost transition-colors">
            Learn
          </Link>
          <Link href="/academy" className="font-mono text-[10px] text-dim hover:text-ghost transition-colors">
            Academy
          </Link>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-bright mb-2">HDL Arena</h1>
            <p className="text-dim">Interview-tier problems. No hints. No hand-holding.</p>
          </div>

          <label className="flex flex-col gap-1 font-mono text-[10px] text-dim uppercase tracking-wider">
            Difficulty
            <select
              value={selectedDifficulty}
              onChange={(event) => setSelectedDifficulty(event.target.value)}
              className="min-w-[180px] rounded border border-rim bg-surface px-3 py-2 text-[11px] text-bright outline-none focus:border-phosphor/60"
            >
              <option value="All">All difficulties</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
        </div>

        {byDifficulty.length === 0 ? (
          <div className="rounded border border-rim bg-surface/30 p-8 text-center text-sm text-dim">
            No arena problems found for this difficulty.
          </div>
        ) : (
          byDifficulty.map(([difficulty, groupedProblems]) => (
            <section key={difficulty} className="mb-12">
              <h2 className="text-lg font-semibold text-pale mb-4 uppercase tracking-wider">
                {difficulty}
              </h2>
              <div className="grid gap-3">
                {groupedProblems.map((problem) => (
                  <Link
                    key={problem.slug}
                    href={`/arena/${problem.category.toLowerCase()}/${problem.slug}`}
                    className="flex items-center justify-between gap-4 p-4 rounded border border-rim hover:border-phosphor/50 hover:bg-surface transition"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-bright">{problem.title}</div>
                      <div className="text-xs text-dim mt-1 line-clamp-2">
                        {problem.statement.substring(0, 140)}...
                      </div>
                    </div>
                    <div className="text-xs font-mono text-phosphor shrink-0">
                      +{problem.xpReward} XP
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
