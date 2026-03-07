import { requireActiveSubscription } from "@/lib/auth-guard";
import { getFollowedLeagueIds } from "@/lib/league-preferences";
import { MatchesClient } from "./matches-client";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  await requireActiveSubscription();
  const leagueIds = await getFollowedLeagueIds();

  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)] pb-20">
      <MatchesClient initialFollowedLeagueIds={leagueIds} />
    </main>
  );
}
