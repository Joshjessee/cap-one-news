// Shared data shapes used by both the refresh script and the website.

export type TopicId = "capital-one" | "ai";

export type Priority = "high" | "medium" | "low";

export interface Article {
  /** Stable id derived from the article URL. */
  id: string;
  title: string;
  url: string;
  /** Display name of the outlet, e.g. "Reuters". */
  source: string;
  paywalled: boolean;
  /** ISO timestamp from the feed. */
  publishedAt: string;
  /** Short public teaser text from the feed (never the full article). */
  snippet: string;
  /** ISO timestamp of when our refresh script first saw this article. */
  firstSeenAt: string;

  // Filled in by Claude. Missing until the article has been analyzed.
  analyzedAt?: string;
  relevant?: boolean;
  summary?: string;
  whyItMatters?: string;
  priority?: Priority;
  category?: string;
  /** Which version of the analysis prompt produced these fields (see scripts/refresh.ts). */
  analysisVersion?: number;
  /** Id of the article that started this story. Missing = this article is its own story. */
  storyId?: string;
}

export interface TopicData {
  topic: TopicId;
  /** ISO timestamp of the last successful refresh, or null before the first one. */
  updatedAt: string | null;
  /** 3–5 bullet "Today's briefing" written by Claude. */
  briefing: string[];
  briefingUpdatedAt: string | null;
  articles: Article[];
}
