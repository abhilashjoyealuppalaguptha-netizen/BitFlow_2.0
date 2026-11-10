/**
 * lib/levels.ts — numbered levels from total XP, and the tier titles.
 *
 * Level n starts at 50·n·(n−1) XP: 100 for level 2, 1000 for level 5 (Builder), about 3000 for
 * level 8 (Engineer), about 7000 for level 12 (Architect). Each level needs 100 XP more than the last.
 * Self-check: scripts/pixel.check.ts.
 */

/** Total XP at which level n begins (n ≥ 1). */
export const xpForLevel = (n: number): number => 50 * n * (n - 1);

/** The level for an XP total, and progress into it. */
export function levelFromXp(xp: number): { level: number; into: number; needed: number; next: number } {
  const total = Math.max(0, Math.floor(xp));
  // Largest n with 50·n·(n−1) ≤ total, then nudged for floating point.
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + total / 12.5)) / 2));
  while (xpForLevel(level + 1) <= total) level++;
  while (level > 1 && xpForLevel(level) > total) level--;
  const start = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, into: total - start, needed: next - start, next };
}

/** Levels gained between two XP totals (0 if none). */
export const levelsGained = (before: number, after: number): number => levelFromXp(after).level - levelFromXp(before).level;

/** The tier title for an XP total, with its text colour class. */
export function tierFromXp(xp: number): { label: string; color: string } {
  if (xp >= 7000) return { label: "Architect", color: "text-phosphor-glow" };
  if (xp >= 3000) return { label: "Engineer", color: "text-phosphor" };
  if (xp >= 1000) return { label: "Builder", color: "text-info" };
  return { label: "Novice", color: "text-ghost" };
}
