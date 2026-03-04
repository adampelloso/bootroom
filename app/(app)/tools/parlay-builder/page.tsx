import { getFeedMatches } from "@/lib/build-feed";
import { ALL_COMPETITION_IDS } from "@/lib/leagues";
import { computeMatchEdges, type MarketEdge } from "@/lib/edge-engine";
import { requireActiveSubscription } from "@/lib/auth-guard";
import {
  ParlayBuilderClient,
  type ParlayLeg,
  type ParlayProfile,
} from "@/app/components/ParlayBuilderClient";

export default async function ParlayBuilderPage() {
  await requireActiveSubscription();

  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, today, ALL_COMPETITION_IDS);

  // Build leg candidates from all matches with edges
  const candidates: ParlayLeg[] = [];
  for (const match of matches) {
    const edges = computeMatchEdges(match);
    if (!edges) continue;
    for (const me of edges.markets) {
      if (me.bookProb <= 0) continue;
      candidates.push({
        id: `${match.id}-${me.market}`,
        matchId: match.id,
        homeTeam: match.homeTeamName,
        awayTeam: match.awayTeamName,
        league: match.leagueName ?? "",
        kickoff: match.kickoffUtc,
        market: me.market,
        modelProb: me.modelProb,
        bookProb: me.bookProb,
        edge: me.edge,
        tier: me.tier,
      });
    }
  }

  // Sort by edge descending for profile selection
  const sorted = [...candidates].sort((a, b) => b.edge - a.edge);

  // Build auto profiles
  const highLegs = sorted.filter((l) => l.tier === "HIGH");
  const highMedLegs = sorted.filter(
    (l) => l.tier === "HIGH" || l.tier === "MEDIUM"
  );

  const safeIds = highLegs.slice(0, 3).map((l) => l.id);
  const balancedIds = highMedLegs.slice(0, 5).map((l) => l.id);
  const aggressiveIds = sorted.slice(0, 8).map((l) => l.id);

  function combinedProb(ids: string[]): number {
    return ids.reduce((acc, id) => {
      const leg = candidates.find((l) => l.id === id);
      return leg ? acc * leg.modelProb : acc;
    }, 1);
  }

  const profiles: ParlayProfile[] = [
    {
      name: "Safe",
      description: "Top high-confidence legs",
      legIds: safeIds,
      combinedProb: combinedProb(safeIds),
    },
    {
      name: "Balanced",
      description: "Mix of high and medium confidence",
      legIds: balancedIds,
      combinedProb: combinedProb(balancedIds),
    },
    {
      name: "Aggressive",
      description: "Higher risk, more legs",
      legIds: aggressiveIds,
      combinedProb: combinedProb(aggressiveIds),
    },
  ];

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      <header
        style={{
          paddingTop: "var(--space-lg)",
          paddingBottom: "var(--space-sm)",
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
          Multi-Leg Builder
        </h1>
      </header>
      <p
        className="font-mono text-[12px] mb-4"
        style={{ color: "var(--text-sec)" }}
      >
        Build multi-leg projections with combined probability estimates.
      </p>
      <ParlayBuilderClient candidates={candidates} profiles={profiles} />
    </main>
  );
}
