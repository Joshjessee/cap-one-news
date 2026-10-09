# Policy News Briefing (cap-one-news)

A password-protected website with two pages:

1. **Capital One**: every article from a reputable outlet that mentions Capital One.
2. **AI Policy**: Congress, the Administration, NIST, and Treasury on AI.

Each page opens with a short **Today's briefing**. Below it is a **Read first** list of the high-priority articles, then everything else. Claude (Anthropic's AI) writes a one-to-two sentence summary and a "why it matters" line for every article.

## How it works

```
GitHub Action (every 2 hours)
  → scripts/refresh.ts: search Google News + Federal Register
  → keep only trusted outlets (config/sources.ts), drop duplicates
  → Claude summarizes and prioritizes only the NEW articles
  → saves data/capital-one.json and data/ai.json and commits them
        ↓
Vercel sees the commit and redeploys the website, which reads those files
```

There is no database. The news lives in `data/` and git keeps the history.

### Paywalls

The site never copies articles. It shows the headline, the outlet, and the AI summary. Claude writes that summary from the headline and the public teaser text. Clicking a headline opens the publisher's site, where readers sign in with their own subscriptions. 🔒 marks outlets that usually need a subscription.

## Project layout

| Path | What it is |
| --- | --- |
| `config/sources.ts` | **The file you'll edit most**: trusted outlets, search terms, and the instructions Claude gets about what's important |
| `scripts/refresh.ts` | The news-refresh job |
| `lib/feeds.ts` | Reads Google News RSS, NIST's news feed, and the Federal Register API |
| `lib/claude.ts` | Asks Claude for summaries, priorities, and the briefing |
| `data/*.json` | The saved news (written by the refresh job, read by the site) |
| `app/` | The website pages (Next.js) |
| `components/` | Pieces of the pages (article card, filters, tabs) |
| `proxy.ts`, `lib/auth.ts` | The shared-password protection |
| `.github/workflows/refresh-news.yml` | The schedule that runs the refresh |

## One-time setup

1. **Anthropic API key**: create one at <https://console.anthropic.com> (Settings → API keys) and add some credit. Then in GitHub open this repo's **Settings → Secrets and variables → Actions → New repository secret**, name it `ANTHROPIC_API_KEY`, and paste the key.
2. **Vercel**: import this GitHub repo at <https://vercel.com/new>. Under **Environment Variables**, add `SITE_PASSWORD` set to the password you'll share with the team. Then deploy.
3. **Merge to `main`**: GitHub only runs scheduled jobs from the default branch.
4. **First refresh**: GitHub → **Actions** → **Refresh news** → **Run workflow**. A couple of minutes later the site has news.

If you change `SITE_PASSWORD` in Vercel, redeploy for it to take effect. Everyone will need the new password.

### Backup timer (recommended)

GitHub's built-in schedule is "best effort": runs can start an hour late or be skipped, and a brand-new repo can go a day or more before its first scheduled run. To make refreshes reliable, have a free outside service press "Run workflow" for you:

1. **Make a GitHub token.** GitHub → your profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Name it `cron-job`, set an expiration date, choose **Only select repositories → cap-one-news**, and under **Repository permissions** set **Actions** to **Read and write**. Copy the token (it starts with `github_pat_`). Treat it like a password.
2. **Make a free account at <https://cron-job.org>** and create a cron job:
   - **URL**: `https://api.github.com/repos/Joshjessee/cap-one-news/actions/workflows/refresh-news.yml/dispatches`
   - **Schedule**: every 2 hours (or whatever you like).
   - **Advanced → Request method**: `POST`
   - **Advanced → Headers**:
     - `Accept`: `application/vnd.github+json`
     - `Authorization`: `Bearer github_pat_…` (your token)
     - `X-GitHub-Api-Version`: `2022-11-28`
   - **Advanced → Request body**: `{"ref":"main"}`
3. Click **Test run**. A response of **204** means it worked; you'll see a new run under GitHub → **Actions** within a few seconds.

Keep the GitHub schedule too. If both start at once, the second waits for the first, and it only pays Claude for articles the first didn't already handle. When the token expires, the cron job starts getting **401** errors. Make a new token and paste it in.

## Running it on your own computer

```bash
npm install
npm run refresh -- --no-ai   # fetch headlines only (free)
npm run refresh              # with summaries (needs ANTHROPIC_API_KEY in your environment)
npm run dev                  # open http://localhost:3000
```

Locally, the site doesn't ask for a password unless you set `SITE_PASSWORD`.

## Costs

- **Vercel and GitHub Actions**: free tiers are enough.
- **Claude**: uses Claude Sonnet 5.5 at low effort. Only new articles are sent, in batches, and the briefing is only rewritten when a medium- or high-priority article arrives (or once a day). Expect roughly $4–7 a month. You can see actual usage under **Usage** in the Anthropic console. To switch models, change `MODEL` in `lib/claude.ts`.

## Common changes

- **Add or remove an outlet**: edit `OUTLETS` in `config/sources.ts`.
- **Change what counts as "Read first"**: edit the `guidance` text for that topic in `config/sources.ts`. It's plain English, and Claude follows it.
- **Change the colors**: edit the variables at the top of `app/globals.css` (there's a light and a dark set). The navy and red are inspired by Capital One's colors, but the site deliberately doesn't use Capital One's logo, swoosh, typeface, or slogans, since those are trademarks. Keep it that way, and keep the trademark note in the footer (`app/(site)/layout.tsx`).
- **Change how often it refreshes**: edit the `cron` lines in `.github/workflows/refresh-news.yml`. The times are in UTC.
