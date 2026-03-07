import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/subscribe", "/subscribe/success"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/stripe", "/_next", "/images", "/ref"];

// Logged-in users hitting these pages should go straight to /today
const REDIRECT_IF_AUTHED = ["/", "/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "bootroom",
  });

  // If a page flagged the session as expired, clear the cookie and let them through to /login
  if (pathname === "/login" && request.nextUrl.searchParams.has("expired")) {
    const res = NextResponse.next();
    res.cookies.delete("bootroom.session_token");
    return res;
  }

  // Redirect logged-in users away from landing/login/signup → /today
  if (REDIRECT_IF_AUTHED.includes(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  // /feed → /matches redirect (keep /feed alive for old bookmarks)
  if (pathname === "/feed" && sessionCookie) {
    const dest = new URL("/matches", request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest);
  }

  // Public routes — no auth check
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Protected routes — check for session cookie
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
