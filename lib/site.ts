// The site's public web address, used for search-engine files and link previews.
// Vercel fills in VERCEL_PROJECT_PRODUCTION_URL automatically (for example "cap-one-news.vercel.app",
// or your custom domain if you add one). On your own computer it falls back to localhost.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "Policy News Briefing";
export const SITE_DESCRIPTION = "Capital One and AI policy news, summarized and prioritized.";
