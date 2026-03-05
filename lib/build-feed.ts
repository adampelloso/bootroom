/**
 * Build feed and match detail from Turso DB.
 * Zero external API calls at runtime — all data comes from ingested DB tables.
 * Insights use real L5/L10 data from ingested fixtures when available; otherwise stub.
 */
import type { FeedMatch, FeedInsight, MatchDetail, MatchDetailInsight, FormResult } from "./feed";
import { selectThreeForMatch } from "@/lib/insights/select";
import {
  DETAIL_INSIGHT_KEYS,
  getVenueContextForInsightKey,
} from "@/lib/insights/catalog";
import type { InsightType } from "@/lib/insights/catalog";
import type { RealContext } from "@/lib/insights/real-context";
import type { SignalConfidence, SignalDirection } from "./feed";
import { buildStubContext } from "@/lib/insights/stub-context";
import { buildRealContext } from "@/lib/insights/real-context";
import { fillInsightTemplate } from "@/lib/insights/fill-template";
import { getMatchStats, preloadTeamStats, preloadLeagueAverages } from "@/lib/insights/team-stats";
import { preloadPlayers } from "@/lib/insights/player-stats";
import { getTeamStats } from "@/lib/insights/team-stats";
import { getFeedMarketRows, feedMatchScore } from "@/lib/insights/feed-market-stats";
import { getWhatStandsOut } from "@/lib/insights/what-stands-out";
import { getFeedMatchModelProbs } from "@/lib/modeling/feed-model-probs";
import type { MarketProbabilities } from "@/lib/odds/the-odds-api";
import { preloadSimulations } from "@/lib/modeling/sim-reader";
import type { H2HSummary, H2HMatchRow } from "./feed";
import {
  DEFAULT_LEAGUE_ID,
  getCompetitionByLeagueId,
} from "@/lib/leagues";
import { predictLineup, predictLineupFromDb } from "@/lib/modeling/predicted-lineup";
import { getMatchPlayerSim } from "@/lib/modeling/player-sim";
import type { FeedPredictedLineup, FeedPlayerSim, FeedPlayerSimEntry } from "./feed";
import type { PredictedLineup } from "@/lib/modeling/predicted-lineup";
import type { PlayerSimResult } from "@/lib/modeling/player-sim";
import {
  getFixturesByDateRange,
  getFixtureById,
  getTeamCodeMap,
  getTeamLogoMap,
  getOddsForFixtures,
  getH2HFixtures,
  getH2HForPairs,
  getTeamFormBatch,
  getInjuredPlayersByTeam,
  getRecentLineupsBatch,
  type DbFixture,
  type RecentStarterRow,
} from "@/lib/db-queries";

/** Short labels for feed pills from catalog marketKey. */
const MARKET_KEY_TO_LABEL: Record<string, string> = {
  total_goals: "O/U",
  team_totals: "Team Goals",
  btts: "BTTS",
  total_corners: "Corners",
  team_corners: "Team Corners",
  most_corners: "Corners",
  team_shots: "Shots",
  team_shots_on_target: "SOT",
  match_result: "Match",
  double_chance: "Double Chance",
  first_half_total_goals: "1H Goals",
  second_half_total_goals: "2H Goals",
  correct_score_band: "Correct Score",
  higher_scoring_half: "Half",
  win_either_half: "Half",
  anytime_goalscorer: "Anytime",
  player_shots: "Player Shots",
  player_shots_on_target: "Player SOT",
};

function marketLabel(marketKey: string | undefined): string {
  if (!marketKey) return "Stats";
  return MARKET_KEY_TO_LABEL[marketKey] ?? marketKey.replace(/_/g, " ");
}

function deriveDirection(type: InsightType, _ctx: RealContext | ReturnType<typeof buildStubContext>): SignalDirection {
  const k = type.key;
  if (k === "high_total_goals_environment") return "Lean Over";
  if (k === "low_total_goals_environment") return "Lean Under";
  if (k === "btts_tendency_high") return "BTTS Yes";
  if (k === "btts_tendency_low") return "BTTS No";
  if (k === "high_total_corners_environment") return "High corners";
  if (k === "low_total_corners_environment") return "Low corners";
  if (k.startsWith("home_")) return "Home bias";
  if (k.startsWith("away_")) return "Away bias";
  if (k.includes("trending_up") || k.includes("dominance")) return "Team goals up";
  if (k.includes("trending_down")) return "Team goals down";
  return "Stats";
}

function deriveConfidence(
  _type: InsightType,
  _ctx: RealContext | ReturnType<typeof buildStubContext>
): SignalConfidence {
  return "Medium";
}

/** Derive H2H summary from DB fixture rows. */
function deriveH2HSummary(
  h2hFixtures: DbFixture[],
  homeTeamId: number,
  awayTeamId: number,
  homeTeamName: string,
  awayTeamName: string
): H2HSummary | null {
  if (h2hFixtures.length === 0) return null;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let lastWinner: string | undefined;
  let totalGoals = 0;
  let bttsCount = 0;
  const meetingRows: H2HMatchRow[] = [];
  for (const f of h2hFixtures) {
    const gh = f.homeGoals ?? 0;
    const ga = f.awayGoals ?? 0;
    totalGoals += gh + ga;
    if (gh > 0 && ga > 0) bttsCount++;
    meetingRows.push({
      date: f.date,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      homeGoals: gh,
      awayGoals: ga,
      venue: f.venueName ?? undefined,
    });
    // Determine winner relative to the current match's home/away
    const isHomeFirst = f.homeTeamId === homeTeamId && f.awayTeamId === awayTeamId;
    const hGoals = isHomeFirst ? gh : ga;
    const aGoals = isHomeFirst ? ga : gh;
    if (hGoals > aGoals) {
      homeWins++;
      lastWinner = homeTeamName;
    } else if (hGoals < aGoals) {
      awayWins++;
      lastWinner = awayTeamName;
    } else {
      draws++;
    }
  }
  const avgGoals = totalGoals / h2hFixtures.length;
  const bttsRate = bttsCount / h2hFixtures.length;
  return { homeWins, draws, awayWins, lastWinner, avgGoals, bttsRate, meetingsCount: h2hFixtures.length, meetingRows };
}

function buildHighlightsFromDb(
  fixtureId: number,
  home: string,
  away: string,
  fixtureDate: string | undefined,
  poolKeys: string[],
  leagueId?: number,
): FeedInsight[] {
  const types = selectThreeForMatch(poolKeys, fixtureId);
  const matchStats = getMatchStats(home, away, fixtureDate, {
    venue: "all",
    leagueId: leagueId,
  });
  const highlights: FeedInsight[] = [];
  let index = 0;

  for (const type of types) {
    let ctx: RealContext | ReturnType<typeof buildStubContext>;
    if (matchStats) {
      const realCtx = buildRealContext(matchStats, type, home, away);
      if (!realCtx) continue;
      ctx = realCtx;
    } else {
      ctx = buildStubContext(home, away, fixtureId, type.key);
    }

    const filled = fillInsightTemplate(type, ctx);
    highlights.push({
      id: `ins-${fixtureId}-${type.key}-${index}`,
      family: type.family,
      headline: filled.headline,
      supportLabel: filled.supportLabel,
      supportValue: filled.supportValue,
      period: type.period,
      market: marketLabel(type.marketKey),
      direction: deriveDirection(type, ctx),
      confidence: deriveConfidence(type, ctx),
      venueContext: getVenueContextForInsightKey(type.key),
    });
    index += 1;
  }

  return highlights;
}

/** Exactly one primary, at most one secondary (hard cap 2). */
function derivePrimaryAngle(highlights: FeedInsight[]): {
  primaryAngle?: string;
  secondaryAngle?: string;
  volatility?: "Low" | "Medium" | "High";
  primaryDirection?: string;
  primaryMarket?: string;
  secondaryDirection?: string;
  secondaryMarket?: string;
} {
  if (highlights.length === 0) return {};
  const strong = highlights.filter((h) => h.confidence === "Strong");
  const medium = highlights.filter((h) => h.confidence === "Medium");
  const ordered = [...strong, ...medium, ...highlights.filter((h) => h.confidence === "Soft")];
  const primary = ordered[0];
  const secondary = ordered[1];
  const primaryAngle = primary
    ? primary.direction !== "Stats"
      ? `${primary.direction} (${primary.market})`
      : primary.headline.slice(0, 50)
    : undefined;
  const secondaryAngle =
    secondary && secondary !== primary
      ? secondary.direction !== "Stats"
        ? `${secondary.direction} (${secondary.market})`
        : undefined
      : undefined;
  return {
    primaryAngle: primaryAngle ?? undefined,
    secondaryAngle: secondaryAngle ?? undefined,
    volatility: "Low",
    primaryDirection: primary?.direction,
    primaryMarket: primary?.market,
    secondaryDirection: secondary?.direction,
    secondaryMarket: secondary?.market,
  };
}

function teamCodeFallback(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .map((p) => (p[0] ?? "").toUpperCase())
      .join("")
      .slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase() || name;
}

function toFeedLineup(lineup: PredictedLineup): FeedPredictedLineup {
  return {
    starters: lineup.starters.map((s) => ({
      playerId: s.playerId,
      name: s.name,
      position: s.position,
      startRate: s.startRate,
      confidence: s.confidence,
    })),
    teamMatchesPlayed: lineup.teamMatchesPlayed,
  };
}

function toFeedPlayerSim(sim: { home: PlayerSimResult[]; away: PlayerSimResult[] }): FeedPlayerSim {
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
  return {
    home: sim.home.map(convert),
    away: sim.away.map(convert),
  };
}

async function buildFeedMatchFromDb(
  f: DbFixture,
  teamIdToCode: Map<number, string>,
  teamIdToLogo: Map<number, string>,
  h2hSummary?: H2HSummary | null,
  marketProbs?: MarketProbabilities | null,
  formMap?: Map<number, FormResult[]>,
  injuredMap?: Map<number, Set<number>>,
  recentLineupsMap?: Map<number, RecentStarterRow[]>,
): Promise<FeedMatch> {
  const fixtureDate = f.date;
  const home = f.homeTeamName;
  const away = f.awayTeamName;
  const homeId = f.homeTeamId;
  const awayId = f.awayTeamId;
  const leagueId = f.leagueId;
  const competition = getCompetitionByLeagueId(leagueId);
  const leagueName = competition?.label;
  // Form from DB (no JSON fallback — DB is the single source of truth)
  const homeForm = formMap?.get(homeId) ?? [];
  const awayForm = formMap?.get(awayId) ?? [];

  const homeCode = teamIdToCode.get(homeId) ?? teamCodeFallback(home);
  const awayCode = teamIdToCode.get(awayId) ?? teamCodeFallback(away);

  const marketRows = getFeedMarketRows(home, away, fixtureDate, { leagueId: leagueId });

  const homeL5 = getTeamStats(home, fixtureDate, { venue: "home", leagueId: leagueId });
  const awayL5 = getTeamStats(away, fixtureDate, { venue: "away", leagueId: leagueId });

  const match: FeedMatch = {
    id: `match-${f.id}`,
    providerFixtureId: f.id,
    homeTeamName: home,
    awayTeamName: away,
    leagueId,
    leagueName,
    round: f.round ?? undefined,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeTeamLogo: teamIdToLogo.get(homeId) ?? "",
    awayTeamLogo: teamIdToLogo.get(awayId) ?? "",
    kickoffUtc: f.kickoffUtc,
    venueName: f.venueName ?? "Venue TBD",
    status: f.status,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    marketRows,
    homeAvgGoalsFor: homeL5?.l5.matchCount ? homeL5.l5.goalsFor : undefined,
    homeAvgGoalsAgainst: homeL5?.l5.matchCount ? homeL5.l5.goalsAgainst : undefined,
    awayAvgGoalsFor: awayL5?.l5.matchCount ? awayL5.l5.goalsFor : undefined,
    awayAvgGoalsAgainst: awayL5?.l5.matchCount ? awayL5.l5.goalsAgainst : undefined,
    highlights: [],
    homeForm: homeForm.length > 0 ? homeForm : undefined,
    awayForm: awayForm.length > 0 ? awayForm : undefined,
    h2hSummary: h2hSummary ?? undefined,
  };

  // Compute model probabilities for feed (on-demand, cached)
  const modelProbs = getFeedMatchModelProbs(match, marketProbs);
  if (modelProbs) {
    match.modelProbs = modelProbs;
  }

  // Populate edge summary
  if (match.modelProbs?.edges) {
    const { computeMatchEdges } = await import("@/lib/edge-engine");
    const edges = computeMatchEdges(match);
    if (edges) {
      match.edgeSummary = {
        bestMarket: edges.bestMarket,
        bestEdge: edges.bestEdge,
        tier: edges.bestTier,
      };
    }
  }

  // Evaluate signal tags and generate narrative
  const { evaluateSignals } = await import("@/lib/signals/evaluate");
  const { generateNarrative } = await import("@/lib/narrative");
  match.signalTags = evaluateSignals(match);
  match.narrative = generateNarrative(match);

  // Predicted lineups + player-level sim (upcoming matches only)
  const isUpcoming = match.homeGoals == null && match.awayGoals == null;
  if (isUpcoming) {
    const homeInjured = injuredMap?.get(homeId);
    const awayInjured = injuredMap?.get(awayId);
    const homeRecentLineups = recentLineupsMap?.get(homeId);
    const awayRecentLineups = recentLineupsMap?.get(awayId);
    // Prefer DB-backed recency-weighted lineups; fall back to season stats
    const homeLineup = (homeRecentLineups && homeRecentLineups.length > 0
      ? predictLineupFromDb(home, homeRecentLineups, homeInjured)
      : null) ?? predictLineup(home, leagueId, fixtureDate, homeInjured);
    const awayLineup = (awayRecentLineups && awayRecentLineups.length > 0
      ? predictLineupFromDb(away, awayRecentLineups, awayInjured)
      : null) ?? predictLineup(away, leagueId, fixtureDate, awayInjured);
    if (homeLineup) match.predictedHomeLineup = toFeedLineup(homeLineup);
    if (awayLineup) match.predictedAwayLineup = toFeedLineup(awayLineup);
    if (homeLineup && awayLineup && modelProbs?.expectedHomeGoals != null && modelProbs?.expectedAwayGoals != null) {
      const playerSim = getMatchPlayerSim(
        homeLineup,
        awayLineup,
        modelProbs.expectedHomeGoals,
        modelProbs.expectedAwayGoals,
        fixtureDate,
        leagueId
      );
      match.playerSim = toFeedPlayerSim(playerSim);
    }
  }

  return match;
}

/**
 * Build full feed matches from DB.
 * All data comes from Turso — zero external API calls.
 */
export async function getFeedMatches(
  from?: string,
  to?: string,
  leagueIds?: number[],
): Promise<FeedMatch[]> {
  const ids =
    leagueIds && leagueIds.length > 0
      ? leagueIds
      : [DEFAULT_LEAGUE_ID];

  const date = from ?? new Date().toISOString().slice(0, 10);
  const effectiveTo = to ?? date;

  // 1. Fetch fixtures from DB
  const fixtures = await getFixturesByDateRange(date, effectiveTo, ids);
  if (fixtures.length === 0) return [];

  // 2. Collect all team IDs for code/logo lookup
  const allTeamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
  const fixtureIds = fixtures.map((f) => f.id);

  // 3. Collect unique team pairs for H2H
  const pairSet = new Set<string>();
  const pairs: { homeId: number; awayId: number }[] = [];
  for (const f of fixtures) {
    const key = `${Math.min(f.homeTeamId, f.awayTeamId)}-${Math.max(f.homeTeamId, f.awayTeamId)}`;
    if (!pairSet.has(key)) {
      pairSet.add(key);
      pairs.push({ homeId: f.homeTeamId, awayId: f.awayTeamId });
    }
  }

  // 4. Parallel DB queries + preloads (no external API calls)
  const allTeamNames = new Set<string>();
  const allDates = new Set<string>();
  for (const f of fixtures) {
    allTeamNames.add(f.homeTeamName);
    allTeamNames.add(f.awayTeamName);
    allDates.add(f.date);
  }

  const [teamCodeMap, teamLogoMap, oddsMap, h2hMap, formMap, injuredMap, recentLineupsMap] = await Promise.all([
    getTeamCodeMap(allTeamIds),
    getTeamLogoMap(allTeamIds),
    getOddsForFixtures(fixtureIds),
    getH2HForPairs(pairs),
    getTeamFormBatch(allTeamIds, date, 5),
    getInjuredPlayersByTeam(allTeamIds),
    getRecentLineupsBatch(allTeamIds, date, 10),
    // Side-effect preloads (return value not used)
    preloadTeamStats([...allTeamNames]),
    preloadLeagueAverages(ids),
    preloadSimulations([...allDates]),
  ]) as [
    Map<number, string>,
    Map<number, string>,
    Map<number, MarketProbabilities>,
    Map<string, DbFixture[]>,
    Map<number, FormResult[]>,
    Map<number, Set<number>>,
    Map<number, RecentStarterRow[]>,
    ...unknown[],
  ];

  // 5. Build feed matches (pure computation — no I/O)
  const allMatches = await Promise.all(
    fixtures.map((f) => {
      const h2hKey = `${Math.min(f.homeTeamId, f.awayTeamId)}-${Math.max(f.homeTeamId, f.awayTeamId)}`;
      const h2hFixtures = h2hMap.get(h2hKey) ?? [];
      const h2hSummary = deriveH2HSummary(h2hFixtures, f.homeTeamId, f.awayTeamId, f.homeTeamName, f.awayTeamName);
      const odds = oddsMap.get(f.id) ?? null;
      return buildFeedMatchFromDb(f, teamCodeMap, teamLogoMap, h2hSummary, odds, formMap, injuredMap, recentLineupsMap);
    }),
  );

  allMatches.sort((a, b) => feedMatchScore(b.marketRows) - feedMatchScore(a.marketRows));
  return allMatches;
}

export async function getMatchDetail(fixtureId: string): Promise<MatchDetail | null> {
  const id = Number(fixtureId);
  if (Number.isNaN(id)) return null;

  const f = await getFixtureById(id);
  if (!f) return null;

  const leagueId = f.leagueId;
  const fixtureDate = f.date;
  const home = f.homeTeamName;
  const away = f.awayTeamName;
  const homeId = f.homeTeamId;
  const awayId = f.awayTeamId;

  // Parallel: team codes/logos, H2H, preloads
  const allTeamIds = [homeId, awayId];
  const [teamCodeMap, teamLogoMap, formMap] = await Promise.all([
    getTeamCodeMap(allTeamIds),
    getTeamLogoMap(allTeamIds),
    getTeamFormBatch(allTeamIds, fixtureDate, 10),
    preloadTeamStats([home, away]),
    preloadLeagueAverages([leagueId]),
    preloadSimulations(fixtureDate ? [fixtureDate] : []),
    preloadPlayers(),
  ]) as [Map<number, string>, Map<number, string>, Map<number, FormResult[]>, ...unknown[]];

  const homeCode = teamCodeMap.get(homeId) ?? teamCodeFallback(home);
  const awayCode = teamCodeMap.get(awayId) ?? teamCodeFallback(away);
  const competition = getCompetitionByLeagueId(leagueId);
  const leagueName = competition?.label;
  const homeForm = formMap.get(homeId) ?? [];
  const awayForm = formMap.get(awayId) ?? [];

  // H2H from DB
  let h2hSummary: H2HSummary | undefined;
  const h2hFixtures = await getH2HFixtures(homeId, awayId);
  const summary = deriveH2HSummary(h2hFixtures, homeId, awayId, home, away);
  if (summary) h2hSummary = summary;

  const highlights = buildHighlightsFromDb(f.id, home, away, fixtureDate, DETAIL_INSIGHT_KEYS, leagueId);
  const insightsByFamily: Record<string, MatchDetailInsight[]> = {};
  for (const h of highlights) {
    if (!insightsByFamily[h.family]) insightsByFamily[h.family] = [];
    insightsByFamily[h.family].push(toDetailInsight(h));
  }

  const rollingStats = getMatchStats(home, away, fixtureDate, { venue: "all", leagueId: leagueId });
  const supportingStatements = getWhatStandsOut(rollingStats, "L10");
  const derived = derivePrimaryAngle(highlights);
  const hasSupport = supportingStatements.length >= 1;
  const primaryAngle = hasSupport ? (derived.primaryAngle ?? undefined) : undefined;
  const secondaryAngle = hasSupport ? (derived.secondaryAngle ?? undefined) : undefined;
  const volatility = hasSupport ? derived.volatility : undefined;
  const angleStatements = supportingStatements.slice(0, 3);

  return {
    id: `match-${f.id}`,
    providerFixtureId: f.id,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeTeamName: home,
    awayTeamName: away,
    leagueId,
    leagueName,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeTeamLogo: teamLogoMap.get(homeId) ?? "",
    awayTeamLogo: teamLogoMap.get(awayId) ?? "",
    kickoffUtc: f.kickoffUtc,
    venueName: f.venueName ?? "Venue TBD",
    status: f.status,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    insightsByFamily,
    primaryAngle,
    secondaryAngle,
    volatility,
    supportingStatements: primaryAngle ? angleStatements : undefined,
    homeForm: homeForm.length > 0 ? homeForm : undefined,
    awayForm: awayForm.length > 0 ? awayForm : undefined,
    referee: f.referee ?? undefined,
    h2hSummary,
  };
}

function toDetailInsight(ins: FeedInsight): MatchDetailInsight {
  const support =
    ins.supportLabel && ins.supportValue
      ? ` (${ins.supportLabel}: ${ins.supportValue})`
      : "";
  return {
    ...ins,
    narrative: `${ins.headline}${support}.`,
    totalScore: 72,
  };
}
