import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertSubscription } from "@/lib/subscription";
import { getEnvVar } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const stripe = new Stripe(getEnvVar("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });

    let event: Stripe.Event;
    try {
      const cryptoProvider = Stripe.createSubtleCryptoProvider();
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        getEnvVar("STRIPE_WEBHOOK_SECRET")!,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error("[stripe webhook] Signature failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[stripe webhook] Event:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;
        const userId = customer.metadata.userId;
        if (!userId) {
          console.log("[stripe webhook] No userId in customer metadata, skipping");
          break;
        }

        const statusMap = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          incomplete: "none",
          incomplete_expired: "none",
          unpaid: "past_due",
          paused: "canceled",
        } as const;

        type SubStatus = "none" | "trialing" | "active" | "past_due" | "canceled";
        const mappedStatus: SubStatus =
          statusMap[sub.status as keyof typeof statusMap] ?? "none";

        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          status: mappedStatus,
          priceId: sub.items.data[0]?.price.id ?? null,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
        console.log("[stripe webhook] Upserted subscription for user", userId, "status:", mappedStatus);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const custId = typeof session.customer === "string" ? session.customer : session.customer.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const customer = await stripe.customers.retrieve(custId);
          if (!customer.deleted) {
            const userId = customer.metadata.userId ?? session.metadata?.userId;
            if (userId) {
              const statusMap = {
                active: "active",
                trialing: "trialing",
                past_due: "past_due",
                canceled: "canceled",
                incomplete: "none",
                incomplete_expired: "none",
                unpaid: "past_due",
                paused: "canceled",
              } as const;
              type SubStatus = "none" | "trialing" | "active" | "past_due" | "canceled";
              const mappedStatus: SubStatus =
                statusMap[sub.status as keyof typeof statusMap] ?? "none";
              await upsertSubscription({
                userId,
                stripeCustomerId: custId,
                stripeSubscriptionId: sub.id,
                status: mappedStatus,
                priceId: sub.items.data[0]?.price.id ?? null,
                currentPeriodEnd: sub.current_period_end,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
              });
              console.log("[stripe webhook] checkout.session.completed: upserted subscription for user", userId, "status:", mappedStatus);
            }
          }
        }
        break;
      }

      case "invoice.payment_failed":
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] Unhandled error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
