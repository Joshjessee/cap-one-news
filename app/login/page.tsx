import Logo from "@/components/Logo";
import { passwordConfigured } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const failed = params.error === "1";

  return (
    <main className="login">
      <form method="post" action="/api/login">
        <div className="login-brand">
          <Logo size={44} />
          <h1>Policy News Briefing</h1>
          <p>Capital One and AI policy news, summarized and prioritized.</p>
        </div>
        {passwordConfigured() ? (
          <>
            <label htmlFor="password">Team password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
            <input type="hidden" name="next" value={next} />
            {failed && <p className="error">That password didn&apos;t work. Try again.</p>}
            <button type="submit">Sign in</button>
          </>
        ) : (
          <p className="error">
            The site password hasn&apos;t been set up yet. Add a SITE_PASSWORD environment variable in Vercel.
          </p>
        )}
      </form>
    </main>
  );
}
