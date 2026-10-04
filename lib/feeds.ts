// Fetches raw articles from Google News RSS and the Federal Register API.
// Only articles from outlets listed in config/sources.ts are kept.

import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { findOutlet, OUTLETS, type TopicConfig } from "@/config/sources";

/** An article as it comes out of a feed, before Claude has looked at it. */
export interface RawArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  paywalled: boolean;
  publishedAt: string;
  snippet: string;
}

const USER_AGENT = "cap-one-news/1.0 (news briefing site; +https://github.com/joshjessee/cap-one-news)";

export function articleId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/** Lowercase, strip punctuation: lets us spot the same headline from two queries. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function googleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string; "@_url"?: string };
}

/** Turn a Google News RSS document into articles from our trusted outlets. */
export function parseGoogleNewsRss(rss: string): RawArticle[] {
  const doc = xml.parse(rss);
  const rawItems = doc?.rss?.channel?.item ?? [];
  const items: GoogleNewsItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

  const articles: RawArticle[] = [];
  for (const item of items) {
    const sourceUrl = typeof item.source === "object" ? item.source["@_url"] : undefined;
    const sourceName = typeof item.source === "object" ? item.source["#text"] : item.source;
    if (!sourceUrl || !item.link || !item.title) continue;

    const outlet = findOutlet(sourceUrl);
    if (!outlet) continue; // Not a source we trust → skip

    // Google appends " - Outlet Name" to headlines; remove it.
    let title = String(item.title);
    if (sourceName && title.endsWith(` - ${sourceName}`)) {
      title = title.slice(0, -(sourceName.length + 3));
    }

    // The description usually just repeats the headline; only keep it if it adds something.
    let snippet = stripHtml(String(item.description ?? ""));
    if (sourceName) snippet = snippet.replace(new RegExp(`\\s*${escapeRegExp(sourceName)}$`), "");
    if (normalizeTitle(snippet).startsWith(normalizeTitle(title))) snippet = "";

    const published = item.pubDate ? new Date(item.pubDate) : new Date();
    articles.push({
      id: articleId(item.link),
      title,
      url: item.link,
      source: outlet.name,
      paywalled: outlet.paywalled,
      publishedAt: isNaN(published.getTime()) ? new Date().toISOString() : published.toISOString(),
      snippet,
    });
  }
  return articles;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface FederalRegisterDoc {
  title: string;
  abstract: string | null;
  html_url: string;
  publication_date: string;
  type: string;
  agencies?: { name?: string }[];
}

/** AI-related rules, notices and presidential documents from the Federal Register. */
async function fetchFederalRegister(sinceDays: number): Promise<RawArticle[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    "conditions[term]": '"artificial intelligence"',
    "conditions[publication_date][gte]": since,
    order: "newest",
    per_page: "25",
  });
  for (const f of ["title", "abstract", "html_url", "publication_date", "type", "agencies"]) {
    params.append("fields[]", f);
  }
  const body = await fetchText(`https://www.federalregister.gov/api/v1/documents.json?${params}`);
  const results: FederalRegisterDoc[] = JSON.parse(body).results ?? [];
  const outlet = OUTLETS.find((o) => o.domain === "federalregister.gov")!;

  return results.map((doc) => {
    const agencies = (doc.agencies ?? []).map((a) => a.name).filter(Boolean).join(", ");
    return {
      id: articleId(doc.html_url),
      title: doc.title,
      url: doc.html_url,
      source: outlet.name,
      paywalled: false,
      // Federal Register dates have no time; treat as noon Eastern so "x hours ago" is sensible.
      publishedAt: new Date(`${doc.publication_date}T16:00:00Z`).toISOString(),
      snippet: [doc.type, agencies, doc.abstract].filter(Boolean).join(" — ").slice(0, 600),
    };
  });
}

/**
 * Fetch every feed for a topic. A feed that fails is logged and skipped,
 * so one broken source never stops the whole refresh.
 */
export async function fetchTopicArticles(
  topic: TopicConfig,
): Promise<{ articles: RawArticle[]; feedsTried: number; feedsFailed: number }> {
  const queries = [...topic.queries];
  if (topic.coreOutletPhrase) {
    for (const outlet of OUTLETS.filter((o) => o.core)) {
      queries.push(`${topic.coreOutletPhrase} site:${outlet.domain} when:3d`);
    }
  }

  let feedsFailed = 0;
  const jobs: Promise<RawArticle[]>[] = queries.map(async (q) => {
    try {
      const found = parseGoogleNewsRss(await fetchText(googleNewsUrl(q)));
      console.log(`  ✓ ${found.length.toString().padStart(3)} from Google News: ${q}`);
      return found;
    } catch (err) {
      console.warn(`  ✗ Google News query failed (${q}): ${(err as Error).message}`);
      feedsFailed++;
      return [];
    }
  });

  if (topic.includeFederalRegister) {
    jobs.push(
      fetchFederalRegister(7)
        .then((found) => {
          console.log(`  ✓ ${found.length.toString().padStart(3)} from the Federal Register`);
          return found;
        })
        .catch((err) => {
          console.warn(`  ✗ Federal Register failed: ${(err as Error).message}`);
          feedsFailed++;
          return [];
        }),
    );
  }

  const articles = dedupe((await Promise.all(jobs)).flat());
  return { articles, feedsTried: jobs.length, feedsFailed };
}

/** Remove repeats: same link, or the same headline from the same outlet. */
export function dedupe(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const out: RawArticle[] = [];
  for (const a of articles) {
    const titleKey = `${a.source}|${normalizeTitle(a.title)}`;
    if (seen.has(a.id) || seen.has(titleKey)) continue;
    seen.add(a.id);
    seen.add(titleKey);
    out.push(a);
  }
  return out;
}
