import TopicPage from "@/components/TopicPage";
import data from "@/data/ai.json";
import type { TopicData } from "@/lib/types";

export const metadata = { title: "AI Policy · Policy News Briefing" };

export default function AiPage() {
  return <TopicPage topicId="ai" data={data as TopicData} />;
}
