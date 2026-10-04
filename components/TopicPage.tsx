import NewsFeed from "@/components/NewsFeed";
import { TOPICS } from "@/config/sources";
import { formatEastern } from "@/lib/format";
import type { TopicData, TopicId } from "@/lib/types";

export default function TopicPage({ topicId, data }: { topicId: TopicId; data: TopicData }) {
  const topic = TOPICS[topicId];

  return (
    <>
      <h1 className="page-title">{topic.label}</h1>
      <p className="page-subtitle">{topic.description}</p>
      <p className="updated">
        {data.updatedAt ? `Last updated ${formatEastern(data.updatedAt)}` : "Waiting for the first news refresh."}
      </p>

      {data.briefing.length > 0 && (
        <section className="briefing" aria-labelledby="briefing-title">
          <h2 id="briefing-title">Today&apos;s briefing</h2>
          <ul>
            {data.briefing.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
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
