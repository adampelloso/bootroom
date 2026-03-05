import { getAuth } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login?expired=1");
  }
  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession();

  const active = await hasActiveSubscription(session.user.id);
  if (!active) redirect("/subscribe");

  return session;
}
