export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getMatchDetail } from "@/lib/build-feed";
import { requireActiveSubscription } from "@/lib/auth-guard";
import { isCup } from "@/lib/leagues";
import { getMatchStats, getTeamLastNMatchRows, getTeamRecentResults } from "@/lib/insights/team-stats";
import { getTeamPlayerStats } from "@/lib/insights/player-stats";
import { buildTrendsByStat } from "@/lib/insights/trend-chart-data";
import { getFeedMarketRows, getDetailScreenshotCharts } from "@/lib/insights/feed-market-stats";
import { getPrecomputedSim } from "@/lib/modeling/sim-reader";
import { FormFilterLinks } from "@/app/components/FormFilterLinks";
import { MatchPillNav } from "@/app/components/MatchPillNav";
import type { TabId } from "@/app/components/MatchPillNav";
import { TeamRadar, type TeamRadarData } from "@/app/components/TeamRadar";
import { OverviewTab } from "@/app/components/tabs/OverviewTab";
import { GoalsTab } from "@/app/components/tabs/GoalsTab";
import { ShotsTab } from "@/app/components/tabs/ShotsTab";
import { CornersTab } from "@/app/components/tabs/CornersTab";
import { CardsTab } from "@/app/components/tabs/CardsTab";
import { PlayersTab } from "@/app/components/tabs/PlayersTab";
import { SimulationTab } from "@/app/components/tabs/SimulationTab";
import { H2HTab } from "@/app/components/tabs/H2HTab";
import { ValueTab } from "@/app/components/tabs/ValueTab";
import { predictLineup, predictLineupFromDb } from "@/lib/modeling/predicted-lineup";
import { getMatchPlayerSim } from "@/lib/modeling/player-sim";
import { attachPlayerMarketComparison } from "@/lib/modeling/player-market-odds";
import { estimateMatchGoalLambdas } from "@/lib/modeling/baseline-params";
import { getInjuredPlayersByTeam, getRecentLineupsBatch } from "@/lib/db-queries";
import { getDb } from "@/lib/db";
import { team } from "@/lib/db-schema";
import { resolveProvider } from "@/lib/providers/registry";
import { computeTeamRadar, resolveTeamLeagueSeason, seasonYearToLabel } from "@/lib/radar";
import type { FeedPredictedLineup, FeedPlayerSim, FeedPlayerSimEntry } from "@/lib/feed";
import type { PredictedLineup } from "@/lib/modeling/predicted-lineup";
import type { PlayerSimResult } from "@/lib/modeling/player-sim";
import type { PlayerPropStat } from "@/app/components/PlayerPropsCard";
import type { ApiFootballOddsResponse } from "@/lib/api-football-types";

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

const VALID_TABS: TabId[] = ["overview", "goals", "shots", "corners", "cards", "h2h", "players", "teams", "value", "simulation"];

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; venue?: string; sample?: string; debug?: string; form?: string }>;
}) {
  await requireActiveSubscription();

  const { id } = await params;
  const search = (await searchParams) as { tab?: string; venue?: string; sample?: string; debug?: string; form?: string };
  const rawTab = search.tab ?? "overview";
  const activeTab: TabId = VALID_TABS.includes(rawTab as TabId) ? (rawTab as TabId) : "overview";
  const debugParam = search.debug;
  const formParam = search.form;
  const match = await getMatch(id);
  if (!match) notFound();
  const isFinished = match.homeGoals != null && match.awayGoals != null;

  const playerStats = getPlayerPropsFromSeason(match.homeTeamName, match.awayTeamName);
  const isSeasonAverage = true;
  const precomputed = getPrecomputedSim(match.providerFixtureId, match.kickoffUtc);

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

  const displayHomeForm = getTeamRecentResults(match.homeTeamName, 10, fixtureDate, { leagueId: formLeagueId });
  const displayAwayForm = getTeamRecentResults(match.awayTeamName, 10, fixtureDate, { leagueId: formLeagueId });

  // Corners data
  const homeHome5 = getTeamLastNMatchRows(match.homeTeamName, 5, fixtureDate, {
    venue: "home",
    leagueId: formLeagueId,
  });
  const awayAway5 = getTeamLastNMatchRows(match.awayTeamName, 5, fixtureDate, {
    venue: "away",
    leagueId: formLeagueId,
  });
  const homeCornersFor = homeHome5.length > 0 ? homeHome5.reduce((sum, r) => sum + r.cornersFor, 0) / homeHome5.length : 0;
  const homeCornersAgainst = homeHome5.length > 0 ? homeHome5.reduce((sum, r) => sum + r.cornersAgainst, 0) / homeHome5.length : 0;
  const homeTotalCorners = homeCornersFor + homeCornersAgainst;
  const awayCornersFor = awayAway5.length > 0 ? awayAway5.reduce((sum, r) => sum + r.cornersFor, 0) / awayAway5.length : 0;
  const awayCornersAgainst = awayAway5.length > 0 ? awayAway5.reduce((sum, r) => sum + r.cornersAgainst, 0) / awayAway5.length : 0;
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

  // Corner thresholds from combined venue-filtered data
  const cornersCombined = [...homeHome5, ...awayAway5];
  const cornerThresholds = cornersCombined.length > 0
    ? [8.5, 9.5, 10.5, 11.5].map((t) => ({
        label: `O${t}`,
        hits: cornersCombined.filter((r) => r.cornersFor + r.cornersAgainst > t).length,
        total: cornersCombined.length,
      }))
    : [];

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
    const teamIds = [match.homeTeamId, match.awayTeamId];
    const [injuredMap, recentLineupsMap] = await Promise.all([
      getInjuredPlayersByTeam(teamIds),
      getRecentLineupsBatch(teamIds, fixtureDate, 10),
    ]);
    const homeInjured = injuredMap.get(match.homeTeamId);
    const awayInjured = injuredMap.get(match.awayTeamId);
    const homeRecent = recentLineupsMap.get(match.homeTeamId);
    const awayRecent = recentLineupsMap.get(match.awayTeamId);
    const homeLineupRaw = (homeRecent && homeRecent.length > 0
      ? predictLineupFromDb(match.homeTeamName, homeRecent, homeInjured)
      : null) ?? predictLineup(match.homeTeamName, match.leagueId, fixtureDate, homeInjured);
    const awayLineupRaw = (awayRecent && awayRecent.length > 0
      ? predictLineupFromDb(match.awayTeamName, awayRecent, awayInjured)
      : null) ?? predictLineup(match.awayTeamName, match.leagueId, fixtureDate, awayInjured);

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
      const precomputedHomeLambda = precomputed?.sim?.expectedHomeGoals;
      const precomputedAwayLambda = precomputed?.sim?.expectedAwayGoals;
      let homeLambda = precomputedHomeLambda;
      let awayLambda = precomputedAwayLambda;

      if (homeLambda == null || awayLambda == null) {
        const lambdas = estimateMatchGoalLambdas(match.homeTeamName, match.awayTeamName, fixtureDate, match.leagueId);
        if (lambdas) {
          homeLambda = lambdas.lambdaHomeGoals;
          awayLambda = lambdas.lambdaAwayGoals;
        }
      }

      if (homeLambda != null && awayLambda != null) {
        const sim = getMatchPlayerSim(
          homeLineupRaw,
          awayLineupRaw,
          homeLambda,
          awayLambda,
          fixtureDate,
          match.leagueId,
          { simulations: 100000, randomSeed: match.providerFixtureId, tempoStd: 0.15 }
        );
        const convert = (r: PlayerSimResult): FeedPlayerSimEntry => ({
          playerId: r.playerId,
          name: r.name,
          position: r.position,
          confidence: r.confidence,
          anytimeScorerProb: r.anytimeScorerProb,
          anytimeAssistProb: r.anytimeAssistProb,
          expectedGoals: r.expectedGoals,
          expectedShots: r.expectedShots,
          expectedSOT: r.expectedSOT,
          expectedAssists: r.expectedAssists,
        });
        const basePlayerSimData: FeedPlayerSim = { home: sim.home.map(convert), away: sim.away.map(convert) };

        let oddsResponse: ApiFootballOddsResponse | null = null;
        try {
          const provider = resolveProvider("api-football").provider;
          oddsResponse = await provider.getOdds(match.providerFixtureId);
        } catch {
          oddsResponse = null;
        }
        playerSimData = attachPlayerMarketComparison(basePlayerSimData, oddsResponse);
      }
    }
  }

  // Sim data
  const hasSimData = precomputed != null;

  const showDebug = debugParam === "1" || debugParam === "true";

  const radarTeamIds = [match.homeTeamId, match.awayTeamId];
  const radarTeamRows = await getDb()
    .select({ id: team.id, name: team.name, logo: team.logo })
    .from(team)
    .where(inArray(team.id, radarTeamIds));
  const radarById = new Map(radarTeamRows.map((row) => [row.id, row]));
  const radarTeams: TeamRadarData[] = radarTeamIds.map((teamId) => {
    const meta = radarById.get(teamId);
    if (!meta) {
      return {
        team_id: String(teamId),
        team_name: `Team ${teamId}`,
        league: null,
        matches_played: 0,
        crest_url: null,
        error: {
          code: "team_not_found",
          message: `No seasonal data found for Team ${teamId}.`,
        },
      };
    }

    const leagueSeason = resolveTeamLeagueSeason(meta.name, null);
    if (!leagueSeason) {
      return {
        team_id: String(meta.id),
        team_name: meta.name,
        league: null,
        matches_played: 0,
        crest_url: meta.logo ?? null,
        error: {
          code: "no_season_data",
          message: `No seasonal data found for ${meta.name}.`,
        },
      };
    }

    const radar = computeTeamRadar(
      meta.name,
      leagueSeason.leagueId,
      leagueSeason.leagueName,
      leagueSeason.seasonYear,
    );
    if (!radar) {
      return {
        team_id: String(meta.id),
        team_name: meta.name,
        league: leagueSeason.leagueName,
        matches_played: 0,
        crest_url: meta.logo ?? null,
        error: {
          code: "no_season_data",
          message: `No seasonal data found for ${meta.name}.`,
        },
      };
    }

    if (radar.matchesPlayed < 5) {
      return {
        team_id: String(meta.id),
        team_name: meta.name,
        league: radar.leagueName,
        matches_played: radar.matchesPlayed,
        crest_url: meta.logo ?? null,
        error: {
          code: "insufficient_matches",
          message: `${meta.name} has played fewer than 5 league matches this season. Radar unavailable.`,
        },
      };
    }

    return {
      team_id: String(meta.id),
      team_name: meta.name,
      league: radar.leagueName,
      matches_played: radar.matchesPlayed,
      crest_url: meta.logo ?? null,
      percentiles: radar.percentiles,
      raw: radar.raw,
    };
  });
  const seasonCandidate = radarTeams.find((t) => t.percentiles);
  const radarSeasonLabel = seasonCandidate
    ? seasonYearToLabel(resolveTeamLeagueSeason(seasonCandidate.team_name, null)?.seasonYear ?? new Date().getFullYear())
    : `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`;

  // Cards thresholds
  const cardsCombined = [...homeLast10, ...awayLast10];
  const cardThresholds = cardsCombined.length > 0
    ? [2.5, 3.5, 4.5].map((t) => ({
        label: `Total Cards O${t}`,
        hits: cardsCombined.filter((r) => r.yellowCards + r.redCards > t).length,
        total: cardsCombined.length,
      }))
    : [];

  // Team totals for GoalsTab
  const homeGoalsFor = homeHome5.length > 0 ? homeHome5.reduce((s, r) => s + r.goalsFor, 0) / homeHome5.length : 0;
  const homeGoalsAgainst = homeHome5.length > 0 ? homeHome5.reduce((s, r) => s + r.goalsAgainst, 0) / homeHome5.length : 0;
  const awayGoalsFor = awayAway5.length > 0 ? awayAway5.reduce((s, r) => s + r.goalsFor, 0) / awayAway5.length : 0;
  const awayGoalsAgainst = awayAway5.length > 0 ? awayAway5.reduce((s, r) => s + r.goalsAgainst, 0) / awayAway5.length : 0;

  return (
    <main className="app-shell--detail min-h-screen flex flex-col bg-[var(--bg-body)]">
      <header
        className="flex items-center justify-between px-5 pt-8 pb-3"
        style={{ paddingTop: "var(--space-lg)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
      >
        <Link
          href="/matches"
          className="uppercase text-[var(--text-sec)] hover:text-[var(--text-main)] transition-colors"
          style={{ fontSize: "13px", letterSpacing: "0.02em", lineHeight: 1.2 }}
        >
          &larr; Matches
        </Link>
      </header>

      <div className="flex items-center justify-between text-mono text-[12px] uppercase text-tertiary px-5 pb-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}>
        <div className="flex items-center gap-2">
          {match.leagueName ? (
            <span className="font-semibold uppercase" style={{ color: "var(--text-sec)", fontSize: "12px" }}>
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

      {/* Teams header - side by side on desktop */}
      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-5 pb-3"
        style={{ gap: "var(--space-sm)", paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", paddingBottom: "var(--space-sm)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-6 gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-3" style={{ gap: "var(--space-sm)" }}>
            <img src={match.homeTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
            <span className="font-semibold uppercase truncate block" style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}>
              {match.homeTeamCode ?? match.homeTeamName}
            </span>
          </div>
          <span className="hidden lg:inline text-tertiary text-[16px]">v</span>
          <div className="flex items-center gap-3" style={{ gap: "var(--space-sm)" }}>
            <img src={match.awayTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
            <span className="font-semibold uppercase truncate block" style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}>
              {match.awayTeamCode ?? match.awayTeamName}
            </span>
          </div>
        </div>
        {isFinished && (
          <span className="text-mono stat-value font-medium shrink-0" style={{ fontSize: "15px" }}>
            {match.homeGoals} &ndash; {match.awayGoals}
          </span>
        )}
      </div>

      <MatchPillNav activeTab={activeTab} hasSimData={hasSimData} hasH2H={!!match.h2hSummary} />

      <div className="flex-1">
        {activeTab === "overview" && (
          <OverviewTab
            rows={snapshotRows.filter((r) => r.market !== "Corners")}
            totalGoalsChart={screenshotCharts.totalGoals}
            displayHomeForm={displayHomeForm}
            displayAwayForm={displayAwayForm}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            sim={precomputed?.sim ?? null}
            feedProbs={precomputed?.feedProbs ?? null}
            homeLast10={homeLast10}
            awayLast10={awayLast10}
            h2hSummary={match.h2hSummary}
          />
        )}

        {activeTab === "goals" && (
          <GoalsTab
            rows={snapshotRows.filter((r) => r.market !== "Corners")}
            charts={screenshotCharts}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeGoalsFor={homeGoalsFor}
            homeGoalsAgainst={homeGoalsAgainst}
            awayGoalsFor={awayGoalsFor}
            awayGoalsAgainst={awayGoalsAgainst}
            homeMatchCount={homeHome5.length}
            awayMatchCount={awayAway5.length}
            homeTrends={homeTrends}
            awayTrends={awayTrends}
            homeLast10={homeLast10}
            awayLast10={awayLast10}
            feedProbs={precomputed?.feedProbs ?? null}
          />
        )}

        {activeTab === "shots" && (
          <ShotsTab
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeStats={rollingStats?.home.l10 ?? null}
            awayStats={rollingStats?.away.l10 ?? null}
            homeTrends={homeTrends}
            awayTrends={awayTrends}
            feedProbs={precomputed?.feedProbs ?? null}
          />
        )}

        {activeTab === "corners" && (
          <CornersTab
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            cornersData={cornersData}
            charts={{
              totalCorners: screenshotCharts.totalCorners,
              homeCornersFor: screenshotCharts.homeCornersFor,
              awayCornersFor: screenshotCharts.awayCornersFor,
            }}
            cornerThresholds={cornerThresholds}
            feedProbs={precomputed?.feedProbs ?? null}
          />
        )}

        {activeTab === "cards" && (
          <CardsTab
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeStats={rollingStats?.home.l10 ?? null}
            awayStats={rollingStats?.away.l10 ?? null}
            cardThresholds={cardThresholds}
            referee={match.referee}
            feedProbs={precomputed?.feedProbs ?? null}
          />
        )}

        {activeTab === "h2h" && (
          <H2HTab
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            h2hSummary={match.h2hSummary}
          />
        )}

        {activeTab === "players" && (
          <PlayersTab
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            isFinished={isFinished}
            predictedHomeLineup={predictedHomeLineup}
            predictedAwayLineup={predictedAwayLineup}
            playerSimData={playerSimData}
            playerStats={playerStats}
            isSeasonAverage={isSeasonAverage}
          />
        )}

        {activeTab === "teams" && (
          <div className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <TeamRadar teams={radarTeams} season={radarSeasonLabel} showTable showRawValues />
          </div>
        )}

        {activeTab === "value" && (
          <ValueTab
            feedProbs={precomputed?.feedProbs ?? null}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
          />
        )}

        {activeTab === "simulation" && (
          <SimulationTab
            sim={precomputed?.sim ?? null}
            feedProbs={precomputed?.feedProbs ?? null}
            inputs={precomputed?.inputs ?? null}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            predictedHomeLineup={predictedHomeLineup}
            predictedAwayLineup={predictedAwayLineup}
          />
        )}
      </div>

      {showDebug ? (
        <section className="px-5 py-3 border-t border-[var(--border-light)] text-[12px] font-mono text-tertiary overflow-x-auto">
          <p className="font-semibold text-[var(--text-sec)] mb-2">[Debug ?debug=1]</p>
          <p>home: {match.homeTeamName} | away: {match.awayTeamName} | date: {fixtureDate ?? "\u2014"}</p>
        </section>
      ) : null}
    </main>
  );
}
