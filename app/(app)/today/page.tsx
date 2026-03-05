export const dynamic = "force-dynamic";

import { getFeedMatches } from "@/lib/build-feed";
import { computeMatchEdges, type MatchEdges } from "@/lib/edge-engine";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { EdgeLeaderboard } from "@/app/components/EdgeLeaderboard";
import { getFollowedLeagueIds } from "@/lib/league-preferences";

export default async function TodayPage() {
  await requireActiveSubscription();

  const leagueIds = await getFollowedLeagueIds();
  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, undefined, leagueIds);

  const allEdges = matches
    .map((m) => ({ match: m, edges: computeMatchEdges(m) }))
    .filter(
      (e): e is { match: (typeof matches)[0]; edges: MatchEdges } =>
        e.edges !== null
    )
    .sort((a, b) => b.edges.bestEdge - a.edges.bestEdge);

  return (
    <main className="app-shell app-shell--wide min-h-screen flex flex-col bg-[var(--bg-body)] pb-20">
      <header
        style={{
          paddingTop: "var(--space-lg)",
          paddingBottom: "var(--space-md)",
        }}
      >
        <h1
          className="font-bold uppercase"
          style={{
            fontSize: "20px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Daily Edges
        </h1>
      </header>

      <section>
        <EdgeLeaderboard edges={allEdges.map((e) => e.edges)} />
      </section>
    </main>
  );
}
