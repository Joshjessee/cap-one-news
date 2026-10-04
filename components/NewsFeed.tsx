"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { Article } from "@/lib/types";

interface Props {
  articles: Article[];
  categories: string[];
}

export default function NewsFeed({ articles, categories }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [showOffTopic, setShowOffTopic] = useState(false);

  const sources = useMemo(() => [...new Set(articles.map((a) => a.source))].sort(), [articles]);
  const offTopicCount = articles.filter((a) => a.relevant === false).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (showOffTopic || a.relevant !== false) &&
        (!category || a.category === category) &&
        (!source || a.source === source) &&
        (!q || `${a.title} ${a.summary ?? ""} ${a.snippet}`.toLowerCase().includes(q)),
    );
  }, [articles, category, source, search, showOffTopic]);

  // Articles are already sorted newest first.
  const readFirst = visible.filter((a) => a.priority === "high" && a.relevant !== false);
  const rest = visible.filter((a) => !readFirst.includes(a));

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
          {readFirst.map((a) => (
            <ArticleCard key={a.id} article={a} />
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
          {rest.map((a) => (
            <ArticleCard key={a.id} article={a} />
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
