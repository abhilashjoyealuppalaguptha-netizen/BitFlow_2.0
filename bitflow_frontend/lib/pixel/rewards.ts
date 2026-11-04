/**
 * lib/pixel/rewards.ts — which reward moments (lib/pixel/celebrate.ts) to play, and when.
 *
 *   rewardMoments(submission)   after a Submit: ACCEPTED and the XP on a first solve, LEVEL n! if one was crossed
 *   unseenBadges(user, badges)  badges earned since this browser last showed them (marks them shown)
 *
 * A re-solve earns no XP, so it plays nothing: repeat practice doesn't pop the same banner every time.
 * Self-check: scripts/pixel.check.ts.
 */

import type { Moment } from "./celebrate";
import { levelFromXp, levelsGained } from "../levels";

export function rewardMoments(sub: { accepted: boolean; xpEarned: number; totalXp?: number | null }): Moment[] {
  if (!sub.accepted || sub.xpEarned <= 0) return [];
  const out: Moment[] = [{ kind: "accepted" }, { kind: "xp", xp: sub.xpEarned }];
  if (typeof sub.totalXp === "number" && levelsGained(sub.totalXp - sub.xpEarned, sub.totalXp) > 0) {
    out.push({ kind: "level", level: levelFromXp(sub.totalXp).level });
  }
  return out;
}

const seenKey = (userId: string) => `bitflow_badges_seen:${userId}`;

/**
 * Badges earned but not yet shown in this browser, as moments; records them as shown. The first time a
 * browser sees a user, everything already earned is recorded silently: only badges earned from then on pop.
 */
export function unseenBadges(userId: string, badges: { id: string; label: string; earned: boolean }[], storage: Pick<Storage, "getItem" | "setItem">): Moment[] {
  const earned = badges.filter((b) => b.earned);
  let seen: string[] | null = null;
  try { seen = JSON.parse(storage.getItem(seenKey(userId)) ?? "null"); } catch { seen = null; }
  try { storage.setItem(seenKey(userId), JSON.stringify(earned.map((b) => b.id))); } catch { /* storage full or blocked */ }
  if (!Array.isArray(seen)) return [];
  return earned.filter((b) => !seen!.includes(b.id)).map((b) => ({ kind: "badge", label: b.label }));
}
