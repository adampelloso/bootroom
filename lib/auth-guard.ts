import { getAuth } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription";
import { getEnvVar } from "@/lib/env";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isAdmin(email: string): boolean {
  const adminEmails = (getEnvVar("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return adminEmails.includes(email);
}

export async function requireSession() {
  const session = await getAuth().api.getSession({
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
