// Shared by the topic pages and the archive: grouping articles about the same event into
// one story, and matching what someone typed into a search box.

import type { Article } from "@/lib/types";

/** One story: the article we show, plus other outlets' coverage of the same event. */
export interface Story {
  lead: Article;
  others: Article[];
}

const RANK = { high: 0, medium: 1, low: 2 } as const;
// Off-topic articles sort last; not-yet-analyzed ones count as medium.
const rank = (a: Article) => (a.relevant === false ? 3 : RANK[a.priority ?? "medium"]);

/** True if every word in `query` appears in the article's headline, summary, teaser, or outlet. */
export function matchesSearch(a: Article, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = `${a.title} ${a.summary ?? ""} ${a.whyItMatters ?? ""} ${a.snippet} ${a.source}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

/**
 * Group articles by story. `articles` must be sorted newest first, so stories come out
 * ordered by their most recent coverage. A story is kept if any of its articles passes
 * `matches`; the best-ranked matching article (earliest on ties) leads, and the story's other
 * articles that pass `include` are listed as "Also covered by".
 */
export function groupStories(
  articles: Article[],
  matches: (a: Article) => boolean,
  include: (a: Article) => boolean = () => true,
): Story[] {
  const groups = new Map<string, Article[]>();
  for (const a of articles) {
    const key = a.storyId ?? a.id;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  const result: Story[] = [];
  for (const members of groups.values()) {
    const lead = members
      .filter(matches)
      .sort((a, b) => rank(a) - rank(b) || a.publishedAt.localeCompare(b.publishedAt))[0];
    if (!lead) continue;
    result.push({ lead, others: members.filter((a) => a !== lead && include(a)) });
  }
  return result;
}
