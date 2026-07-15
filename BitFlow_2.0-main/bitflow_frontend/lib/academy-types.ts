/**
 * lib/academy-types.ts — Digital Electronics Academy content schema
 *
 * Content lives in bitflow_frontend/content/ as JSON.
 * Renderers in components/academy/ consume these types.
 */

export type AcademyDifficulty = "foundations" | "core" | "advanced";

export type InteractiveWidgetId =
  | "boolean-algebra-builder"
  | "number-system-converter"
  | "logic-gate-playground"
  | "flip-flop-toggle"
  | "fsm-explorer"
  | "memory-visualizer";

export interface AcademySection {
  id: string;
  heading: string;
  body: string;
  /** Optional bullet points rendered below body */
  bullets?: string[];
  /** Optional callout box (tip, warning, note) */
  callout?: {
    type: "tip" | "warning" | "note";
    text: string;
  };
}

export interface AcademyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AcademyFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface AcademyVideo {
  id: string;
  title: string;
  url: string;
  duration?: string;
  channel?: string;
}

export interface AcademyTopic {
  slug: string;
  title: string;
  summary: string;
  icon: string;
  difficulty: AcademyDifficulty;
  order: number;
  estimatedMinutes: number;
  prerequisites?: string[];
  sections: AcademySection[];
  quiz: AcademyQuizQuestion[];
  flashcards: AcademyFlashcard[];
  videos: AcademyVideo[];
  /** Primary interactive widget for this topic */
  interactive?: InteractiveWidgetId;
  /** Secondary widgets shown in "More to explore" */
  extraInteractives?: InteractiveWidgetId[];
}

export interface AcademyTopicMeta {
  slug: string;
  title: string;
  summary: string;
  icon: string;
  difficulty: AcademyDifficulty;
  order: number;
  estimatedMinutes: number;
}

export interface AcademyProgress {
  completedTopics: string[];
  quizScores: Record<string, number>;
  lastVisited?: string;
}
