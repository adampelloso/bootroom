import { getDb } from "@/lib/db";
import { subscription } from "@/lib/db-schema";
import { eq, sql } from "drizzle-orm";

export async function getSubscription(userId: string) {
  const rows = await getDb()
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;
  return sub.status === "active" || sub.status === "trialing";
}

type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

export async function upsertSubscription(data: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  priceId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);

  await getDb()
    .insert(subscription)
    .values({
      id: crypto.randomUUID(),
      userId: data.userId,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      status: data.status,
      priceId: data.priceId,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscription.userId,
      set: {
        stripeCustomerId: sql`excluded.stripe_customer_id`,
        stripeSubscriptionId: sql`excluded.stripe_subscription_id`,
        status: sql`excluded.status`,
        priceId: sql`excluded.price_id`,
        currentPeriodEnd: sql`excluded.current_period_end`,
        cancelAtPeriodEnd: sql`excluded.cancel_at_period_end`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}
