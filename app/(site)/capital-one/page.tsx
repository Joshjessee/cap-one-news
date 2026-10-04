import TopicPage from "@/components/TopicPage";
import data from "@/data/capital-one.json";
import type { TopicData } from "@/lib/types";

export const metadata = { title: "Capital One · Policy News Briefing" };

export default function CapitalOnePage() {
  return <TopicPage topicId="capital-one" data={data as TopicData} />;
}
