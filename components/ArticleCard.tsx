import { formatEastern } from "@/lib/format";
import type { Article } from "@/lib/types";

const PRIORITY_LABEL = { high: "Read first", medium: "Worth a look", low: "FYI" } as const;

interface Props {
  article: Article;
  /** Other outlets' articles about the same story. */
  alsoCovered?: Article[];
}

export default function ArticleCard({ article, alsoCovered = [] }: Props) {
  const { priority } = article;
  const classes = ["card", priority ?? "", article.relevant === false ? "dimmed" : ""];

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
          {article.whyItMatters && <p className="why">
              <strong>Why it matters:</strong> {article.whyItMatters}
            </p>}
        </>
      ) : (
        article.snippet && <p>{article.snippet}</p>
      )}
      {alsoCovered.length > 0 && (
        <p className="also">
          Also covered by:{" "}
          {alsoCovered.map((a, i) => (
            <span key={a.id}>
              {i > 0 && " · "}
              <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.title}>
                {a.source}
              </a>
              {a.paywalled && " 🔒"}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
