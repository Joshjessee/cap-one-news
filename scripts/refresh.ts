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
import { analyzeArticles, writeBriefing } from "@/lib/claude";
import type { Article, TopicData, TopicId } from "@/lib/types";

const KEEP_DAYS = 14; // Articles older than this are removed
const MAX_TO_ANALYZE = 120; // Per topic per run, to cap cost if a feed suddenly floods
const BRIEFING_MAX_AGE_HOURS = 24;
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

  // 3. Ask Claude about anything not analyzed yet (newest first).
  let newlyRelevant = 0;
  if (useAi) {
    const pending = articles
      .filter((a) => !a.analyzedAt)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, MAX_TO_ANALYZE);
    if (pending.length > 0) {
      console.log(`  Asking Claude about ${pending.length} articles…`);
      try {
        const results = await analyzeArticles(topic, pending);
        articles = articles.map((a) => {
          const r = results.get(a.id);
          if (!r) return a;
          if (r.relevant) newlyRelevant++;
          return { ...a, ...r, analyzedAt: now };
        });
        console.log(`  Claude analyzed ${results.size}; ${newlyRelevant} relevant`);
      } catch (err) {
        // Leave them un-analyzed; the next run will try again.
        console.warn(`  ✗ Claude analysis failed: ${(err as Error).message}`);
      }
    }
  }

  // 4. Rewrite the briefing when there's relevant news, or once it's a day old.
  let briefing = data.briefing;
  let briefingUpdatedAt = data.briefingUpdatedAt;
  if (useAi && (newlyRelevant > 0 || hoursSince(briefingUpdatedAt) > BRIEFING_MAX_AGE_HOURS)) {
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
