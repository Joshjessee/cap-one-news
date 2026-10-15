// Builds /sitemap.xml, the list of pages search engines should visit.
import type { MetadataRoute } from "next";
import ai from "@/data/ai.json";
import capitalOne from "@/data/capital-one.json";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // The pages change whenever the news refresh runs, so use its timestamp.
  const lastModified = (updatedAt: string | null | undefined) => (updatedAt ? new Date(updatedAt) : undefined);
  return [
    { url: `${SITE_URL}/capital-one`, lastModified: lastModified(capitalOne.updatedAt), changeFrequency: "hourly" },
    { url: `${SITE_URL}/ai`, lastModified: lastModified(ai.updatedAt), changeFrequency: "hourly" },
    { url: `${SITE_URL}/archive`, lastModified: lastModified(ai.updatedAt), changeFrequency: "daily" },
  ];
}
