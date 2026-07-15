/**
 * lib/academy-content.ts — Digital Electronics Academy topic registry
 *
 * Loads static JSON content and exposes lookup helpers.
 * 80% data / 20% code: add topics by dropping JSON in content/.
 */

import type { AcademyTopic, AcademyTopicMeta } from "./academy-types";

import booleanAlgebra   from "@/content/boolean-algebra/index.json";
import numberSystems    from "@/content/number-systems/index.json";
import gates            from "@/content/gates/index.json";
import combinational    from "@/content/combinational/index.json";
import sequential       from "@/content/sequential/index.json";
import timing           from "@/content/timing/index.json";
import fsms             from "@/content/fsms/index.json";
import memory           from "@/content/memory/index.json";

const RAW_TOPICS: AcademyTopic[] = [
  booleanAlgebra,
  numberSystems,
  gates,
  combinational,
  sequential,
  timing,
  fsms,
  memory,
] as AcademyTopic[];

/** All topics sorted by curriculum order */
export const ACADEMY_TOPICS: AcademyTopic[] = [...RAW_TOPICS].sort(
  (a, b) => a.order - b.order
);

/** Lightweight metadata for hub cards */
export const ACADEMY_TOPIC_META: AcademyTopicMeta[] = ACADEMY_TOPICS.map(
  ({ slug, title, summary, icon, difficulty, order, estimatedMinutes }) => ({
    slug,
    title,
    summary,
    icon,
    difficulty,
    order,
    estimatedMinutes,
  })
);

export function getTopicBySlug(slug: string): AcademyTopic | undefined {
  return ACADEMY_TOPICS.find((t) => t.slug === slug);
}

export function getTopicSlugs(): string[] {
  return ACADEMY_TOPICS.map((t) => t.slug);
}

export function getNextTopic(slug: string): AcademyTopic | undefined {
  const idx = ACADEMY_TOPICS.findIndex((t) => t.slug === slug);
  if (idx < 0 || idx >= ACADEMY_TOPICS.length - 1) return undefined;
  return ACADEMY_TOPICS[idx + 1];
}

export function getPrevTopic(slug: string): AcademyTopic | undefined {
  const idx = ACADEMY_TOPICS.findIndex((t) => t.slug === slug);
  if (idx <= 0) return undefined;
  return ACADEMY_TOPICS[idx - 1];
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  foundations: "Foundations",
  core:        "Core",
  advanced:    "Advanced",
};

export const DIFFICULTY_STYLES: Record<string, string> = {
  foundations: "border-phosphor/30 bg-phosphor/10 text-phosphor",
  core:        "border-info/30 bg-info/10 text-info",
  advanced:    "border-warn/30 bg-warn/10 text-warn",
};
