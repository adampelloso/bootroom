import type {
  ApiFootballFixtureResponseItem,
  ApiFootballFixturesResponse,
} from "@/lib/api-football-types";
import type { ProviderKey } from "@/lib/providers/types";
import type { NormalizedFixture } from "./types";

export function normalizeFixtures(
  response: ApiFootballFixturesResponse,
  providerKey: ProviderKey,
): NormalizedFixture[] {
  return response.response.map((item) => normalizeFixture(item, providerKey));
}

export function normalizeFixture(
  item: ApiFootballFixtureResponseItem,
  providerKey: ProviderKey,
): NormalizedFixture {
  return {
    providerKey,
    providerFixtureId: item.fixture.id,
    leagueId: item.league.id,
    season: item.league.season,
    round: item.league.round ?? null,
    kickoffUtc: item.fixture.date,
    status: {
      short: item.fixture.status.short,
      long: item.fixture.status.long ?? null,
      elapsed: item.fixture.status.elapsed ?? null,
    },
    venue: item.fixture.venue
      ? {
          id: item.fixture.venue.id ?? null,
          name: item.fixture.venue.name ?? null,
          city: item.fixture.venue.city ?? null,
        }
      : null,
    homeTeam: {
      id: item.teams.home.id,
      name: item.teams.home.name,
      logo: item.teams.home.logo ?? null,
    },
    awayTeam: {
      id: item.teams.away.id,
      name: item.teams.away.name,
      logo: item.teams.away.logo ?? null,
    },
    goals: {
      home: item.goals.home ?? null,
      away: item.goals.away ?? null,
    },
  };
}
