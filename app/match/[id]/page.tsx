import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { resolveProvider } from "@/lib/providers/registry";
import { getMatchStats, getTeamLastNMatchRows, type VenueFilter } from "@/lib/insights/team-stats";
import { buildTrendsByStat } from "@/lib/insights/trend-chart-data";
import { getWhatStandsOut } from "@/lib/insights/what-stands-out";
import { MatchDetailTabs } from "@/app/components/MatchDetailTabs";
import { CategoryScrubber } from "@/app/components/CategoryScrubber";
import { ConditionsRow } from "@/app/components/ConditionsRow";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { FormSummary } from "@/app/components/MatchCard";
import type { InsightFamily } from "@/lib/insights/catalog";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

async function getMatch(id: string) {
  return getMatchDetail(id);
}

type PlayerPropStat = {
  id: number;
  name: string;
  teamName: string;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
};

async function getPlayerProps(id: string): Promise<PlayerPropStat[]> {
  const fixtureId = Number(id);
  if (Number.isNaN(fixtureId)) return [];
  const { provider } = resolveProvider("api-football");
  const res = await provider.getFixturePlayers(fixtureId);
  const teams = res.response ?? [];
  return teams.flatMap((team) =>
    team.players.map((player) => {
      const stats = player.statistics?.[0];
      return {
        id: player.id,
        name: player.name,
        teamName: team.team.name,
        shotsTotal: stats?.shots?.total ?? null,
        shotsOn: stats?.shots?.on ?? null,
        goals: stats?.goals?.total ?? null,
        assists: stats?.goals?.assists ?? null,
      };
    })
  );
}

function topPlayers(
  players: PlayerPropStat[],
  key: "shotsTotal" | "shotsOn" | "goals" | "assists",
  limit = 3
) {
  return players
    .map((player) => ({ ...player, value: player[key] ?? 0 }))
    .filter((player) => player.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function sortByScore<T extends { totalScore: number }>(insights: T[]): T[] {
  return [...insights].sort((a, b) => b.totalScore - a.totalScore);
}

type VenueCondition = "Home" | "Away" | "Combined";
type SampleCondition = "L5" | "L10" | "Season";

function parseConditions(search: Record<string, string | undefined>): {
  venue: VenueCondition;
  sample: SampleCondition;
} {
  const venue = (search.venue as VenueCondition) ?? "Combined";
  const sample = (search.sample as SampleCondition) ?? "L10";
  return {
    venue: venue === "Home" || venue === "Away" || venue === "Combined" ? venue : "Combined",
    sample: sample === "L5" || sample === "L10" || sample === "Season" ? sample : "L10",
  };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; venue?: string; sample?: string; debug?: string }>;
}) {
  const { id } = await params;
  const search = (await searchParams) as { category?: string; venue?: string; sample?: string; debug?: string };
  const category = search.category;
  const debugParam = search.debug;
  const { venue, sample } = parseConditions(search);
  const match = await getMatch(id);
  if (!match) notFound();

  const currentCategory = (category as InsightFamily | "all" | undefined) ?? "all";
  const showDebug = debugParam === "1" || debugParam === "true";

  const insightsByFamily = match.insightsByFamily ?? {};
  const fixtureDate = match.kickoffUtc?.slice(0, 10);
  const venueFilter: VenueFilter = venue === "Home" ? "home" : venue === "Away" ? "away" : "all";
  const rollingStats = getMatchStats(
    match.homeTeamName,
    match.awayTeamName,
    fixtureDate,
    { venue: venueFilter }
  );
  const n = sample === "L5" ? 5 : sample === "Season" ? 38 : 10;
  const rollingRef = sample === "L5" ? "l5" : sample === "Season" ? "season" : "l10";
  const homeLastN = getTeamLastNMatchRows(match.homeTeamName, n, fixtureDate, { venue: venueFilter });
  const awayLastN = getTeamLastNMatchRows(match.awayTeamName, n, fixtureDate, { venue: venueFilter });
  const homeTrends =
    rollingStats && homeLastN.length > 0
      ? buildTrendsByStat(homeLastN, rollingStats.home[rollingRef])
      : null;
  const awayTrends =
    rollingStats && awayLastN.length > 0
      ? buildTrendsByStat(awayLastN, rollingStats.away[rollingRef])
      : null;
  const { provider } = resolveProvider("api-football");
  const h2hRes = await provider.getH2HFixtures(
    match.homeTeamId,
    match.awayTeamId,
    { last: 20, league: 39 }
  );
  const h2hFixtures = h2hRes.response ?? [];
  const playerStats = await getPlayerProps(id);
  const playerProps = [
    { key: "shotsTotal", title: "Shots", label: "Shots" },
    { key: "shotsOn", title: "Shots on Target", label: "SOT" },
    { key: "goals", title: "Goalscorer", label: "Goals" },
    { key: "assists", title: "Assists", label: "Assists" },
  ] as const;
  const allInsights = sortByScore(
    Object.values(insightsByFamily).flat()
  );
  const overviewInsights = allInsights.slice(0, 8);
  const whatStandsOut = getWhatStandsOut(rollingStats, sample);

  const isFinished = match.homeGoals != null && match.awayGoals != null;

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ maxHeight: "calc(100vh - 48px)" }}
    >
      <div className="bg-[var(--bg-body)]">
        <header
          className="flex justify-between items-center px-5 pt-8 pb-3"
          style={{ paddingTop: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <Link
            href="/"
            className="font-medium text-[var(--text-main)] hover:text-[var(--text-sec)] transition-colors"
            style={{ fontSize: "32px", letterSpacing: "-1px", lineHeight: 1.1 }}
          >
            ← Match Details
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary px-5 pb-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}>
          <span>{formatKickoffTime(match.kickoffUtc)} GMT</span>
          <span className="text-right">{match.venueName ?? "Venue TBD"}</span>
        </div>

        <div
          className="flex items-center gap-3 px-5 pb-3"
          style={{ gap: "var(--space-sm)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-0.5">
              <div
                className="flex items-center gap-3"
                style={{ gap: "var(--space-sm)" }}
              >
                <img
                  src={match.homeTeamLogo}
                  alt=""
                  className="w-6 h-6 object-contain shrink-0 rounded-sm"
                  width={24}
                  height={24}
                />
                <span
                  className="font-semibold uppercase truncate block"
                  style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
                >
                  {match.homeTeamCode ?? match.homeTeamName}
                </span>
                {match.homeForm ? <FormSummary form={match.homeForm} /> : null}
              </div>
              <div
                className="flex items-center gap-3"
                style={{ gap: "var(--space-sm)" }}
              >
                <img
                  src={match.awayTeamLogo}
                  alt=""
                  className="w-6 h-6 object-contain shrink-0 rounded-sm"
                  width={24}
                  height={24}
                />
                <span
                  className="font-semibold uppercase truncate block"
                  style={{
                    fontSize: "28px",
                    letterSpacing: "-0.8px",
                    lineHeight: 1.05,
                  }}
                >
                  {match.awayTeamCode ?? match.awayTeamName}
                </span>
                {match.awayForm ? <FormSummary form={match.awayForm} /> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isFinished ? (
              <span
                className="text-mono stat-value font-medium"
                style={{ fontSize: "15px" }}
              >
                {match.homeGoals} – {match.awayGoals}
              </span>
            ) : null}
          </div>
        </div>

        <CategoryScrubber currentCategory={currentCategory} />
        <ConditionsRow venue={venue} sample={sample} time="Full" />
      </div>

      {showDebug ? (
        <section className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)] text-[11px] font-mono text-tertiary overflow-x-auto">
          <p className="font-semibold text-[var(--text-sec)] mb-2">[Debug ?debug=1]</p>
          <p>home: {match.homeTeamName} | away: {match.awayTeamName} | date: {fixtureDate ?? "—"} | venue: {venue} | sample: {sample}</p>
          <p>homeLastN.length: {homeLastN.length} | awayLastN.length: {awayLastN.length}</p>
          {homeLastN.length > 0 ? (
            <p>homeLastN[0]: goalsFor={homeLastN[0].goalsFor} vs {homeLastN[0].opponentName}</p>
          ) : null}
          {rollingStats ? (
            <p>rollingStats.home.{rollingRef}.goalsFor: {rollingStats.home[rollingRef].goalsFor} | away: {rollingStats.away[rollingRef].goalsFor}</p>
          ) : (
            <p>rollingStats: null</p>
          )}
        </section>
      ) : null}
      {whatStandsOut.length > 0 ? (
        <section
          className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)]"
          style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
          aria-label="What stands out"
        >
          <p className="text-mono text-[11px] uppercase text-tertiary mb-2">What stands out</p>
          <ul className="list-disc list-inside space-y-1 text-[13px] text-[var(--text-sec)]">
            {whatStandsOut.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section
        className="flex flex-col gap-5 px-5 border-t border-[var(--border-light)] pt-5 overflow-y-auto"
        style={{ gap: "var(--space-md)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <MatchDetailTabs
          overviewInsights={overviewInsights}
          insightsByFamily={insightsByFamily}
          playerStats={playerStats}
          playerProps={playerProps}
          rollingStats={rollingStats}
          h2hFixtures={h2hFixtures}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
          homeTrends={homeTrends}
          awayTrends={awayTrends}
          currentCategory={currentCategory}
          venue={venue}
          sample={sample}
        />
      </section>
    </main>
  );
}
