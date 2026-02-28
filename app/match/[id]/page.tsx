import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { resolveProvider } from "@/lib/providers/registry";
import { isCup } from "@/lib/leagues";
import { getMatchStats, getTeamLastNMatchRows, getTeamRecentResults } from "@/lib/insights/team-stats";
import { getTeamPlayerStats } from "@/lib/insights/player-stats";
import { buildTrendsByStat } from "@/lib/insights/trend-chart-data";
import { getFeedMarketRows, getDetailScreenshotCharts } from "@/lib/insights/feed-market-stats";
import { CornersCard } from "@/app/components/CornersCard";
import { DetailTabs } from "@/app/components/DetailTabs";
import { FiltersReveal } from "@/app/components/FiltersReveal";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { FormDisplay } from "@/app/components/FormDisplay";
import { FormFilterLinks } from "@/app/components/FormFilterLinks";
import { PlayerPropsCard } from "@/app/components/PlayerPropsCard";
import { PredictedLineupCard } from "@/app/components/PredictedLineupCard";
import { PlayerProjectionsCard } from "@/app/components/PlayerProjectionsCard";
import { TotalGoalsSection } from "@/app/components/TotalGoalsSection";
import { TeamTotalsSection } from "@/app/components/TeamTotalsSection";
import { MoreStatsReveal } from "@/app/components/MoreStatsReveal";
import { predictLineup } from "@/lib/modeling/predicted-lineup";
import { getMatchPlayerSim } from "@/lib/modeling/player-sim";
import { estimateMatchGoalLambdas } from "@/lib/modeling/baseline-params";
import type { FeedPredictedLineup, FeedPlayerSim, FeedPlayerSimEntry } from "@/lib/feed";
import type { PredictedLineup } from "@/lib/modeling/predicted-lineup";
import type { PlayerSimResult } from "@/lib/modeling/player-sim";
import type { InsightFamily } from "@/lib/insights/catalog";
import type { PlayerPropStat } from "@/app/components/PlayerPropsCard";

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

async function getPlayerPropsFromApi(id: string): Promise<PlayerPropStat[]> {
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

function getPlayerPropsFromSeason(homeTeamName: string, awayTeamName: string): PlayerPropStat[] {
  const homeStats = getTeamPlayerStats(homeTeamName);
  const awayStats = getTeamPlayerStats(awayTeamName);
  return [...homeStats, ...awayStats].map((p) => ({
    id: p.playerId,
    name: p.name,
    teamName: p.teamName,
    shotsTotal: p.shotsPerGame,
    shotsOn: p.sotPerGame,
    goals: p.goals,
    assists: p.assists,
    appearances: p.appearances,
  }));
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
  searchParams: Promise<{ category?: string; venue?: string; sample?: string; debug?: string; form?: string }>;
}) {
  const { id } = await params;
  const search = (await searchParams) as { category?: string; venue?: string; sample?: string; debug?: string; form?: string };
  const category = search.category;
  const debugParam = search.debug;
  const formParam = search.form;
  const match = await getMatch(id);
  if (!match) notFound();
  const isFinished = match.homeGoals != null && match.awayGoals != null;

  let playerStats: PlayerPropStat[];
  let isSeasonAverage: boolean;
  if (isFinished) {
    const apiStats = await getPlayerPropsFromApi(id);
    if (apiStats.length > 0) {
      playerStats = apiStats;
      isSeasonAverage = false;
    } else {
      playerStats = getPlayerPropsFromSeason(match.homeTeamName, match.awayTeamName);
      isSeasonAverage = true;
    }
  } else {
    playerStats = getPlayerPropsFromSeason(match.homeTeamName, match.awayTeamName);
    isSeasonAverage = true;
  }
  const parsed = parseConditions(search);
  const venue = parsed.venue;
  const sample = parsed.sample;
  const currentCategory = (category as InsightFamily | "all" | undefined) ?? "all";
  const showDebug = debugParam === "1" || debugParam === "true";

  const fixtureDate = match.kickoffUtc?.slice(0, 10);
  const defaultFormSame = match.leagueId != null && isCup(match.leagueId);
  const formLeagueId =
    formParam === "all"
      ? undefined
      : formParam === "same"
        ? match.leagueId ?? undefined
        : defaultFormSame
          ? match.leagueId ?? undefined
          : undefined;
  const currentForm = formLeagueId != null ? ("same" as const) : ("all" as const);
  const statsOpts = { venue: "all" as const, leagueId: formLeagueId };
  const snapshotRows = getFeedMarketRows(match.homeTeamName, match.awayTeamName, fixtureDate, {
    leagueId: formLeagueId,
  });
  const screenshotCharts = getDetailScreenshotCharts(
    match.homeTeamName,
    match.awayTeamName,
    fixtureDate,
    { leagueId: formLeagueId }
  );

  const rollingStats = getMatchStats(
    match.homeTeamName,
    match.awayTeamName,
    fixtureDate,
    statsOpts
  );
  const homeLast10 = getTeamLastNMatchRows(match.homeTeamName, 10, fixtureDate, statsOpts);
  const awayLast10 = getTeamLastNMatchRows(match.awayTeamName, 10, fixtureDate, statsOpts);

  // Form display respects form filter (All vs This competition)
  const displayHomeForm = getTeamRecentResults(match.homeTeamName, 10, fixtureDate, { leagueId: formLeagueId });
  const displayAwayForm = getTeamRecentResults(match.awayTeamName, 10, fixtureDate, { leagueId: formLeagueId });

  // Compute corners data for CornersCard
  const homeHome5 = getTeamLastNMatchRows(match.homeTeamName, 5, fixtureDate, {
    venue: "home",
    leagueId: formLeagueId,
  });
  const awayAway5 = getTeamLastNMatchRows(match.awayTeamName, 5, fixtureDate, {
    venue: "away",
    leagueId: formLeagueId,
  });
  const homeCornersFor =
    homeHome5.length > 0
      ? homeHome5.reduce((sum, r) => sum + r.cornersFor, 0) / homeHome5.length
      : 0;
  const homeCornersAgainst =
    homeHome5.length > 0
      ? homeHome5.reduce((sum, r) => sum + r.cornersAgainst, 0) / homeHome5.length
      : 0;
  const homeTotalCorners = homeCornersFor + homeCornersAgainst;
  const awayCornersFor =
    awayAway5.length > 0
      ? awayAway5.reduce((sum, r) => sum + r.cornersFor, 0) / awayAway5.length
      : 0;
  const awayCornersAgainst =
    awayAway5.length > 0
      ? awayAway5.reduce((sum, r) => sum + r.cornersAgainst, 0) / awayAway5.length
      : 0;
  const awayTotalCorners = awayCornersFor + awayCornersAgainst;
  const cornersData =
    homeHome5.length > 0 || awayAway5.length > 0
      ? {
          homeCornersFor,
          homeCornersAgainst,
          homeTotalCorners,
          awayCornersFor,
          awayCornersAgainst,
          awayTotalCorners,
          combinedTotal: homeTotalCorners + awayTotalCorners,
          homeEdge: homeCornersFor - awayCornersAgainst,
          awayEdge: awayCornersFor - homeCornersAgainst,
        }
      : null;
  const homeTrends =
    rollingStats && homeLast10.length > 0
      ? buildTrendsByStat(homeLast10, rollingStats.home.l10)
      : null;
  const awayTrends =
    rollingStats && awayLast10.length > 0
      ? buildTrendsByStat(awayLast10, rollingStats.away.l10)
      : null;

  // Predicted lineups + player sim (upcoming matches only)
  let predictedHomeLineup: FeedPredictedLineup | undefined;
  let predictedAwayLineup: FeedPredictedLineup | undefined;
  let playerSimData: FeedPlayerSim | undefined;

  if (!isFinished) {
    const homeLineupRaw = predictLineup(match.homeTeamName, match.leagueId, fixtureDate);
    const awayLineupRaw = predictLineup(match.awayTeamName, match.leagueId, fixtureDate);

    const toFeedLineup = (l: PredictedLineup): FeedPredictedLineup => ({
      starters: l.starters.map((s) => ({
        playerId: s.playerId,
        name: s.name,
        position: s.position,
        startRate: s.startRate,
        confidence: s.confidence,
      })),
      teamMatchesPlayed: l.teamMatchesPlayed,
    });

    if (homeLineupRaw) predictedHomeLineup = toFeedLineup(homeLineupRaw);
    if (awayLineupRaw) predictedAwayLineup = toFeedLineup(awayLineupRaw);

    if (homeLineupRaw && awayLineupRaw) {
      const lambdas = estimateMatchGoalLambdas(match.homeTeamName, match.awayTeamName, fixtureDate, match.leagueId);
      if (lambdas) {
        const sim = getMatchPlayerSim(homeLineupRaw, awayLineupRaw, lambdas.lambdaHomeGoals, lambdas.lambdaAwayGoals, fixtureDate, match.leagueId);
        const convert = (r: PlayerSimResult): FeedPlayerSimEntry => ({
          playerId: r.playerId,
          name: r.name,
          position: r.position,
          confidence: r.confidence,
          anytimeScorerProb: r.anytimeScorerProb,
          expectedGoals: r.expectedGoals,
          expectedShots: r.expectedShots,
          expectedSOT: r.expectedSOT,
          expectedAssists: r.expectedAssists,
        });
        playerSimData = { home: sim.home.map(convert), away: sim.away.map(convert) };
      }
    }
  }

  return (
    <main className="app-shell min-h-screen flex flex-col bg-[var(--bg-body)]">
      <header
          className="flex justify-between items-center px-5 pt-8 pb-3"
          style={{ paddingTop: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
        >
          <Link
            href="/feed"
            className="font-bold uppercase text-[var(--text-main)] hover:text-[var(--text-sec)] transition-colors"
            style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            ← Match Details
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary px-5 pb-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}>
          <div className="flex items-center gap-2">
            {match.leagueName ? (
              <span
                className="font-semibold uppercase"
                style={{ color: "var(--text-sec)", fontSize: "10px" }}
              >
                {match.leagueName}
              </span>
            ) : null}
            <span>{formatKickoffTime(match.kickoffUtc)} GMT</span>
          </div>
          <span className="text-right">{match.venueName ?? "Venue TBD"}</span>
        </div>

        <div className="px-5 pb-2" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          <FormFilterLinks matchId={id} currentForm={currentForm} searchParams={search} />
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
                  className="w-6 h-6 object-contain shrink-0"
                  width={24}
                  height={24}
                />
                <span
                  className="font-semibold uppercase truncate block"
                  style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
                >
                  {match.homeTeamCode ?? match.homeTeamName}
                </span>
                {displayHomeForm.length > 0 ? <FormDisplay form={displayHomeForm} label="Home form" /> : null}
              </div>
              <div
                className="flex items-center gap-3"
                style={{ gap: "var(--space-sm)" }}
              >
                <img
                  src={match.awayTeamLogo}
                  alt=""
                  className="w-6 h-6 object-contain shrink-0"
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
                {displayAwayForm.length > 0 ? <FormDisplay form={displayAwayForm} label="Away form" /> : null}
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

      <DetailTabs />

      <TotalGoalsSection
        rows={snapshotRows.filter((r) => r.market !== "Corners")}
        totalGoalsChart={screenshotCharts.totalGoals}
      />

      <details className="border-t border-[var(--border-light)]">
        <summary className="px-5 py-3 cursor-pointer text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          Team totals
        </summary>
        {(homeHome5.length > 0 || awayAway5.length > 0) && (
          <TeamTotalsSection
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeGoalsFor={
              homeHome5.length > 0
                ? homeHome5.reduce((s, r) => s + r.goalsFor, 0) / homeHome5.length
                : 0
            }
            homeGoalsAgainst={
              homeHome5.length > 0
                ? homeHome5.reduce((s, r) => s + r.goalsAgainst, 0) / homeHome5.length
                : 0
            }
            awayGoalsFor={
              awayAway5.length > 0
                ? awayAway5.reduce((s, r) => s + r.goalsFor, 0) / awayAway5.length
                : 0
            }
            awayGoalsAgainst={
              awayAway5.length > 0
                ? awayAway5.reduce((s, r) => s + r.goalsAgainst, 0) / awayAway5.length
                : 0
            }
            homeMatchCount={homeHome5.length}
            awayMatchCount={awayAway5.length}
          />
        )}
      </details>

      <details className="border-t border-[var(--border-light)]">
        <summary className="px-5 py-3 cursor-pointer text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          Corners
        </summary>
        <section id="section-total-corners" aria-label="Corners">
          {cornersData && (
            <CornersCard
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
              data={cornersData}
            />
          )}
        </section>
      </details>

      {!isFinished && (predictedHomeLineup || predictedAwayLineup) && (
        <PredictedLineupCard
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
          homeLineup={predictedHomeLineup}
          awayLineup={predictedAwayLineup}
          playerSim={playerSimData}
        />
      )}

      {!isFinished && playerSimData && (
        <PlayerProjectionsCard
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
          playerSim={playerSimData}
        />
      )}

      <PlayerPropsCard
        playerStats={playerStats}
        homeTeamName={match.homeTeamName}
        awayTeamName={match.awayTeamName}
        isSeasonAverage={isSeasonAverage}
      />

      <MoreStatsReveal
        charts={screenshotCharts}
        homeTeamName={match.homeTeamName}
        awayTeamName={match.awayTeamName}
        homeTrends={homeTrends}
        awayTrends={awayTrends}
        rollingStats={rollingStats}
      />

      <FiltersReveal
        currentCategory={currentCategory}
        venue={venue}
        sample={sample}
      />

      {showDebug ? (
        <section className="px-5 py-3 border-t border-[var(--border-light)] text-[11px] font-mono text-tertiary overflow-x-auto">
          <p className="font-semibold text-[var(--text-sec)] mb-2">[Debug ?debug=1]</p>
          <p>home: {match.homeTeamName} | away: {match.awayTeamName} | date: {fixtureDate ?? "—"}</p>
        </section>
      ) : null}
    </main>
  );
}
