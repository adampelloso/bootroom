import { requireSession } from "@/lib/auth-guard";
import { getSubscription } from "@/lib/subscription";
import { ProfileSettings } from "./profile-settings";

export default async function ProfilePage() {
  const session = await requireSession();
  const sub = await getSubscription(session.user.id);

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      <header
        className="flex items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <a
          href="/matches"
          className="font-mono text-xs"
          style={{ color: "var(--text-sec)" }}
        >
          &larr; Back to matches
        </a>
      </header>

      <h1
        className="font-bold uppercase"
        style={{
          fontSize: "20px",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          paddingBottom: "var(--space-lg)",
        }}
      >
        Profile
      </h1>

      <ProfileSettings
        email={session.user.email}
        subscriptionStatus={sub?.status ?? "none"}
        currentPeriodEnd={sub?.currentPeriodEnd ?? null}
      />
    </main>
  );
}
