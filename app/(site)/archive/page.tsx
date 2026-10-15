// The archive: search every article we've ever collected, including ones that have dropped
// off the main pages. Searching happens on the server, so visitors only download the results.
import Form from "next/form";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import { TOPICS } from "@/config/sources";
import aiArchive from "@/data/archive/ai.json";
import capitalOneArchive from "@/data/archive/capital-one.json";
import ai from "@/data/ai.json";
import capitalOne from "@/data/capital-one.json";
import { easternDay } from "@/lib/format";
import { groupStories, matchesSearch, type Story } from "@/lib/stories";
import type { ArchiveData, Article, Priority, TopicData, TopicId } from "@/lib/types";

export const metadata = { title: "Archive · Policy News Briefing" };

const PAGE_SIZE = 25;
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "high", label: "Read first" },
  { value: "medium", label: "Worth a look" },
  { value: "low", label: "FYI" },
];

/** Current articles plus archived ones, newest first, without off-topic ones. */
function allArticles(current: TopicData, archive: ArchiveData): Article[] {
  const ids = new Set(current.articles.map((a) => a.id));
  return [...current.articles, ...archive.articles.filter((a) => !ids.has(a.id))]
    .filter((a) => a.relevant !== false)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

const ARTICLES: Record<TopicId, Article[]> = {
  "capital-one": allArticles(capitalOne as TopicData, capitalOneArchive as ArchiveData),
  ai: allArticles(ai as TopicData, aiArchive as ArchiveData),
};

/** A search parameter as a single string ("" if missing). */
const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

const isTopic = (t: string): t is TopicId => t in TOPICS;
const isPriority = (p: string): p is Priority => PRIORITY_OPTIONS.some((o) => o.value === p);

export default async function ArchivePage({ searchParams }: PageProps<"/archive">) {
  const params = await searchParams;
  const q = param(params.q);
  const topic = isTopic(param(params.topic)) ? (param(params.topic) as TopicId) : "";
  const source = param(params.source);
  const priority = isPriority(param(params.priority)) ? (param(params.priority) as Priority) : "";
  const from = param(params.from);
  const to = param(params.to);
  const page = Math.max(1, Number.parseInt(param(params.page), 10) || 1);

  const topicIds = topic ? [topic] : (Object.keys(TOPICS) as TopicId[]);
  const sources = [...new Set(topicIds.flatMap((t) => ARTICLES[t].map((a) => a.source)))].sort();

  const matches = (a: Article) => {
    const day = easternDay(a.publishedAt);
    return (
      (!source || a.source === source) &&
      (!priority || a.priority === priority) &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      matchesSearch(a, q)
    );
  };

  // Each topic's stories, then merged so the most recently covered story comes first.
  const newest = (s: Story) => [s.lead, ...s.others].reduce((d, a) => (a.publishedAt > d ? a.publishedAt : d), "");
  const results = topicIds
    .flatMap((t) => groupStories(ARTICLES[t], matches).map((story) => ({ topic: t, story, newest: newest(story) })))
    .sort((a, b) => b.newest.localeCompare(a.newest));

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const shown = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const total = topicIds.reduce((n, t) => n + ARTICLES[t].length, 0);
  const oldest = topicIds
    .map((t) => ARTICLES[t].at(-1)?.publishedAt ?? "")
    .filter(Boolean)
    .sort()[0];

  // Link to another page of results, keeping the current filters.
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, topic, source, priority, from, to })) {
      if (value) p.set(key, value);
    }
    if (n > 1) p.set("page", String(n));
    return `/archive${p.size ? `?${p}` : ""}`;
  };

  const filtered = Boolean(q || topic || source || priority || from || to);

  return (
    <>
      <section className="hero">
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle">
          Search every report we&apos;ve collected, including older ones that no longer appear on the main pages.
        </p>
        <dl className="stats">
          <div className="stat">
            <dt>articles</dt>
            <dd>{total}</dd>
          </div>
          {oldest && (
            <div className="stat">
              <dt>going back to</dt>
              <dd>{new Date(oldest).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* `key` resets the fields to match the URL after each search. */}
      <Form action="/archive" className="archive-search" key={pageHref(1)}>
        <div className="filter-row">
          <input type="search" name="q" defaultValue={q} placeholder="Search headlines and summaries" aria-label="Search" />
          <button type="submit" className="button">
            Search
          </button>
        </div>
        <div className="filter-row">
          <select name="topic" defaultValue={topic} aria-label="Topic">
            <option value="">All topics</option>
            {Object.values(TOPICS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={source} aria-label="Outlet">
            <option value="">All outlets</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={priority} aria-label="Priority">
            <option value="">Any priority</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="date-field">
            From <input type="date" name="from" defaultValue={from} />
          </label>
          <label className="date-field">
            To <input type="date" name="to" defaultValue={to} />
          </label>
        </div>
      </Form>

      <h2 className="section-title">
        {filtered ? "Matching stories" : "All stories"} <span className="count">{results.length}</span>
        {filtered && (
          <Link href="/archive" className="clear">
            Clear search
          </Link>
        )}
      </h2>

      {shown.length > 0 ? (
        <div className="cards">
          {shown.map(({ topic: t, story }) => (
            <ArticleCard
              key={`${t}-${story.lead.id}`}
              article={story.lead}
              alsoCovered={story.others}
              showYear
              label={topic ? undefined : TOPICS[t].label}
            />
          ))}
        </div>
      ) : (
        <p className="empty">No reports match this search. Try fewer words or a wider date range.</p>
      )}

      {pageCount > 1 && (
        <nav className="pager" aria-label="Pages">
          {currentPage > 1 ? <Link href={pageHref(currentPage - 1)}>← Newer</Link> : <span />}
          <span>
            Page {currentPage} of {pageCount}
          </span>
          {currentPage < pageCount ? <Link href={pageHref(currentPage + 1)}>Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
