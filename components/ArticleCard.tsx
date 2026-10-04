import { formatEastern } from "@/lib/format";
import type { Article } from "@/lib/types";

const PRIORITY_LABEL = { high: "Read first", medium: "Worth a look", low: "FYI" } as const;

export default function ArticleCard({ article }: { article: Article }) {
  const { priority } = article;
  const classes = ["card", priority === "high" ? "high" : "", article.relevant === false ? "dimmed" : ""];

  return (
    <article className={classes.filter(Boolean).join(" ")}>
      <div className="card-meta">
        <span className="source">{article.source}</span>
        {article.paywalled && <span title="Subscription required — sign in on the publisher's site">🔒 Subscriber</span>}
        <time dateTime={article.publishedAt}>{formatEastern(article.publishedAt)}</time>
        {priority && <span className={`badge ${priority}`}>{PRIORITY_LABEL[priority]}</span>}
        {article.category && <span className="tag">{article.category}</span>}
      </div>
      <h3>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h3>
      {article.summary ? (
        <>
          <p>{article.summary}</p>
          {article.whyItMatters && <p className="why">Why it matters: {article.whyItMatters}</p>}
        </>
      ) : (
        article.snippet && <p>{article.snippet}</p>
      )}
    </article>
  );
}
