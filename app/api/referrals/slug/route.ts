import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db-schema";
import { validateReferralSlug } from "@/lib/referral-slug";

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { slug?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawSlug = typeof payload.slug === "string" ? payload.slug : "";
  const validation = validateReferralSlug(rawSlug);
  if (!validation.ok) {
    const status = validation.message === "This URL is not available" ? 409 : 400;
    return NextResponse.json({ error: validation.message }, { status });
  }

  const db = getDb();
  if (validation.slug) {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.referralSlug, validation.slug), eq(user.id, session.user.id)))
      .limit(1);

    if (!existing[0]) {
      const taken = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.referralSlug, validation.slug))
        .limit(1);
      if (taken[0]) {
        return NextResponse.json({ error: "This URL is already taken" }, { status: 409 });
      }
    }
  }

  await db
    .update(user)
    .set({ referralSlug: validation.slug })
    .where(eq(user.id, session.user.id));

  const updated = await db
    .select({
      referralCode: user.referralCode,
      referralSlug: user.referralSlug,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    slug: updated[0]?.referralSlug ?? null,
    referralCode: updated[0]?.referralCode ?? null,
  });
}
