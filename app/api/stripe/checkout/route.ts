import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSubscription } from "@/lib/subscription";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId } = await request.json();
  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }

  // Reuse existing Stripe customer if we have one
  const existing = await getSubscription(session.user.id);
  let customerId = existing?.stripeCustomerId;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
  }

  const origin = new URL(request.url).origin;

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    success_url: `${origin}/feed`,
    cancel_url: `${origin}/subscribe`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
