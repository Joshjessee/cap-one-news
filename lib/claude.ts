// Uses Claude to summarize articles, flag priority, and write the daily briefing.
// Claude only ever sees the public headline + teaser text from the feed, never full articles.

import Anthropic from "@anthropic-ai/sdk";
import { betaJSONSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import type { AutoParseableBetaOutputFormat } from "@anthropic-ai/sdk/lib/beta-parser";
import type { TopicConfig } from "@/config/sources";
import type { Article, Priority } from "@/lib/types";
import type { RawArticle } from "@/lib/feeds";

const MODEL = "claude-opus-5-5";

// How many articles to send to Claude in one request.
const BATCH_SIZE = 40;

let client: Anthropic | undefined;
function getClient(): Anthropic {
  // Reads the ANTHROPIC_API_KEY environment variable automatically.
  client ??= new Anthropic();
  return client;
}

/**
 * Shared request options: low effort keeps cost down; fallbacks keep the job running if a
 * request is declined. Formats are built with `transform: false`, which sends our schema
 * as-is so the API enforces the "enum" lists exactly.
 */
async function ask<T>(system: string, prompt: string, format: AutoParseableBetaOutputFormat<T>): Promise<T> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude's answer was cut off (max_tokens)");
  }
  if (!response.parsed_output) {
    throw new Error("Claude's answer didn't match the expected format");
  }
  return response.parsed_output;
}

function analysisFormat(topic: TopicConfig) {
  return betaJSONSchemaOutputFormat(
    {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              relevant: { type: "boolean" },
              summary: { type: "string" },
              why_it_matters: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              category: { type: "string", enum: topic.categories },
            },
            required: ["id", "relevant", "summary", "why_it_matters", "priority", "category"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    } as const,
    { transform: false },
  );
}

export interface Analysis {
  relevant: boolean;
  summary: string;
  whyItMatters: string;
  priority: Priority;
  category: string;
}

/** Summarize and prioritize a list of articles. Returns results keyed by article id. */
export async function analyzeArticles(
  topic: TopicConfig,
  articles: RawArticle[],
): Promise<Map<string, Analysis>> {
  const system = `You help a busy policy team at Capital One decide what news to read.
You only see each article's headline, outlet, date, and (sometimes) a short public teaser —
not the full text. Never invent facts that aren't supported by what you're given; if the
headline is all you have, summarize what the article is evidently about.

${topic.guidance}

For EVERY article you are given, return one result with the same id:
- relevant: see the rules above.
- summary: one or two plain-English sentences on what happened.
- why_it_matters: one short sentence on why this team should (or needn't) care.
- priority: high, medium, or low, using the rules above.
- category: the best fit from the allowed list.`;

  const results = new Map<string, Analysis>();
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const listing = batch
      .map((a) =>
        JSON.stringify({
          id: a.id,
          outlet: a.source,
          published: a.publishedAt,
          headline: a.title,
          ...(a.snippet ? { teaser: a.snippet } : {}),
        }),
      )
      .join("\n");

    const out = await ask(system, `Analyze these ${batch.length} articles:\n\n${listing}`, analysisFormat(topic));
    for (const r of out.results) {
      results.set(r.id, {
        relevant: r.relevant,
        summary: r.summary,
        whyItMatters: r.why_it_matters,
        // Belt and braces in case a value ever slips outside the allowed lists.
        priority: (["high", "medium", "low"] as const).find((p) => p === r.priority) ?? "medium",
        category: topic.categories.includes(r.category) ? r.category : "Other",
      });
    }
  }
  return results;
}

const briefingFormat = betaJSONSchemaOutputFormat(
  {
    type: "object",
    properties: { bullets: { type: "array", items: { type: "string" } } },
    required: ["bullets"],
    additionalProperties: false,
  } as const,
  { transform: false },
);

/** Write the 3–5 bullet "Today's briefing" from the most recent relevant articles. */
export async function writeBriefing(topic: TopicConfig, articles: Article[]): Promise<string[]> {
  const system = `You write a short morning-style briefing for a policy team at Capital One.
${topic.guidance}

Write 3 to 5 bullets covering the most important developments in the articles provided.
Each bullet is one or two sentences, leads with the news, and names the outlet(s) in
parentheses at the end, e.g. "(Reuters, Politico)". Group articles about the same story into
one bullet. Put the most important item first. Plain text only — no markdown.`;

  const listing = articles
    .map((a) =>
      JSON.stringify({
        outlet: a.source,
        published: a.publishedAt,
        priority: a.priority,
        headline: a.title,
        summary: a.summary,
      }),
    )
    .join("\n");

  const out = await ask(system, `Recent articles:\n\n${listing}`, briefingFormat);
  return out.bullets.slice(0, 5);
}
