import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSubscription } from "@/lib/subscription";
import { cookies, headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    // Reuse existing Stripe customer if we have one
    const existing = await getSubscription(session.user.id);
    let customerId = existing?.stripeCustomerId as string | undefined;

    if (customerId) {
      // Verify the customer still exists on Stripe
      try {
        const cust = await getStripe().customers.retrieve(customerId);
        if (cust.deleted) customerId = undefined;
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: session.user.email,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
    }

    const origin = new URL(request.url).origin;

    const visitor = (await cookies()).get("visitor")?.value;

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/feed`,
      cancel_url: `${origin}/subscribe`,
      metadata: { userId: session.user.id, ...(visitor && { visitor }) },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
