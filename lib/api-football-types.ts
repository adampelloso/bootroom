/**
 * API-Football (API-Sports v3) response shapes.
 * Mock data and real provider must return these exact shapes.
 * @see https://v3.football.api-sports.io/
 */

export interface ApiFootballFixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: { first: number | null; second: number | null };
  venue: { id: number | null; name: string; city: string };
  status: { long: string; short: string; elapsed: number | null };
}

export interface ApiFootballLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
  round: string;
}

export interface ApiFootballTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiFootballGoals {
  home: number | null;
  away: number | null;
}

export interface ApiFootballFixtureResponseItem {
  fixture: ApiFootballFixture;
  league: ApiFootballLeague;
  teams: { home: ApiFootballTeam; away: ApiFootballTeam };
  goals: ApiFootballGoals;
  score: {
    halftime: ApiFootballGoals;
    fulltime: ApiFootballGoals;
    extratime: ApiFootballGoals | null;
    penalty: ApiFootballGoals | null;
  };
}

export interface ApiFootballFixturesResponse {
  get: string;
  parameters: Record<string, string | number>;
  errors: Record<string, unknown>;
  results: number;
  paging: { current: number; total: number };
  response: ApiFootballFixtureResponseItem[];
}

/** Single team stats from /fixtures/statistics */
export interface ApiFootballStatistic {
  type: string;
  value: number | string | null;
}

export interface ApiFootballFixtureStatisticsItem {
  team: { id: number; name: string; logo: string };
  statistics: ApiFootballStatistic[];
}

export interface ApiFootballFixtureStatisticsResponse {
  get: string;
  parameters: Record<string, string | number>;
  errors: Record<string, unknown>;
  results: number;
  paging: { current: number; total: number };
  response: ApiFootballFixtureStatisticsItem[];
}

/** Player stats from /fixtures/players */
export interface ApiFootballPlayerStats {
  games: {
    minutes: number | null;
    position: string;
    rating: string | null;
    captain: boolean;
  };
  shots?: { total: number | null; on: number | null };
  goals?: { total: number | null; assists: number | null };
}

export interface ApiFootballPlayerResponseItem {
  team: { id: number; name: string; logo: string };
  players: Array<{
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    photo: string;
    statistics: ApiFootballPlayerStats[];
  }>;
}

export interface ApiFootballFixturePlayersResponse {
  get: string;
  parameters: Record<string, string | number>;
  errors: Record<string, unknown>;
  results: number;
  paging: { current: number; total: number };
  response: ApiFootballPlayerResponseItem[];
}

/** Odds snapshot - simplified for MVP */
export interface ApiFootballOddsResponse {
  get: string;
  parameters: Record<string, string | number>;
  errors: Record<string, unknown>;
  results: number;
  paging: { current: number; total: number };
  response: unknown[];
}
