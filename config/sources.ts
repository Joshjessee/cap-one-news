// ─────────────────────────────────────────────────────────────────────────────
// Everything about WHERE news comes from lives in this one file.
//
// • To add an outlet: add a line to OUTLETS.
// • To stop showing an outlet: delete (or comment out) its line.
// • To change what we search for: edit the `queries` under each topic.
// ─────────────────────────────────────────────────────────────────────────────

import type { TopicId } from "@/lib/types";

export interface Outlet {
  /** Name shown on the site. */
  name: string;
  /** Website domain. Articles are only kept if they come from one of these. */
  domain: string;
  /** True if most articles need a paid subscription to read (shows a 🔒). */
  paywalled: boolean;
  /** True for the outlets the team already reads every day. */
  core?: boolean;
}

export const OUTLETS: Outlet[] = [
  // The six outlets the team already reads
  { name: "Punchbowl News", domain: "punchbowl.news", paywalled: true, core: true },
  { name: "Reuters", domain: "reuters.com", paywalled: true, core: true },
  { name: "The Washington Post", domain: "washingtonpost.com", paywalled: true, core: true },
  { name: "Politico", domain: "politico.com", paywalled: false, core: true },
  { name: "The Hill", domain: "thehill.com", paywalled: false, core: true },
  { name: "Axios", domain: "axios.com", paywalled: false, core: true },

  // Other well-established news outlets
  { name: "Associated Press", domain: "apnews.com", paywalled: false },
  { name: "Bloomberg", domain: "bloomberg.com", paywalled: true },
  { name: "The Wall Street Journal", domain: "wsj.com", paywalled: true },
  { name: "The New York Times", domain: "nytimes.com", paywalled: true },
  { name: "Financial Times", domain: "ft.com", paywalled: true },
  { name: "CNBC", domain: "cnbc.com", paywalled: false },
  { name: "Roll Call", domain: "rollcall.com", paywalled: false },

  // Banking trade press
  { name: "American Banker", domain: "americanbanker.com", paywalled: true },
  { name: "Banking Dive", domain: "bankingdive.com", paywalled: false },
  { name: "Payments Dive", domain: "paymentsdive.com", paywalled: false },

  // Official government sources (primary documents, always free)
  { name: "Congress.gov", domain: "congress.gov", paywalled: false },
  { name: "U.S. Senate", domain: "senate.gov", paywalled: false },
  { name: "U.S. House", domain: "house.gov", paywalled: false },
  { name: "The White House", domain: "whitehouse.gov", paywalled: false },
  { name: "NIST", domain: "nist.gov", paywalled: false },
  { name: "U.S. Treasury", domain: "treasury.gov", paywalled: false },
  { name: "Federal Register", domain: "federalregister.gov", paywalled: false },
  { name: "Federal Reserve", domain: "federalreserve.gov", paywalled: false },
  { name: "CFPB", domain: "consumerfinance.gov", paywalled: false },
  { name: "OCC", domain: "occ.gov", paywalled: false },
  { name: "FDIC", domain: "fdic.gov", paywalled: false },
  { name: "Department of Commerce", domain: "commerce.gov", paywalled: false },
  { name: "FTC", domain: "ftc.gov", paywalled: false },
];

export interface TopicConfig {
  id: TopicId;
  /** Tab label on the website. */
  label: string;
  /** One-line description shown under the page title. */
  description: string;
  /**
   * Google News search queries. Results from any outlet NOT in OUTLETS are thrown away,
   * so these can be broad. Google's `when:3d` means "published in the last 3 days".
   */
  queries: string[];
  /** Also search each core outlet directly with this phrase, so they never get crowded out. */
  coreOutletPhrase?: string;
  /** Also pull AI-related documents from the Federal Register's free API. */
  includeFederalRegister?: boolean;
  /** Buckets Claude sorts each article into (shown as filter chips). */
  categories: string[];
  /** Plain-English instructions telling Claude what matters to the readers. */
  guidance: string;
}

export const TOPICS: Record<TopicId, TopicConfig> = {
  "capital-one": {
    id: "capital-one",
    label: "Capital One",
    description: "Every reputable news article that mentions Capital One.",
    queries: ['"Capital One" when:3d', '"Capital One" Discover when:3d'],
    coreOutletPhrase: '"Capital One"',
    categories: [
      "Regulation & Policy",
      "Legal",
      "Business & Earnings",
      "Products & Technology",
      "Leadership & People",
      "Other",
    ],
    guidance: `The readers are Capital One employees who work on government and public policy.
They want to know about ANY news that mentions Capital One (including its Discover acquisition).

Mark an article NOT relevant only if Capital One appears just as a name and the story isn't
about the company, e.g. sports at "Capital One Arena", the "Capital One Orange Bowl" or
"Capital One Cup", or a passing mention in an unrelated story.

Priority:
- high: Capital One is a main subject AND it's about regulators, Congress, the courts, lawsuits,
  enforcement, mergers, executives, data/security incidents, or anything a policy team must know today.
- medium: Capital One is a main subject of routine business news (earnings, products, partnerships).
- low: Capital One is mentioned in passing, in a list of banks, or in a roundup.`,
  },
  ai: {
    id: "ai",
    label: "AI Policy",
    description:
      "AI legislation in Congress, the Administration, NIST, and Treasury on artificial intelligence.",
    queries: [
      '"artificial intelligence" (Congress OR Senate OR House) (bill OR legislation OR hearing) when:3d',
      'AI (bill OR legislation) (senator OR "House committee" OR "Senate committee") when:3d',
      '"artificial intelligence" ("White House" OR "executive order" OR administration) policy when:3d',
      '(NIST OR "AI Safety Institute" OR CAISI) "artificial intelligence" when:3d',
      '(Treasury OR Bessent) "artificial intelligence" when:3d',
      '"artificial intelligence" (banks OR "financial services" OR regulators) when:3d',
      '"artificial intelligence" site:nist.gov when:7d',
      '"artificial intelligence" site:treasury.gov when:7d',
      '"artificial intelligence" site:whitehouse.gov when:7d',
    ],
    includeFederalRegister: true,
    categories: ["Congress", "Administration", "NIST", "Treasury", "Financial Regulators", "Other"],
    guidance: `The readers are Capital One employees who work on government and public policy.
They track U.S. federal AI policy: AI legislation and hearings in Congress, White House /
Administration actions (executive orders, OMB, Commerce), NIST AI standards and guidance,
and Treasury on AI. AI in financial services regulation matters a lot to them.

Mark an article NOT relevant if it's not really about AI policy or government action on AI
(e.g. product launches, stock moves, celebrity or general tech news with no policy angle).

Priority:
- high: concrete federal action or a decision point: a bill introduced/advancing/passing,
  a hearing on AI, an executive order, final or proposed rules, NIST or Treasury publications
  or requests for comment, or anything touching AI in banking/financial services.
- medium: meaningful analysis or reporting on where federal AI policy is heading,
  state AI laws with national impact, statements by key officials.
- low: general commentary, opinion pieces, or loosely related news.`,
  },
};

/** Find the outlet for a website address, or undefined if it isn't on our list. */
export function findOutlet(urlOrHost: string): Outlet | undefined {
  let host = urlOrHost;
  try {
    host = new URL(urlOrHost).hostname;
  } catch {
    // Already a bare hostname
  }
  host = host.toLowerCase().replace(/^www\./, "");
  return OUTLETS.find((o) => host === o.domain || host.endsWith("." + o.domain));
}
