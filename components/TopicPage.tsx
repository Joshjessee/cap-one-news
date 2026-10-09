import NewsFeed from "@/components/NewsFeed";
import { TOPICS } from "@/config/sources";
import { formatEastern } from "@/lib/format";
import type { TopicData, TopicId } from "@/lib/types";

export default function TopicPage({ topicId, data }: { topicId: TopicId; data: TopicData }) {
  const topic = TOPICS[topicId];

  // Quick stats for the banner. These count stories (an event several outlets covered counts
  // once), the same way the "Read first" list below does.
  const onTopic = data.articles.filter((a) => a.relevant !== false);
  const storyKey = (a: (typeof onTopic)[number]) => a.storyId ?? a.id;
  const stats = [
    { value: new Set(onTopic.map(storyKey)).size, label: "stories" },
    { value: new Set(onTopic.filter((a) => a.priority === "high").map(storyKey)).size, label: "read first" },
    { value: new Set(onTopic.map((a) => a.source)).size, label: "outlets" },
  ];

  return (
    <>
      <section className="hero">
        <p className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          {data.updatedAt ? `Updated ${formatEastern(data.updatedAt)}` : "Waiting for the first news refresh"}
        </p>
        <h1 className="page-title">{topic.label}</h1>
        <p className="page-subtitle">{topic.description}</p>
        {data.articles.length > 0 && (
          <dl className="stats">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {data.briefing.length > 0 && (
        <section className="briefing" aria-labelledby="briefing-title">
          <h2 id="briefing-title">Today&apos;s briefing</h2>
          <ol>
            {data.briefing.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ol>
        </section>
      )}

      <NewsFeed articles={data.articles} categories={topic.categories} />

      <p className="footer-note">
        Summaries are written by AI from each article&apos;s public headline and teaser, so always click through
        before relying on details. 🔒 means the outlet needs a subscription; sign in on their site with your own
        account.
      </p>
    </>
  );
}
