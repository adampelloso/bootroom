import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === "development" &&
    request.nextUrl.pathname === "/"
  ) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }
}

export const config = {
  matcher: "/",
};
