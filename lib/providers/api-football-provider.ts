import type {
  ApiFootballFixturesResponse,
  ApiFootballFixtureStatisticsResponse,
  ApiFootballFixturePlayersResponse,
  ApiFootballOddsResponse,
  ApiFootballTeamsResponse,
} from "@/lib/api-football-types";
import type { FootballProvider } from "./types";
import { getEnvVar } from "@/lib/env";

export interface ApiFootballConfig {
  baseUrl: string;
  host?: string;
  key: string;
}

export function resolveApiFootballConfig(): ApiFootballConfig | null {
  const key = getEnvVar("API_FOOTBALL_KEY");
  if (!key) return null;

  return {
    baseUrl: getEnvVar("API_FOOTBALL_BASE_URL") ?? "https://v3.football.api-sports.io",
    host: getEnvVar("API_FOOTBALL_HOST") ?? undefined,
    key,
  };
}

async function fetchJson<T>(config: ApiFootballConfig, path: string): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": config.key,
        ...(config.host ? { "x-rapidapi-host": config.host } : {}),
      },
      cache: "no-store",
    });

    if (res.status === 429) {
      if (attempt < maxRetries) {
        const wait = (attempt + 1) * 5000; // 5s, 10s
        console.warn(`API-Football 429 rate limit on ${path}, retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      console.warn(`API-Football 429 rate limit on ${path}, returning empty response`);
      return { response: [] } as T;
    }

    if (!res.ok) {
      throw new Error(`API-Football request failed (${res.status})`);
    }

    return (await res.json()) as T;
  }

  return { response: [] } as T;
}

export function buildApiFootballProvider(config: ApiFootballConfig): FootballProvider {
  return {
    async getLeagues() {
      return fetchJson<{ response: unknown[] }>(config, "/leagues");
    },
    async getSeasons(leagueId: number) {
      return fetchJson<{ response: unknown[] }>(config, `/leagues/seasons?league=${leagueId}`);
    },
    async getFixtures(
      leagueId: number,
      seasonYear: number,
      from?: string,
      to?: string,
    ): Promise<ApiFootballFixturesResponse> {
      let path = `/fixtures?league=${leagueId}&season=${seasonYear}`;
      if (from) path += `&from=${from}`;
      if (to) path += `&to=${to}`;
      return fetchJson<ApiFootballFixturesResponse>(config, path);
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
    async getH2HFixtures(
      homeTeamId: number,
      awayTeamId: number,
      options?: { last?: number; league?: number },
    ): Promise<ApiFootballFixturesResponse> {
      let path = `/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`;
      if (options?.league) path += `&league=${options.league}`;
      if (options?.last) path += `&last=${options.last}`;
      return fetchJson<ApiFootballFixturesResponse>(config, path);
    },
    async getTeams(leagueId: number, seasonYear: number): Promise<ApiFootballTeamsResponse> {
      return fetchJson<ApiFootballTeamsResponse>(
        config,
        `/teams?league=${leagueId}&season=${seasonYear}`,
      );
    },
  };
}
