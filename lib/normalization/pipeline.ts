import type { FootballProvider, ProviderKey } from "@/lib/providers/types";
import type {
  NormalizedFixture,
  NormalizedFixturePlayer,
  NormalizedFixtureStats,
  NormalizedOddsSnapshot,
  NormalizedSnapshot,
} from "./types";
import { normalizeFixtures } from "./fixtures";
import { normalizeFixtureStats } from "./stats";
import { normalizeFixturePlayers } from "./players";
import { normalizeOddsSnapshot } from "./odds";

export interface IngestionPlan {
  leagueId: number;
  season: number;
  fixtureIds?: number[];
}

export interface FixtureBundle {
  fixture: NormalizedFixture;
  stats: NormalizedFixtureStats[];
  players: NormalizedFixturePlayer[];
  odds: NormalizedOddsSnapshot;
}

export async function buildNormalizationSnapshot(
  provider: FootballProvider,
  providerKey: ProviderKey,
  plan: IngestionPlan,
): Promise<NormalizedSnapshot> {
  const fixturesResponse = await provider.getFixtures(plan.leagueId, plan.season);
  const fixtures = normalizeFixtures(fixturesResponse, providerKey);
  const fixtureIds = plan.fixtureIds ?? fixtures.map((fixture) => fixture.providerFixtureId);

  const fixtureStats: NormalizedFixtureStats[] = [];
  const fixturePlayers: NormalizedFixturePlayer[] = [];
  const odds: NormalizedOddsSnapshot[] = [];

  for (const fixtureId of fixtureIds) {
    const [statsResponse, playersResponse, oddsResponse] = await Promise.all([
      provider.getFixtureStats(fixtureId),
      provider.getFixturePlayers(fixtureId),
      provider.getOdds(fixtureId),
    ]);

    fixtureStats.push(...normalizeFixtureStats(statsResponse, fixtureId));
    fixturePlayers.push(...normalizeFixturePlayers(playersResponse, fixtureId));
    odds.push(normalizeOddsSnapshot(oddsResponse, fixtureId));
  }

  return {
    providerKey,
    generatedAtUtc: new Date().toISOString(),
    fixtures,
    fixtureStats,
    fixturePlayers,
    odds,
  };
}

export async function fetchFixtureBundle(
  provider: FootballProvider,
  providerKey: ProviderKey,
  fixtureId: number,
): Promise<FixtureBundle | null> {
  const fixtureResponse = await provider.getFixture(fixtureId);
  const fixtureItem = fixtureResponse.response?.[0];
  if (!fixtureItem) return null;

  const [statsResponse, playersResponse, oddsResponse] = await Promise.all([
    provider.getFixtureStats(fixtureId),
    provider.getFixturePlayers(fixtureId),
    provider.getOdds(fixtureId),
  ]);

  return {
    fixture: normalizeFixtures({ ...fixtureResponse, response: [fixtureItem] }, providerKey)[0],
    stats: normalizeFixtureStats(statsResponse, fixtureId),
    players: normalizeFixturePlayers(playersResponse, fixtureId),
    odds: normalizeOddsSnapshot(oddsResponse, fixtureId),
  };
}
