import { getFeedMatches } from "@/lib/build-feed";
import { ALL_COMPETITION_IDS } from "@/lib/leagues";
import { computeMatchEdges } from "@/lib/edge-engine";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { ValueFinderTable, type ValueFinderRow } from "@/app/components/ValueFinderTable";

export default async function ValueFinderPage() {
  await requireActiveSubscription();
  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, undefined, ALL_COMPETITION_IDS);

  const rows: ValueFinderRow[] = [];
  for (const match of matches) {
    const edges = computeMatchEdges(match);
    if (!edges) continue;
    for (const m of edges.markets) {
      rows.push({
        matchId: match.id,
        homeTeam: match.homeTeamName,
        awayTeam: match.awayTeamName,
        league: match.leagueName ?? "",
        kickoff: match.kickoffUtc,
        market: m.market,
        modelProb: m.modelProb,
        bookProb: m.bookProb,
        edge: m.edge,
        tier: m.tier,
      });
    }
  }
  rows.sort((a, b) => b.edge - a.edge);

  return (
    <main className="min-h-screen bg-[var(--bg-body)]" style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}>
      <header className="flex items-center" style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}>
        <h1 className="font-bold uppercase" style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Value Finder
        </h1>
      </header>
      <p className="font-mono text-[12px] mb-4" style={{ color: "var(--text-sec)" }}>
        Every model edge across today&apos;s fixtures, ranked by edge size.
      </p>
      <ValueFinderTable rows={rows} />
    </main>
  );
}
