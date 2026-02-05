/**
 * Build feed and match detail from provider response.
 * Uses api-football when API_FOOTBALL_KEY is set; otherwise mock.
 * Insights use real L5/L10 data from ingested fixtures when available; otherwise stub.
 */
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
import type { H2HSummary } from "./feed";
import type { FootballProvider } from "@/lib/providers/types";
import { SUPPORTED_LEAGUES, DEFAULT_LEAGUE_ID } from "@/lib/leagues";

const DEFAULT_SEASON = 2025;

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
  if (fixtures.length === 0) return null;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let lastWinner: string | undefined;
  for (const f of fixtures.slice(0, 5)) {
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
): FeedInsight[] {
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const fixtureId = item.fixture.id;
  const fixtureDate = item.fixture.date?.slice(0, 10);
  const types = selectThreeForMatch(poolKeys, fixtureId);

  const matchStats = getMatchStats(home, away, fixtureDate);
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

function derivePrimaryAngle(highlights: FeedInsight[]): {
  primaryAngle?: string;
  secondaryAngle?: string;
  volatility?: "Low" | "Medium" | "High";
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
  const secondaryAngle = secondary
    ? secondary.direction !== "Stats"
      ? `${secondary.direction} (${secondary.market})`
      : undefined
    : undefined;
  return {
    primaryAngle: primaryAngle ?? undefined,
    secondaryAngle: secondaryAngle ?? undefined,
    volatility: "Low",
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

async function buildFeedMatch(
  item: ApiFootballFixtureResponseItem,
  provider: FootballProvider,
  teamIdToCode: Map<number, string>,
): Promise<FeedMatch> {
  const fixtureDate = item.fixture.date?.slice(0, 10);
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const homeId = item.teams.home.id;
  const awayId = item.teams.away.id;
  const leagueId = item.league?.id;

  const h2hRes = await provider.getH2HFixtures(homeId, awayId, {
    last: 5,
    league: typeof leagueId === "number" ? leagueId : undefined,
  });

  const homeForm = getTeamRecentResults(home, 10, fixtureDate);
  const awayForm = getTeamRecentResults(away, 10, fixtureDate);
  const h2hSummary = deriveH2HSummary(h2hRes, homeId, awayId, home, away);

  const homeCode = teamIdToCode.get(homeId) ?? teamCodeFallback(home);
  const awayCode = teamIdToCode.get(awayId) ?? teamCodeFallback(away);

  const highlights = buildHighlights(item, FEED_INSIGHT_KEYS);
  const { primaryAngle, secondaryAngle, volatility } = derivePrimaryAngle(highlights);

  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamName: home,
    awayTeamName: away,
    homeTeamCode: homeCode,
    awayTeamCode: awayCode,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    highlights,
    primaryAngle,
    secondaryAngle,
    volatility,
    homeForm: homeForm.length > 0 ? homeForm : undefined,
    awayForm: awayForm.length > 0 ? awayForm : undefined,
    h2hSummary: h2hSummary ?? undefined,
  };
}

export async function getFeedMatches(
  from?: string,
  to?: string,
  leagueIds?: number[],
): Promise<FeedMatch[]> {
  const { provider } = resolveProvider("api-football");
  const ids =
    leagueIds && leagueIds.length > 0
      ? leagueIds
      : [DEFAULT_LEAGUE_ID];

  const seasonByLeague = new Map(SUPPORTED_LEAGUES.map((l) => [l.id, l.season]));

  const fixturesResponses = await Promise.all(
    ids.map((leagueId) =>
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
    ids.map(async (leagueId) => {
      const res = await provider.getTeams(leagueId, seasonByLeague.get(leagueId) ?? DEFAULT_SEASON);
      for (const { team } of res.response ?? []) {
        if (team.code) teamIdToCode.set(team.id, team.code);
      }
    }),
  );

  const matches = await Promise.all(list.map((item) => buildFeedMatch(item, provider, teamIdToCode)));
  return matches;
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
  const homeForm = getTeamRecentResults(home, 10, fixtureDate);
  const awayForm = getTeamRecentResults(away, 10, fixtureDate);

  const highlights = buildHighlights(item, DETAIL_INSIGHT_KEYS);
  const insightsByFamily: Record<string, MatchDetailInsight[]> = {};
  for (const h of highlights) {
    if (!insightsByFamily[h.family]) insightsByFamily[h.family] = [];
    insightsByFamily[h.family].push(toDetailInsight(h));
  }

  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeTeamName: home,
    awayTeamName: away,
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
