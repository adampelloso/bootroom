import { getAuth } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session) {
    // Delete stale session cookie to prevent redirect loops
    // (middleware sees cookie → skips /login → page checks session → no session → redirect /login → loop)
    const jar = await cookies();
    jar.delete("bootroom.session_token");
    redirect("/login");
  }
  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession();

  const active = await hasActiveSubscription(session.user.id);
  if (!active) redirect("/subscribe");

  return session;
}
