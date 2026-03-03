import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/subscribe"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/stripe", "/_next", "/images"];

// Logged-in users hitting these pages should go straight to /feed
const REDIRECT_IF_AUTHED = ["/", "/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "bootroom",
  });

  // Redirect logged-in users away from landing/login/signup → /feed
  if (REDIRECT_IF_AUTHED.includes(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/feed", request.url));
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
