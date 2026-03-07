import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { referralEarning, subscription, user } from "@/lib/db-schema";

export const REFERRAL_COOKIE_NAME = "bootroom_ref";
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_CHARS[randomInt(0, REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  const db = getDb();
  for (let i = 0; i < 10; i += 1) {
    const code = generateReferralCode();
    const exists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.referralCode, code))
      .limit(1);
    if (!exists[0]) return code;
  }
  throw new Error("Unable to generate unique referral code");
}

export async function findReferrerByCodeOrSlug(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;
  const db = getDb();

  const slugMatch = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.referralSlug, value.toLowerCase()))
    .limit(1);
  if (slugMatch[0]) return slugMatch[0];

  const codeMatch = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.referralCode, value.toUpperCase()))
    .limit(1);
  return codeMatch[0] ?? null;
}

export async function resolveValidReferrerId(referrerId: string | null, userIdToExclude?: string): Promise<string | null> {
  if (!referrerId) return null;
  if (userIdToExclude && referrerId === userIdToExclude) return null;
  const db = getDb();
  const referrer = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, referrerId))
    .limit(1);
  return referrer[0] ? referrerId : null;
}

export async function getReferralProgramSnapshot(userId: string) {
  const db = getDb();
  const [userRow] = await db
    .select({
      referralCode: user.referralCode,
      referralSlug: user.referralSlug,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userRow) return null;

  const [pendingRow] = await db
    .select({ total: sql<number>`coalesce(sum(${referralEarning.commissionAmount}), 0)` })
    .from(referralEarning)
    .where(and(eq(referralEarning.referrerId, userId), eq(referralEarning.status, "pending")));

  const [totalRow] = await db
    .select({ total: sql<number>`coalesce(sum(${referralEarning.commissionAmount}), 0)` })
    .from(referralEarning)
    .where(eq(referralEarning.referrerId, userId));

  const [activeReferralsRow] = await db
    .select({
      total: sql<number>`coalesce(count(distinct ${user.id}), 0)`,
    })
    .from(user)
    .innerJoin(subscription, eq(subscription.userId, user.id))
    .where(
      and(
        eq(user.referredBy, userId),
        inArray(subscription.status, ["active", "trialing"]),
      ),
    );

  const earnings = await db
    .select({
      id: referralEarning.id,
      referredEmail: user.email,
      paymentAmount: referralEarning.paymentAmount,
      commissionAmount: referralEarning.commissionAmount,
      status: referralEarning.status,
      createdAt: referralEarning.createdAt,
      paidAt: referralEarning.paidAt,
    })
    .from(referralEarning)
    .innerJoin(user, eq(user.id, referralEarning.referredUserId))
    .where(eq(referralEarning.referrerId, userId))
    .orderBy(desc(referralEarning.createdAt))
    .limit(100);

  return {
    referralCode: userRow.referralCode,
    referralSlug: userRow.referralSlug,
    activeReferrals: activeReferralsRow?.total ?? 0,
    pendingEarnings: pendingRow?.total ?? 0,
    totalEarned: totalRow?.total ?? 0,
    earnings,
  };
}
