"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { Article } from "@/lib/types";

interface Props {
  articles: Article[];
  categories: string[];
}

/** One story: the article we show, plus other outlets' coverage of the same event. */
interface Story {
  lead: Article;
  others: Article[];
}

const RANK = { high: 0, medium: 1, low: 2 } as const;
// Off-topic articles sort last; not-yet-analyzed ones count as medium.
const rank = (a: Article) => (a.relevant === false ? 3 : RANK[a.priority ?? "medium"]);

export default function NewsFeed({ articles, categories }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [showOffTopic, setShowOffTopic] = useState(false);

  const sources = useMemo(() => [...new Set(articles.map((a) => a.source))].sort(), [articles]);
  const offTopicCount = articles.filter((a) => a.relevant === false).length;

  const stories = useMemo(() => {
    const q = search.trim().toLowerCase();
    const shown = (a: Article) => showOffTopic || a.relevant !== false;
    const matches = (a: Article) =>
      shown(a) &&
      (!category || a.category === category) &&
      (!source || a.source === source) &&
      (!q || `${a.title} ${a.summary ?? ""} ${a.snippet}`.toLowerCase().includes(q));

    // Group by story. Articles are sorted newest first, so stories end up ordered by
    // their most recent coverage.
    const groups = new Map<string, Article[]>();
    for (const a of articles) {
      const key = a.storyId ?? a.id;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }

    const result: Story[] = [];
    for (const members of groups.values()) {
      // A story is shown if any of its articles matches the filters; the best-ranked
      // matching article (earliest on ties) leads.
      const lead = members
        .filter(matches)
        .sort((a, b) => rank(a) - rank(b) || a.publishedAt.localeCompare(b.publishedAt))[0];
      if (!lead) continue;
      result.push({ lead, others: members.filter((a) => a !== lead && shown(a)) });
    }
    return result;
  }, [articles, category, source, search, showOffTopic]);

  const readFirst = stories.filter((s) => s.lead.priority === "high" && s.lead.relevant !== false);
  const rest = stories.filter((s) => !readFirst.includes(s));

  if (articles.length === 0) {
    return <p className="empty">No articles yet. The news refresh runs automatically every couple of hours.</p>;
  }

  return (
    <>
      <div className="filters" role="group" aria-label="Filter by category">
        <button className={`chip${category === null ? " selected" : ""}`} onClick={() => setCategory(null)}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`chip${category === c ? " selected" : ""}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="filter-row">
        <input
          type="search"
          placeholder="Search headlines and summaries"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by outlet">
          <option value="">All outlets</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <h2 className="section-title">
        Read first <span className="count">{readFirst.length}</span>
      </h2>
      {readFirst.length > 0 ? (
        <div className="cards">
          {readFirst.map((s) => (
            <ArticleCard key={s.lead.id} article={s.lead} alsoCovered={s.others} />
          ))}
        </div>
      ) : (
        <p className="empty">Nothing flagged as must-read right now.</p>
      )}

      <h2 className="section-title">
        Everything else <span className="count">{rest.length}</span>
      </h2>
      {rest.length > 0 ? (
        <div className="cards">
          {rest.map((s) => (
            <ArticleCard key={s.lead.id} article={s.lead} alsoCovered={s.others} />
          ))}
        </div>
      ) : (
        <p className="empty">No other articles match these filters.</p>
      )}

      {offTopicCount > 0 && (
        <label className="toggle">
          <input type="checkbox" checked={showOffTopic} onChange={(e) => setShowOffTopic(e.target.checked)} />
          Show {offTopicCount} article{offTopicCount === 1 ? "" : "s"} the AI marked as off-topic
        </label>
      )}
    </>
  );
}
