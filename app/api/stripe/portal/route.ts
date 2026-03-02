import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSubscription } from "@/lib/subscription";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const sub = await getSubscription(session.user.id);
  if (!sub?.stripeCustomerId) {
    return NextResponse.redirect(new URL("/subscribe", request.url));
  }

  const origin = new URL(request.url).origin;

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/feed`,
  });

  return NextResponse.redirect(portalSession.url);
}
