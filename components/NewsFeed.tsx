"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import { groupStories, matchesSearch, type Story } from "@/lib/stories";
import type { Article, TopicId } from "@/lib/types";

// Each section ("Read first", "Everything else") shows at most this many stories, newest
// first. Everything else can be found on the Archive page.
const MAX_PER_SECTION = 20;

interface Props {
  topicId: TopicId;
  articles: Article[];
  categories: string[];
}

export default function NewsFeed({ topicId, articles, categories }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [showOffTopic, setShowOffTopic] = useState(false);

  const sources = useMemo(() => [...new Set(articles.map((a) => a.source))].sort(), [articles]);
  const offTopicCount = articles.filter((a) => a.relevant === false).length;

  const stories = useMemo(() => {
    const shown = (a: Article) => showOffTopic || a.relevant !== false;
    const matches = (a: Article) =>
      shown(a) && (!category || a.category === category) && (!source || a.source === source) && matchesSearch(a, search);
    return groupStories(articles, matches, shown);
  }, [articles, category, source, search, showOffTopic]);

  const readFirst = stories.filter((s) => s.lead.priority === "high" && s.lead.relevant !== false);
  const rest = stories.filter((s) => !readFirst.includes(s));

  // Opens the archive for this topic, carrying over whatever was typed in the search box.
  const archiveParams = new URLSearchParams({ topic: topicId });
  if (search.trim()) archiveParams.set("q", search.trim());
  if (source) archiveParams.set("source", source);
  const archiveHref = `/archive?${archiveParams}`;

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

      <Section
        title="Read first"
        stories={readFirst}
        empty="Nothing flagged as must-read right now."
        archiveHref={`${archiveHref}&priority=high`}
      />
      <Section
        title="Everything else"
        stories={rest}
        empty="No other articles match these filters."
        archiveHref={archiveHref}
      />

      {offTopicCount > 0 && (
        <label className="toggle">
          <input type="checkbox" checked={showOffTopic} onChange={(e) => setShowOffTopic(e.target.checked)} />
          Show {offTopicCount} article{offTopicCount === 1 ? "" : "s"} the AI marked as off-topic
        </label>
      )}

      <p className="more">
        Looking for something older? <Link href={archiveHref}>Search the archive →</Link>
      </p>
    </>
  );
}

function Section({ title, stories, empty, archiveHref }: { title: string; stories: Story[]; empty: string; archiveHref: string }) {
  const visible = stories.slice(0, MAX_PER_SECTION);
  return (
    <>
      <h2 className="section-title">
        {title} <span className="count">{stories.length}</span>
      </h2>
      {visible.length > 0 ? (
        <div className="cards">
          {visible.map((s) => (
            <ArticleCard key={s.lead.id} article={s.lead} alsoCovered={s.others} />
          ))}
        </div>
      ) : (
        <p className="empty">{empty}</p>
      )}
      {stories.length > visible.length && (
        <p className="more">
          Showing the {visible.length} newest of {stories.length}. <Link href={archiveHref}>See the rest in the archive →</Link>
        </p>
      )}
    </>
  );
}
