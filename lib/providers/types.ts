import type {
  ApiFootballFixturesResponse,
  ApiFootballFixtureStatisticsResponse,
  ApiFootballFixturePlayersResponse,
  ApiFootballOddsResponse,
  ApiFootballTeamsResponse,
} from "@/lib/api-football-types";

/**
 * Football provider interface (spec Section 5).
 * All app and normalization code uses this; only the implementation
 * (mock vs API-Football) changes. Responses are in API-Football shape
 * so normalization stays provider-agnostic.
 */
export type ProviderKey = "mock" | "api-football";

export interface ProviderDescriptor {
  key: ProviderKey;
  label: string;
  isMock: boolean;
}

export interface H2HOptions {
  last?: number;
  league?: number;
}

export interface FootballProvider {
  getLeagues(): Promise<{ response: unknown[] }>;
  getSeasons(leagueId: number): Promise<{ response: unknown[] }>;
  getFixtures(
    leagueId: number,
    seasonYear: number,
    from?: string,
    to?: string,
  ): Promise<ApiFootballFixturesResponse>;
  getFixture(fixtureId: number): Promise<ApiFootballFixturesResponse>;
  getFixtureStats(fixtureId: number): Promise<ApiFootballFixtureStatisticsResponse>;
  getFixturePlayers(fixtureId: number): Promise<ApiFootballFixturePlayersResponse>;
  getOdds(fixtureId: number, markets?: string[]): Promise<ApiFootballOddsResponse>;
  getH2HFixtures(
    homeTeamId: number,
    awayTeamId: number,
    options?: H2HOptions,
  ): Promise<ApiFootballFixturesResponse>;
  getTeams(leagueId: number, seasonYear: number): Promise<ApiFootballTeamsResponse>;
}
