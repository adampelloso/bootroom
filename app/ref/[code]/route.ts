import { NextResponse } from "next/server";
import { findReferrerByCodeOrSlug, REFERRAL_COOKIE_NAME } from "@/lib/referrals";

const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const sanitized = code.trim();
  const referrer = await findReferrerByCodeOrSlug(sanitized);

  if (!referrer) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(new URL("/signup", request.url));
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: referrer.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
