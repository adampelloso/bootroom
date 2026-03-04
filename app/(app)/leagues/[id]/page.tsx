import { getFeedMatches } from "@/lib/build-feed";
import { SUPPORTED_COMPETITIONS, getLeagueColor, getCompetitionByLeagueId } from "@/lib/leagues";
import { computeMatchEdges, type MatchEdges } from "@/lib/edge-engine";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { MatchCard } from "@/app/components/MatchCard";
import { EdgeLeaderboard } from "@/app/components/EdgeLeaderboard";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leagueId = parseInt(id, 10);
  const comp = getCompetitionByLeagueId(leagueId);
  if (!comp) notFound();

  await requireActiveSubscription();

  const today = new Date().toISOString().slice(0, 10);
  const matches = await getFeedMatches(today, undefined, [leagueId]);
  const color = getLeagueColor(leagueId);

  // Compute edges for each match
  const allEdges: MatchEdges[] = [];
  for (const match of matches) {
    const edges = computeMatchEdges(match);
    if (edges) allEdges.push(edges);
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg-body)]"
      style={{ maxWidth: "720px", margin: "0 auto", padding: "0 var(--space-md)" }}
    >
      {/* League header */}
      <header
        className="flex items-center gap-3"
        style={{
          paddingTop: "var(--space-lg)",
          paddingBottom: "var(--space-sm)",
          borderLeft: `4px solid ${color}`,
          paddingLeft: "var(--space-sm)",
        }}
      >
        <div>
          <h1
            className="font-bold uppercase"
            style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {comp.label}
          </h1>
          <p
            className="font-mono text-[12px] uppercase mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {matches.length} match{matches.length !== 1 ? "es" : ""} today
          </p>
        </div>
      </header>

      {/* Back link */}
      <div style={{ paddingBottom: "var(--space-sm)" }}>
        <Link
          href="/leagues"
          className="font-mono text-[12px] uppercase hover:underline"
          style={{ color: "var(--text-sec)" }}
        >
          &larr; All Leagues
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="font-mono text-sm pb-20" style={{ color: "var(--text-sec)" }}>
          No matches scheduled today.
        </p>
      ) : (
        <div className="pb-20">
          {/* Match cards */}
          <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
            {matches.map((match) => (
              <MatchCard key={match.providerFixtureId} match={match} />
            ))}
          </div>

          {/* Edge leaderboard */}
          {allEdges.length > 0 && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <h2
                className="font-bold uppercase mb-3"
                style={{ fontSize: "14px", letterSpacing: "-0.01em", color: "var(--text-main)" }}
              >
                Edge Leaderboard
              </h2>
              <EdgeLeaderboard edges={allEdges} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
