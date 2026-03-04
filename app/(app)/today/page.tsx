import { getFeedMatches } from "@/lib/build-feed";
import { computeMatchEdges, type MatchEdges } from "@/lib/edge-engine";
import { ALL_COMPETITION_IDS, getLeagueColor } from "@/lib/leagues";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { PickCard } from "@/app/components/PickCard";
import { EdgeLeaderboard } from "@/app/components/EdgeLeaderboard";
import { MarketBreakdownStrip } from "@/app/components/MarketBreakdownStrip";
import { LeaguePulse } from "@/app/components/LeaguePulse";

export default async function TodayPage() {
  await requireActiveSubscription();

  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, undefined, ALL_COMPETITION_IDS);

  const allEdges = matches
    .map((m) => ({ match: m, edges: computeMatchEdges(m) }))
    .filter(
      (e): e is { match: (typeof matches)[0]; edges: MatchEdges } =>
        e.edges !== null
    )
    .sort((a, b) => b.edges.bestEdge - a.edges.bestEdge);

  // Top picks: HIGH or MEDIUM tier, top 5
  const picks = allEdges
    .filter(
      (e) => e.edges.bestTier === "HIGH" || e.edges.bestTier === "MEDIUM"
    )
    .slice(0, 5);

  // Market breakdown: count edges by market type
  const marketCounts = new Map<string, number>();
  for (const { edges } of allEdges) {
    for (const m of edges.markets) {
      marketCounts.set(m.market, (marketCounts.get(m.market) ?? 0) + 1);
    }
  }

  // League pulse: group by league
  const leagueGroups = new Map<
    number,
    { name: string; matches: number; topEdge: MatchEdges | null }
  >();
  for (const m of matches) {
    if (!m.leagueId) continue;
    const existing = leagueGroups.get(m.leagueId);
    const mEdges = computeMatchEdges(m);
    if (!existing) {
      leagueGroups.set(m.leagueId, {
        name: m.leagueName ?? "",
        matches: 1,
        topEdge: mEdges,
      });
    } else {
      existing.matches++;
      if (
        mEdges &&
        (!existing.topEdge || mEdges.bestEdge > existing.topEdge.bestEdge)
      ) {
        existing.topEdge = mEdges;
      }
    }
  }

  // Generate tagline
  const topMarket = picks.length > 0 ? picks[0].edges.bestMarket : null;
  const highCount = picks.length;
  const tagline =
    topMarket && highCount > 0
      ? `${highCount} high-edge projection${highCount !== 1 ? "s" : ""} identified today`
      : `${matches.length} match${matches.length !== 1 ? "es" : ""} across all leagues today`;

  return (
    <main className="app-shell min-h-screen flex flex-col bg-[var(--bg-body)]">
      {/* Daily Header */}
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
          Daily Brief
        </h1>
        <p
          className="font-mono text-[12px] uppercase mt-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {new Date()
            .toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })
            .toUpperCase()}
          {" · "}
          {matches.length} MATCH{matches.length !== 1 ? "ES" : ""}
        </p>
        <p className="text-[13px] mt-2" style={{ color: "var(--text-sec)" }}>
          {tagline}
        </p>
      </header>

      {/* Top Picks Rail */}
      {picks.length > 0 && (
        <section style={{ paddingBottom: "var(--space-md)" }}>
          <h2
            className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3"
            style={{ color: "var(--text-main)" }}
          >
            Top Picks
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: "var(--space-sm)" }}
          >
            {picks.map(({ match, edges }) => (
              <PickCard key={match.id} match={match} edges={edges} />
            ))}
          </div>
        </section>
      )}

      {/* Market Breakdown Strip */}
      <MarketBreakdownStrip counts={Object.fromEntries(marketCounts)} />

      {/* Edge Leaderboard */}
      <section style={{ paddingTop: "var(--space-md)" }}>
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3"
          style={{ color: "var(--text-main)" }}
        >
          Edge Leaderboard
        </h2>
        <EdgeLeaderboard edges={allEdges.map((e) => e.edges)} />
      </section>

      {/* League Pulse */}
      {leagueGroups.size > 0 && (
        <section
          style={{
            paddingTop: "var(--space-lg)",
            paddingBottom: "var(--space-lg)",
          }}
        >
          <h2
            className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3"
            style={{ color: "var(--text-main)" }}
          >
            League Pulse
          </h2>
          <LeaguePulse
            leagues={Array.from(leagueGroups.entries()).map(([id, data]) => ({
              leagueId: id,
              ...data,
            }))}
          />
        </section>
      )}
    </main>
  );
}
