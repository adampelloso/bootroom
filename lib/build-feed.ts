/**
 * Build feed and match detail from provider response.
 * Uses api-football when API_FOOTBALL_KEY is set; otherwise mock.
 * Insights use real L5/L10 data from ingested fixtures when available; otherwise stub.
 */
import type { ApiFootballFixtureResponseItem } from "@/lib/api-football-types";
import type { FeedMatch, FeedInsight, MatchDetail, MatchDetailInsight } from "./feed";
import { resolveProvider } from "@/lib/providers/registry";
import { selectThreeForMatch } from "@/lib/insights/select";
import { DETAIL_INSIGHT_KEYS, FEED_INSIGHT_KEYS } from "@/lib/insights/catalog";
import { buildStubContext } from "@/lib/insights/stub-context";
import { buildRealContext } from "@/lib/insights/real-context";
import { fillInsightTemplate } from "@/lib/insights/fill-template";
import { getMatchStats, getTeamRecentResults } from "@/lib/insights/team-stats";
import type { H2HSummary } from "./feed";
import type { FootballProvider } from "@/lib/providers/types";
import { SUPPORTED_LEAGUES, DEFAULT_LEAGUE_ID } from "@/lib/leagues";

const DEFAULT_SEASON = 2025;

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
    let ctx;
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
    });
    index += 1;
  }

  return highlights;
}

async function buildFeedMatch(
  item: ApiFootballFixtureResponseItem,
  provider: FootballProvider,
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

  const homeForm = getTeamRecentResults(home, 5, fixtureDate);
  const awayForm = getTeamRecentResults(away, 5, fixtureDate);
  const h2hSummary = deriveH2HSummary(h2hRes, homeId, awayId, home, away);

  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamName: home,
    awayTeamName: away,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    highlights: buildHighlights(item, FEED_INSIGHT_KEYS),
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

  const matches = await Promise.all(list.map((item) => buildFeedMatch(item, provider)));
  return matches;
}

export async function getMatchDetail(fixtureId: string): Promise<MatchDetail | null> {
  const id = Number(fixtureId);
  if (Number.isNaN(id)) return null;
  const { provider } = resolveProvider("api-football");
  const res = await provider.getFixture(id);
  const item = res.response?.[0];
  if (!item) return null;

  const highlights = buildHighlights(item, DETAIL_INSIGHT_KEYS);
  const insightsByFamily: Record<string, MatchDetailInsight[]> = {};
  for (const h of highlights) {
    if (!insightsByFamily[h.family]) insightsByFamily[h.family] = [];
    insightsByFamily[h.family].push(toDetailInsight(h));
  }

  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamId: item.teams.home.id,
    awayTeamId: item.teams.away.id,
    homeTeamName: item.teams.home.name,
    awayTeamName: item.teams.away.name,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    insightsByFamily,
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
