import Link from "next/link";
import Logo from "@/components/Logo";
import NavTabs from "@/components/NavTabs";
import { passwordConfigured } from "@/lib/auth";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand">
            <Logo />
            <span>
              Policy News <strong>Briefing</strong>
            </span>
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
      <footer className="site-footer">
        <div className="container">
          Capital One® is a registered trademark of Capital One Financial Corporation. This is an independent
          news digest, not an official Capital One product, and it doesn&apos;t use Capital One logos or brand
          assets. Headlines and articles belong to their publishers.
        </div>
      </footer>
    </>
  );
}
