// Refresh the news data.
//
//   npm run refresh            → fetch news, summarize new articles with Claude, save data/*.json
//   npm run refresh -- --no-ai → fetch news only (no Claude, no cost)
//
// Runs automatically on a schedule via .github/workflows/refresh-news.yml.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOPICS, type TopicConfig } from "@/config/sources";
import { fetchTopicArticles, normalizeTitle } from "@/lib/feeds";
import { analyzeArticles, writeBriefing, type Analysis } from "@/lib/claude";
import type { Article, TopicData, TopicId } from "@/lib/types";

const KEEP_DAYS = 14; // Articles older than this are removed
const MAX_TO_ANALYZE = 120; // Per topic per run, to cap cost if a feed suddenly floods
const BRIEFING_MAX_AGE_HOURS = 24;
const STORY_MATCH_HOURS = 72; // New articles can be grouped with relevant articles this recent
const MAX_KNOWN_STORIES = 60;
// Bump this when the analysis prompt changes in a way that should re-check saved articles.
// Version 2 added same-story grouping.
const ANALYSIS_VERSION = 2;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

const DATA_DIR = path.join(process.cwd(), "data");

async function load(topic: TopicId): Promise<TopicData> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, `${topic}.json`), "utf8"));
  } catch {
    return { topic, updatedAt: null, briefing: [], briefingUpdatedAt: null, articles: [] };
  }
}

const hoursSince = (iso: string | null | undefined) =>
  iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity;

/** Returns false if every feed for the topic failed. */
async function refreshTopic(topic: TopicConfig, useAi: boolean): Promise<boolean> {
  console.log(`\n▶ ${topic.label}`);
  const data = await load(topic.id);
  const before = JSON.stringify({ a: data.articles, b: data.briefing });
  const now = new Date().toISOString();

  // 1. Fetch and keep only articles we haven't stored before.
  const known = new Set(data.articles.flatMap((a) => [a.id, `${a.source}|${normalizeTitle(a.title)}`]));
  const { articles: fetched, feedsTried, feedsFailed } = await fetchTopicArticles(topic);
  const fresh: Article[] = fetched
    .filter((a) => !known.has(a.id) && !known.has(`${a.source}|${normalizeTitle(a.title)}`))
    .map((a) => ({ ...a, firstSeenAt: now }));
  console.log(`  ${fetched.length} articles from trusted outlets, ${fresh.length} new`);
  const feedsOk = feedsFailed < feedsTried;

  // 2. Merge and drop anything too old.
  let articles = [...data.articles, ...fresh].filter((a) => hoursSince(a.publishedAt) <= KEEP_DAYS * 24);

  // 3. Ask Claude about anything not analyzed (with the current prompt) yet, newest first.
  let newlyRelevant = 0;
  let newlyImportant = 0; // relevant and medium/high priority
  if (useAi) {
    const isPending = (a: Article) => !a.analyzedAt || (a.analysisVersion ?? 1) < ANALYSIS_VERSION;
    const newestFirst = (a: Article, b: Article) => b.publishedAt.localeCompare(a.publishedAt);
    const pending = articles.filter(isPending).sort(newestFirst).slice(0, MAX_TO_ANALYZE);
    const knownStories = articles
      .filter((a) => !isPending(a) && a.relevant && hoursSince(a.publishedAt) <= STORY_MATCH_HOURS)
      .sort(newestFirst)
      .slice(0, MAX_KNOWN_STORIES);

    if (pending.length > 0) {
      console.log(`  Asking Claude about ${pending.length} articles…`);
      try {
        const results = await analyzeArticles(topic, pending, knownStories);
        articles = articles.map((a) => {
          const r = results.get(a.id);
          if (!r) return a;
          if (r.relevant) newlyRelevant++;
          if (r.relevant && r.priority !== "low") newlyImportant++;
          const { relevant, summary, whyItMatters, priority, category } = r;
          return {
            ...a,
            ...{ relevant, summary, whyItMatters, priority, category },
            storyId: undefined, // set below by assignStories
            analysisVersion: ANALYSIS_VERSION,
            analyzedAt: now,
          };
        });
        articles = assignStories(articles, results);
        const grouped = articles.filter((a) => a.storyId && results.has(a.id)).length;
        console.log(`  Claude analyzed ${results.size}; ${newlyRelevant} relevant; ${grouped} grouped with another story`);
      } catch (err) {
        // Leave them un-analyzed; the next run will try again.
        console.warn(`  ✗ Claude analysis failed: ${(err as Error).message}`);
      }
    }
  }

  // 4. Rewrite the briefing when important news arrives, or once it's a day old.
  let briefing = data.briefing;
  let briefingUpdatedAt = data.briefingUpdatedAt;
  if (useAi && (newlyImportant > 0 || hoursSince(briefingUpdatedAt) > BRIEFING_MAX_AGE_HOURS)) {
    const relevant = articles.filter((a) => a.relevant && a.summary);
    let recent = relevant.filter((a) => hoursSince(a.publishedAt) <= 48);
    if (recent.length < 3) recent = relevant.filter((a) => hoursSince(a.publishedAt) <= 7 * 24);
    recent = recent
      .sort(
        (a, b) =>
          PRIORITY_RANK[a.priority ?? "low"] - PRIORITY_RANK[b.priority ?? "low"] ||
          b.publishedAt.localeCompare(a.publishedAt),
      )
      .slice(0, 30);

    if (recent.length > 0) {
      try {
        briefing = await writeBriefing(topic, recent);
        briefingUpdatedAt = now;
        console.log(`  Briefing updated (${briefing.length} bullets)`);
      } catch (err) {
        console.warn(`  ✗ Briefing failed: ${(err as Error).message}`);
      }
    }
  }

  // 5. Save, but only if something actually changed (avoids pointless redeploys).
  articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (JSON.stringify({ a: articles, b: briefing }) === before) {
    console.log("  No changes");
    return feedsOk;
  }
  const out: TopicData = { topic: topic.id, updatedAt: now, briefing, briefingUpdatedAt, articles };
  await writeFile(path.join(DATA_DIR, `${topic.id}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`  Saved ${articles.length} articles`);
  return feedsOk;
}

/**
 * Turn Claude's "same story as <id>" answers into storyIds that all point at the story's
 * first article, so a group never chains (A → B → C becomes A → C, B → C).
 */
function assignStories(articles: Article[], results: Map<string, Analysis>): Article[] {
  const byId = new Map(articles.map((a) => [a.id, a]));

  const rootOf = (id: string): string => {
    const seen = new Set<string>();
    let current = id;
    while (!seen.has(current)) {
      seen.add(current);
      const next = results.get(current)?.sameStoryAs ?? byId.get(current)?.storyId;
      if (!next || !byId.has(next)) break;
      current = next;
    }
    return current;
  };

  return articles.map((a) => {
    if (!results.has(a.id)) return a;
    const root = rootOf(a.id);
    return root === a.id ? a : { ...a, storyId: root };
  });
}

async function main() {
  let useAi = !process.argv.includes("--no-ai");
  if (useAi && !process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠ ANTHROPIC_API_KEY is not set — fetching headlines only, no summaries.");
    useAi = false;
  }
  let anyFeedWorked = false;
  for (const topic of Object.values(TOPICS)) {
    if (await refreshTopic(topic, useAi)) anyFeedWorked = true;
  }
  if (!anyFeedWorked) {
    // Fail the scheduled job so GitHub emails the repo owner.
    console.error("\n✗ Every news feed failed. Check the network or the feed addresses in config/sources.ts.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
