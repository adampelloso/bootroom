export const dynamic = "force-dynamic";

import { requireSession } from "@/lib/auth-guard";
import { getEnvVar } from "@/lib/env";
import { getReferralProgramSnapshot } from "@/lib/referrals";
import { getSubscription } from "@/lib/subscription";
import { ProfileSettings } from "./profile-settings";

export default async function ProfilePage() {
  const session = await requireSession();
  const sub = await getSubscription(session.user.id);
  const referral = await getReferralProgramSnapshot(session.user.id);
  const appBaseUrl = (getEnvVar("BETTER_AUTH_URL") ?? "").replace(/\/$/, "");

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      <h1
        className="font-bold uppercase"
        style={{
          fontSize: "20px",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          paddingTop: "var(--space-lg)",
          paddingBottom: "var(--space-lg)",
        }}
      >
        Profile
      </h1>

      <ProfileSettings
        email={session.user.email}
        subscriptionStatus={sub?.status ?? "none"}
        currentPeriodEnd={sub?.currentPeriodEnd ?? null}
        appBaseUrl={appBaseUrl}
        referral={referral}
      />
    </main>
  );
}
