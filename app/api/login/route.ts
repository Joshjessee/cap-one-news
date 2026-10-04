import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE_SECONDS, tokenFor } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  // Only allow redirects within this site.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const expected = process.env.SITE_PASSWORD;
  if (!expected || password !== expected) {
    const back = new URL("/login", request.url);
    back.searchParams.set("error", "1");
    back.searchParams.set("next", destination);
    return NextResponse.redirect(back, 303);
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(AUTH_COOKIE, await tokenFor(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  return response;
}
