/**
 * Build feed and match detail from provider response.
 * Uses mock provider; staging mode assigns 3 random insight types per match with template-filled headlines/support.
 */
import type { ApiFootballFixtureResponseItem } from "@/lib/api-football-types";
import type { FeedMatch, FeedInsight, MatchDetail, MatchDetailInsight } from "./feed";
import { mockFootballProvider } from "@/lib/providers/mock-provider";
import { selectThreeForMatch } from "@/lib/insights/select";
import { DETAIL_INSIGHT_KEYS, FEED_INSIGHT_KEYS } from "@/lib/insights/catalog";
import { buildStubContext } from "@/lib/insights/stub-context";
import { fillInsightTemplate } from "@/lib/insights/fill-template";

const EPL_LEAGUE_ID = 39;
const EPL_SEASON = 2025;

function buildHighlights(
  item: ApiFootballFixtureResponseItem,
  poolKeys: string[],
): FeedInsight[] {
  const home = item.teams.home.name;
  const away = item.teams.away.name;
  const fixtureId = item.fixture.id;
  const types = selectThreeForMatch(poolKeys, fixtureId);

  return types.map((type, index) => {
    const ctx = buildStubContext(home, away, fixtureId, type.key);
    const filled = fillInsightTemplate(type, ctx);
    return {
      id: `ins-${fixtureId}-${type.key}-${index}`,
      family: type.family,
      headline: filled.headline,
      supportLabel: filled.supportLabel,
      supportValue: filled.supportValue,
    };
  });
}

function fixtureToFeedMatch(item: ApiFootballFixtureResponseItem): FeedMatch {
  return {
    id: `match-${item.fixture.id}`,
    providerFixtureId: item.fixture.id,
    homeTeamName: item.teams.home.name,
    awayTeamName: item.teams.away.name,
    homeTeamLogo: item.teams.home.logo,
    awayTeamLogo: item.teams.away.logo,
    kickoffUtc: item.fixture.date,
    venueName: item.fixture.venue?.name ?? "Venue TBD",
    status: item.fixture.status.short,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    highlights: buildHighlights(item, FEED_INSIGHT_KEYS),
  };
}

export async function getFeedMatches(from?: string, to?: string): Promise<FeedMatch[]> {
  const res = await mockFootballProvider.getFixtures(EPL_LEAGUE_ID, EPL_SEASON);
  const list = res.response ?? [];
  const matches = list.map(fixtureToFeedMatch);
  return matches;
}

export async function getMatchDetail(fixtureId: string): Promise<MatchDetail | null> {
  const id = Number(fixtureId);
  if (Number.isNaN(id)) return null;
  const res = await mockFootballProvider.getFixture(id);
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
  return {
    ...ins,
    narrative: `${ins.headline} (${ins.supportLabel}: ${ins.supportValue}).`,
    totalScore: 72,
  };
}
