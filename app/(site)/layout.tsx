import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import { passwordConfigured } from "@/lib/auth";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand">
            Policy News Briefing
          </Link>
          <NavTabs />
          {passwordConfigured() && (
            <form method="post" action="/api/logout">
              <button className="logout" type="submit">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="container site-main">{children}</main>
    </>
  );
}
