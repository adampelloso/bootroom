import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { hasActiveSubscription, upsertSubscription } from "@/lib/subscription";
import { getStripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ active: false }, { status: 401 });

  // Fast path: already active in DB
  const active = await hasActiveSubscription(session.user.id);
  if (active) return NextResponse.json({ active: true });

  // If a checkout session_id was provided, verify directly with Stripe
  // This handles the case where the webhook hasn't fired yet
  const url = new URL(request.url);
  const checkoutSessionId = url.searchParams.get("session_id");

  if (checkoutSessionId) {
    try {
      const checkout = await getStripe().checkout.sessions.retrieve(checkoutSessionId);
      if (
        checkout.payment_status === "paid" &&
        checkout.subscription &&
        checkout.customer
      ) {
        const subId =
          typeof checkout.subscription === "string"
            ? checkout.subscription
            : checkout.subscription.id;
        const custId =
          typeof checkout.customer === "string"
            ? checkout.customer
            : checkout.customer.id;

        const sub = await getStripe().subscriptions.retrieve(subId);

        const statusMap: Record<string, "none" | "trialing" | "active" | "past_due" | "canceled"> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          incomplete: "none",
          incomplete_expired: "none",
          unpaid: "past_due",
          paused: "canceled",
        };

        const mappedStatus = statusMap[sub.status] ?? "none";

        await upsertSubscription({
          userId: session.user.id,
          stripeCustomerId: custId,
          stripeSubscriptionId: sub.id,
          status: mappedStatus,
          priceId: sub.items.data[0]?.price.id ?? null,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        const nowActive = mappedStatus === "active" || mappedStatus === "trialing";
        return NextResponse.json({ active: nowActive });
      }
    } catch (err) {
      console.error("[subscription/status] Stripe verification failed:", err);
    }
  }

  return NextResponse.json({ active: false });
}
