import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TopicView from "@/components/academy/TopicView";
import {
  getTopicBySlug,
  getTopicSlugs,
  getNextTopic,
  getPrevTopic,
} from "@/lib/academy-content";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getTopicSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const topic = getTopicBySlug(params.slug);
  if (!topic) return { title: "Not Found — BitFlow Academy" };
  return {
    title: `${topic.title} — BitFlow Academy`,
    description: topic.summary,
  };
}

export default function AcademyTopicPage({ params }: Props) {
  const topic = getTopicBySlug(params.slug);
  if (!topic) notFound();

  return (
    <TopicView
      topic={topic}
      prev={getPrevTopic(params.slug)}
      next={getNextTopic(params.slug)}
    />
  );
}
