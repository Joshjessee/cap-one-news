// Simple shared-password protection.
// The password lives in the SITE_PASSWORD environment variable (set it in Vercel).
// After logging in, the browser keeps a cookie holding a hash of the password,
// so changing SITE_PASSWORD logs everyone out.

export const AUTH_COOKIE = "briefing_auth";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function passwordConfigured(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}

export async function tokenFor(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`cap-one-news:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const password = process.env.SITE_PASSWORD;
  if (!password || !token) return false;
  return token === (await tokenFor(password));
}
