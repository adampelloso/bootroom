/**
 * Build feed and match detail from provider response.
 * Uses api-football when API_FOOTBALL_KEY is set; otherwise mock.
 * Insights use real L5/L10 data from ingested fixtures when available; otherwise stub.
 */
import fs from "fs";
import path from "path";
import type { ApiFootballFixtureResponseItem } from "@/lib/api-football-types";
import type { FeedMatch, FeedInsight, MatchDetail, MatchDetailInsight } from "./feed";
import { resolveProvider } from "@/lib/providers/registry";
import { selectThreeForMatch } from "@/lib/insights/select";
import {
  DETAIL_INSIGHT_KEYS,
  FEED_INSIGHT_KEYS,
  getVenueContextForInsightKey,
} from "@/lib/insights/catalog";
import type { InsightType } from "@/lib/insights/catalog";
import type { RealContext } from "@/lib/insights/real-context";
import type { SignalConfidence, SignalDirection } from "./feed";
import { buildStubContext } from "@/lib/insights/stub-context";
import { buildRealContext } from "@/lib/insights/real-context";
import { fillInsightTemplate } from "@/lib/insights/fill-template";
import { getMatchStats, getTeamRecentResults } from "@/lib/insights/team-stats";
import { getTeamStats } from "@/lib/insights/team-stats";
import { getFeedMarketRows, feedMatchScore } from "@/lib/insights/feed-market-stats";
import { getWhatStandsOut } from "@/lib/insights/what-stands-out";
import { getFeedMatchModelProbs } from "@/lib/modeling/feed-model-probs";
import type { H2HSummary } from "./feed";
import type { FootballProvider } from "@/lib/providers/types";
import {
  SUPPORTED_LEAGUES,
  SUPPORTED_COMPETITIONS,
  DEFAULT_LEAGUE_ID,
  getCompetitionByLeagueId,
  isCup,
} from "@/lib/leagues";
import { predictLineup } from "@/lib/modeling/predicted-lineup";
import { getMatchPlayerSim } from "@/lib/modeling/player-sim";
import type { FeedPredictedLineup, FeedPlayerSim, FeedPlayerSimEntry } from "./feed";
import type { PredictedLineup } from "@/lib/modeling/predicted-lineup";
import type { PlayerSimResult } from "@/lib/modeling/player-sim";

const DEFAULT_SEASON = 2025;

/* ── Feed cache: in-memory (L1) + disk (L2) ──────────────────────── */
// L1: module-level Map — shared across all requests in the same server
//     process. In serverless, this survives across warm invocations.
// L2: disk files in data/feed-cache/ — survives server restarts in dev.
const memCache = new Map<string, unknown>();
const FEED_CACHE_DIR = path.join(process.cwd(), "data", "feed-cache");

function isPastDate(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr < today;
}

function readCache<T>(key: string): T | null {
  // L1: in-memory
  if (memCache.has(key)) return memCache.get(key) as T;
  // L2: disk
  const fp = path.join(FEED_CACHE_DIR, key);
  if (!fs.existsSync(fp)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
    memCache.set(key, data); // promote to L1
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  // L1
  memCache.set(key, data);
  // L2
  try {
    if (!fs.existsSync(FEED_CACHE_DIR)) {
      fs.mkdirSync(FEED_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(FEED_CACHE_DIR, key), JSON.stringify(data));
  } catch {
    // Disk write may fail in read-only serverless envs — L1 still works
  }
}

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

function deriveH2HSummary(
  h2hResponse: { response?: unknown[] },
  homeTeamId: number,
  awayTeamId: number,
  homeTeamName: string,
  awayTeamName: string
): H2HSummary | null {
  const fixtures = (h2hResponse.response ?? []) as Array<{
    teams: { home: { id: number }; away: { id: number } };
    goals: { home: number | null; away: number | null };
  }>;
  if (fixtures.length === 0) return { homeWins: 0, draws: 0, awayWins: 0 };
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let lastWinner: string | undefined;
  for (const f of fixtures) {
    const gh = f.goals?.home ?? 0;
    const ga = f.goals?.away ?? 0;
    const isHomeFirst = f.teams.home.id === homeTeamId && f.teams.away.id === awayTeamId;
    const homeGoals = isHomeFirst ? gh : ga;
    const awayGoals = isHomeFirst ? ga : gh;
    if (homeGoals > awayGoals) {
      homeWins++;
      lastWinner = homeTeamName;
    } else if (homeGoals < awayGoals) {
      awayWins++;
      lastWinner = awayTeamName;
    } else {
      draws++;
    }
  }
  return { homeWins, draws, awayWins, lastWinner };
}

function buildHighlights(
  item: ApiFootballFixtureResponseItem,
  poolKeys: string[],
  formLeagueId?: number,
): FeedInsight[] {
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const fixtureId = item.fixture.id;
  const fixtureDate = item.fixture.date?.slice(0, 10);
  const types = selectThreeForMatch(poolKeys, fixtureId);

  const matchStats = getMatchStats(home, away, fixtureDate, {
    venue: "all",
    leagueId: formLeagueId,
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

/** Goals family: O/U, Team Goals, BTTS. */
const GOALS_MARKETS = new Set(["O/U", "Team Goals", "BTTS", "1H Goals", "2H Goals"]);
const CONTRADICT_PAIRS: [string, string][] = [
  ["Lean Over", "Lean Under"],
  ["BTTS Yes", "BTTS No"],
  ["High corners", "Low corners"],
  ["Team goals up", "Team goals down"],
];
function contradictsAngle(direction: string, angleDirection: string): boolean {
  for (const [a, b] of CONTRADICT_PAIRS) {
    if ((direction === a && angleDirection === b) || (direction === b && angleDirection === a))
      return true;
  }
  return false;
}

function supportsAngle(
  h: FeedInsight,
  angleDirection?: string,
  angleMarket?: string
): boolean {
  if (!angleDirection || angleDirection === "Stats") return false;
  if (h.direction === "Stats") return false;
  const sameMarket = angleMarket && h.market === angleMarket;
  const sameFamily =
    angleMarket &&
    GOALS_MARKETS.has(angleMarket) &&
    GOALS_MARKETS.has(h.market);
  const cornersFamily = (angleMarket === "Corners" || angleMarket === "Team Corners") && (h.market === "Corners" || h.market === "Team Corners");
  const shotsFamily = (angleMarket === "Shots" || angleMarket === "SOT") && (h.market === "Shots" || h.market === "SOT");
  if (sameMarket || sameFamily || cornersFamily || shotsFamily) {
    if (contradictsAngle(h.direction, angleDirection)) return false;
    return true;
  }
  return false;
}

/** Filter to highlights that support primary or secondary angle; cap at 3. Prefer venue-scoped. */
function filterHighlightsToSupport(
  highlights: FeedInsight[],
  primaryDirection?: string,
  primaryMarket?: string,
  secondaryDirection?: string,
  secondaryMarket?: string
): FeedInsight[] {
  const supporting = highlights.filter(
    (h) =>
      supportsAngle(h, primaryDirection, primaryMarket) ||
      supportsAngle(h, secondaryDirection, secondaryMarket)
  );
  const withVenueFirst = [...supporting].sort((a, b) => {
    const aVenue = a.venueContext === "Combined" ? 1 : 0;
    const bVenue = b.venueContext === "Combined" ? 1 : 0;
    return aVenue - bVenue;
  });
  return withVenueFirst.slice(0, 3);
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

async function buildFeedMatch(
  item: ApiFootballFixtureResponseItem,
  provider: FootballProvider,
  teamIdToCode: Map<number, string>,
  h2hSummary?: H2HSummary | null,
): Promise<FeedMatch> {
  const fixtureDate = item.fixture.date?.slice(0, 10);
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const homeId = item.teams.home.id;
  const awayId = item.teams.away.id;
  const leagueId = item.league?.id;
  const competition = leagueId != null ? getCompetitionByLeagueId(leagueId) : undefined;
  const leagueName = competition?.label ?? item.league?.name;
  const useSameCompetitionForm = leagueId != null && isCup(leagueId);
  const formLeagueId = useSameCompetitionForm ? leagueId : undefined;

  const homeForm = getTeamRecentResults(home, 10, fixtureDate, { leagueId: formLeagueId });
  const awayForm = getTeamRecentResults(away, 10, fixtureDate, { leagueId: formLeagueId });

  const homeCode = teamIdToCode.get(homeId) ?? teamCodeFallback(home);
  const awayCode = teamIdToCode.get(awayId) ?? teamCodeFallback(away);

  const marketRows = getFeedMarketRows(home, away, fixtureDate, { leagueId: formLeagueId });

  const homeL5 = getTeamStats(home, fixtureDate, { venue: "home", leagueId: formLeagueId });
  const awayL5 = getTeamStats(away, fixtureDate, { venue: "away", leagueId: formLeagueId });

  const round = item.league?.round;

  const match: FeedMatch = {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamName: home,
    awayTeamName: away,
    leagueId,
    leagueName,
    round: round ?? undefined,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
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
  const modelProbs = getFeedMatchModelProbs(match);
  if (modelProbs) {
    match.modelProbs = modelProbs;
  }

  // Predicted lineups + player-level sim (upcoming matches only)
  const isUpcoming = match.homeGoals == null && match.awayGoals == null;
  if (isUpcoming) {
    const homeLineup = predictLineup(home, leagueId, fixtureDate);
    const awayLineup = predictLineup(away, leagueId, fixtureDate);
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
 * Build full feed matches. Cached per date+league to disk.
 * A match's stats don't change within a day, so fetch once and reuse.
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

  // Check per-league caches, split into cached vs uncached
  const allMatches: FeedMatch[] = [];
  const uncachedIds: number[] = [];

  for (const id of ids) {
    const cached = readCache<FeedMatch[]>(`${date}-league-${id}.json`);
    if (cached) {
      allMatches.push(...cached);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch only uncached leagues
  if (uncachedIds.length > 0) {
    const { provider } = resolveProvider("api-football");
    const seasonByLeague = new Map(SUPPORTED_COMPETITIONS.map((c) => [c.id, c.season]));

    const fixturesResponses = await Promise.all(
      uncachedIds.map((leagueId) =>
        provider.getFixtures(
          leagueId,
          seasonByLeague.get(leagueId) ?? DEFAULT_SEASON,
          from,
          to,
        ),
      ),
    );

    const list = fixturesResponses.flatMap((r) => r.response ?? []);
    list.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

    const teamIdToCode = new Map<number, string>();
    await Promise.all(
      uncachedIds.map(async (leagueId) => {
        const res = await provider.getTeams(leagueId, seasonByLeague.get(leagueId) ?? DEFAULT_SEASON);
        for (const { team } of res.response ?? []) {
          if (team.code) teamIdToCode.set(team.id, team.code);
        }
      }),
    );

    // ── Pre-fetch H2H with caching + concurrency limit ──────────
    // H2H between two clubs doesn't change within a day (only after they
    // play), so we cache per sorted team-pair and skip API calls on hits.
    const h2hMap = new Map<string, H2HSummary | null>();

    // Collect unique team pairs
    const pairsToFetch: { key: string; homeId: number; awayId: number; homeName: string; awayName: string }[] = [];
    for (const item of list) {
      const hId = item.teams.home.id;
      const aId = item.teams.away.id;
      const cacheKey = `h2h-${Math.min(hId, aId)}-${Math.max(hId, aId)}.json`;
      if (h2hMap.has(cacheKey)) continue; // already queued or resolved
      const cached = readCache<H2HSummary | null>(cacheKey);
      if (cached !== null) {
        h2hMap.set(cacheKey, cached);
      } else {
        h2hMap.set(cacheKey, null); // mark as queued
        pairsToFetch.push({ key: cacheKey, homeId: hId, awayId: aId, homeName: item.teams.home.name, awayName: item.teams.away.name });
      }
    }

    // Fetch uncached pairs with concurrency limit of 3
    const H2H_CONCURRENCY = 3;
    for (let i = 0; i < pairsToFetch.length; i += H2H_CONCURRENCY) {
      const batch = pairsToFetch.slice(i, i + H2H_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (p) => {
          let h2hRes: { response?: unknown[] } = {};
          try {
            h2hRes = await provider.getH2HFixtures(p.homeId, p.awayId, { last: 20 });
          } catch {
            // H2H fetch failed — continue with empty result
          }
          return { ...p, h2hRes };
        }),
      );
      for (const r of results) {
        const summary = deriveH2HSummary(r.h2hRes, r.homeId, r.awayId, r.homeName, r.awayName);
        h2hMap.set(r.key, summary);
        writeCache(r.key, summary);
      }
    }

    // Build feed matches (H2H already resolved, no more API calls inside)
    const freshMatches = await Promise.all(
      list.map((item) => {
        const hId = item.teams.home.id;
        const aId = item.teams.away.id;
        const cacheKey = `h2h-${Math.min(hId, aId)}-${Math.max(hId, aId)}.json`;
        return buildFeedMatch(item, provider, teamIdToCode, h2hMap.get(cacheKey));
      }),
    );

    // Write per-league caches. For today, only cache leagues that
    // returned matches — empty results may mean "not published yet".
    // Past dates cache everything (including empty) permanently.
    const past = isPastDate(date);
    for (const id of uncachedIds) {
      const leagueMatches = freshMatches.filter((m) => m.leagueId === id);
      if (leagueMatches.length > 0 || past) {
        writeCache(`${date}-league-${id}.json`, leagueMatches);
      }
    }

    allMatches.push(...freshMatches);
  }

  allMatches.sort((a, b) => feedMatchScore(b.marketRows) - feedMatchScore(a.marketRows));
  return allMatches;
}

export async function getMatchDetail(fixtureId: string): Promise<MatchDetail | null> {
  const id = Number(fixtureId);
  if (Number.isNaN(id)) return null;
  const { provider } = resolveProvider("api-football");
  const res = await provider.getFixture(id);
  const item = res.response?.[0];
  if (!item) return null;

  const leagueId = item.league?.id;
  const season = item.league?.season ?? DEFAULT_SEASON;
  const fixtureDate = item.fixture.date?.slice(0, 10);
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const homeId = item.teams.home.id;
  const awayId = item.teams.away.id;

  let teamIdToCode = new Map<number, string>();
  if (leagueId) {
    const teamsRes = await provider.getTeams(leagueId, season);
    for (const { team } of teamsRes.response ?? []) {
      if (team.code) teamIdToCode.set(team.id, team.code);
    }
  }

  const homeCode = teamIdToCode.get(homeId) ?? teamCodeFallback(home);
  const awayCode = teamIdToCode.get(awayId) ?? teamCodeFallback(away);
  const competition = leagueId != null ? getCompetitionByLeagueId(leagueId) : undefined;
  const leagueName = competition?.label ?? item.league?.name;
  const useSameCompetitionForm = leagueId != null && isCup(leagueId);
  const formLeagueId = useSameCompetitionForm ? leagueId : undefined;

  const homeForm = getTeamRecentResults(home, 10, fixtureDate, { leagueId: formLeagueId });
  const awayForm = getTeamRecentResults(away, 10, fixtureDate, { leagueId: formLeagueId });

  const highlights = buildHighlights(item, DETAIL_INSIGHT_KEYS, formLeagueId);
  const insightsByFamily: Record<string, MatchDetailInsight[]> = {};
  for (const h of highlights) {
    if (!insightsByFamily[h.family]) insightsByFamily[h.family] = [];
    insightsByFamily[h.family].push(toDetailInsight(h));
  }

  const rollingStats = getMatchStats(home, away, fixtureDate, { venue: "all", leagueId: formLeagueId });
  const supportingStatements = getWhatStandsOut(rollingStats, "L10");
  const derived = derivePrimaryAngle(highlights);
  const hasSupport = supportingStatements.length >= 1;
  const primaryAngle = hasSupport ? (derived.primaryAngle ?? undefined) : undefined;
  const secondaryAngle = hasSupport ? (derived.secondaryAngle ?? undefined) : undefined;
  const volatility = hasSupport ? derived.volatility : undefined;
  const angleStatements = supportingStatements.slice(0, 3);

  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeTeamName: home,
    awayTeamName: away,
    leagueId,
    leagueName,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    insightsByFamily,
    primaryAngle,
    secondaryAngle,
    volatility,
    supportingStatements: primaryAngle ? angleStatements : undefined,
    homeForm: homeForm.length > 0 ? homeForm : undefined,
    awayForm: awayForm.length > 0 ? awayForm : undefined,
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
