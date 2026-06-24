/**
 * content/index.ts — Digital Electronics Academy content barrel
 *
 * Re-exports the topic registry for convenience.
 * Add new topics by placing JSON in content/<slug>/index.json
 * and registering in lib/academy-content.ts.
 */

export {
  ACADEMY_TOPICS,
  ACADEMY_TOPIC_META,
  getTopicBySlug,
  getTopicSlugs,
  getNextTopic,
  getPrevTopic,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
} from "@/lib/academy-content";

export type {
  AcademyTopic,
  AcademyTopicMeta,
  AcademySection,
  AcademyQuizQuestion,
  AcademyFlashcard,
  AcademyVideo,
  InteractiveWidgetId,
} from "@/lib/academy-types";
