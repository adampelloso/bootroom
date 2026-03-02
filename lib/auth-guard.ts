import { auth } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");
  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession();

  // Admin users always have full access
  if (isAdmin(session.user.email)) return session;

  const active = await hasActiveSubscription(session.user.id);
  if (!active) redirect("/subscribe");

  return session;
}
