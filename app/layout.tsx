import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Policy News Briefing",
  description: "Capital One and AI policy news, summarized and prioritized.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
