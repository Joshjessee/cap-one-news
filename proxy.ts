// Runs before every page request: sends visitors without a valid login cookie to /login.

import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken, passwordConfigured } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  // While developing on your own computer without a password set, don't ask for one.
  if (!passwordConfigured() && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (await isValidToken(request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login page/API and Next.js's own files.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
