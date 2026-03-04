import { getFeedMatches } from "@/lib/build-feed";
import { ALL_COMPETITION_IDS, getLeagueColor, getCompetitionByLeagueId } from "@/lib/leagues";
import { computeMatchEdges } from "@/lib/edge-engine";
import { requireActiveSubscription } from "@/lib/auth-guard";
import Link from "next/link";

export default async function LeaguesPage() {
  await requireActiveSubscription();

  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, undefined, ALL_COMPETITION_IDS);

  // Group matches by leagueId
  const leagueMap = new Map<
    number,
    { name: string; matches: typeof matches; topEdge: ReturnType<typeof computeMatchEdges> }
  >();

  for (const match of matches) {
    const lid = match.leagueId;
    if (lid == null) continue;
    if (!leagueMap.has(lid)) {
      leagueMap.set(lid, { name: match.leagueName ?? "Unknown", matches: [], topEdge: null });
    }
    leagueMap.get(lid)!.matches.push(match);
  }

  // Compute top edge per league
  const leagues = Array.from(leagueMap.entries()).map(([leagueId, data]) => {
    let topEdge: ReturnType<typeof computeMatchEdges> = null;
    for (const m of data.matches) {
      const edges = computeMatchEdges(m);
      if (edges && (!topEdge || edges.bestEdge > topEdge.bestEdge)) {
        topEdge = edges;
      }
    }
    return { leagueId, name: data.name, matchCount: data.matches.length, topEdge };
  });

  // Sort by match count descending
  leagues.sort((a, b) => b.matchCount - a.matchCount);

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      <header
        className="flex items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Leagues
        </h1>
      </header>

      {leagues.length === 0 ? (
        <p className="font-mono text-sm pb-20" style={{ color: "var(--text-sec)" }}>
          No matches today.
        </p>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-20"
          style={{ gap: "var(--space-sm)" }}
        >
          {leagues.map((league) => {
            const color = getLeagueColor(league.leagueId);
            const comp = getCompetitionByLeagueId(league.leagueId);
            return (
              <Link
                key={league.leagueId}
                href={`/leagues/${league.leagueId}`}
                className="block cursor-pointer transition-colors hover:bg-[var(--bg-card)]"
                style={{
                  borderLeft: `3px solid ${color}`,
                  background: "var(--bg-panel)",
                  padding: "var(--space-sm)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-semibold text-[13px] uppercase"
                    style={{ color: "var(--text-main)" }}
                  >
                    {comp?.label ?? league.name}
                  </span>
                  <span
                    className="font-mono text-[11px] uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {league.matchCount} match{league.matchCount !== 1 ? "es" : ""}
                  </span>
                </div>

                {league.topEdge && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="font-mono text-[12px] uppercase"
                      style={{ color: "var(--text-sec)" }}
                    >
                      Top: {league.topEdge.bestMarket}
                    </span>
                    <span
                      className="font-mono text-[12px] font-semibold"
                      style={{ color: "var(--color-edge-strong)" }}
                    >
                      +{(league.topEdge.bestEdge * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {!league.topEdge && (
                  <p
                    className="font-mono text-[11px] uppercase mt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    No edges
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
