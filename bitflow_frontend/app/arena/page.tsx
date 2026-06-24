import { getArenaProblems } from "@/lib/db-loader";
import Link from "next/link";

export default async function ArenaHubPage() {
  const problems = await getArenaProblems();

  // Group by difficulty
  const byDifficulty = new Map<string, typeof problems>();
  for (const p of problems) {
    if (!byDifficulty.has(p.difficulty)) {
      byDifficulty.set(p.difficulty, []);
    }
    byDifficulty.get(p.difficulty)!.push(p);
  }

  return (
    <main className="min-h-screen bg-void p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-bright mb-2">HDL Arena</h1>
        <p className="text-dim mb-8">Interview-tier problems. No hints. No hand-holding.</p>

        {Array.from(byDifficulty.entries()).map(([difficulty, probs]) => (
          <div key={difficulty} className="mb-12">
            <h2 className="text-lg font-semibold text-pale mb-4 uppercase tracking-wider">{difficulty}</h2>
            <div className="grid gap-3">
              {probs.map((p) => (
                <Link
                  key={p.slug}
                  href={`/arena/${p.category.toLowerCase()}/${p.slug}`}
                  className="flex items-center justify-between p-4 rounded border border-rim hover:border-phosphor/50 hover:bg-surface transition"
                >
                  <div>
                    <div className="font-mono text-sm text-bright">{p.title}</div>
                    <div className="text-xs text-dim mt-1">{p.statement.substring(0, 100)}...</div>
                  </div>
                  <div className="text-xs font-mono text-phosphor">+{p.xpReward} XP</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}