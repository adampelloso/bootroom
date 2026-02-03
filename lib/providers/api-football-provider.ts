import type {
  ApiFootballFixturesResponse,
  ApiFootballFixtureStatisticsResponse,
  ApiFootballFixturePlayersResponse,
  ApiFootballOddsResponse,
} from "@/lib/api-football-types";
import type { FootballProvider } from "./types";

export interface ApiFootballConfig {
  baseUrl: string;
  host?: string;
  key: string;
}

export function resolveApiFootballConfig(): ApiFootballConfig | null {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;

  return {
    baseUrl: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
    host: process.env.API_FOOTBALL_HOST ?? undefined,
    key,
  };
}

async function fetchJson<T>(config: ApiFootballConfig, path: string): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": config.key,
      ...(config.host ? { "x-rapidapi-host": config.host } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API-Football request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export function buildApiFootballProvider(config: ApiFootballConfig): FootballProvider {
  return {
    async getLeagues() {
      return fetchJson<{ response: unknown[] }>(config, "/leagues");
    },
    async getSeasons(leagueId: number) {
      return fetchJson<{ response: unknown[] }>(config, `/leagues/seasons?league=${leagueId}`);
    },
    async getFixtures(leagueId: number, seasonYear: number): Promise<ApiFootballFixturesResponse> {
      return fetchJson<ApiFootballFixturesResponse>(
        config,
        `/fixtures?league=${leagueId}&season=${seasonYear}`,
      );
    },
    async getFixture(fixtureId: number): Promise<ApiFootballFixturesResponse> {
      return fetchJson<ApiFootballFixturesResponse>(config, `/fixtures?id=${fixtureId}`);
    },
    async getFixtureStats(fixtureId: number): Promise<ApiFootballFixtureStatisticsResponse> {
      return fetchJson<ApiFootballFixtureStatisticsResponse>(
        config,
        `/fixtures/statistics?fixture=${fixtureId}`,
      );
    },
    async getFixturePlayers(fixtureId: number): Promise<ApiFootballFixturePlayersResponse> {
      return fetchJson<ApiFootballFixturePlayersResponse>(
        config,
        `/fixtures/players?fixture=${fixtureId}`,
      );
    },
    async getOdds(fixtureId: number, markets?: string[]): Promise<ApiFootballOddsResponse> {
      const marketParam = markets && markets.length > 0 ? `&markets=${markets.join(",")}` : "";
      return fetchJson<ApiFootballOddsResponse>(config, `/odds?fixture=${fixtureId}${marketParam}`);
    },
  };
}
