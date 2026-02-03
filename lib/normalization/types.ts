import type { ProviderKey } from "@/lib/providers/types";

export interface NormalizedTeam {
  id: number;
  name: string;
  logo: string | null;
}

export interface NormalizedVenue {
  id: number | null;
  name: string | null;
  city: string | null;
}

export interface NormalizedFixtureStatus {
  short: string;
  long: string | null;
  elapsed: number | null;
}

export interface NormalizedFixture {
  providerKey: ProviderKey;
  providerFixtureId: number;
  leagueId: number;
  season: number;
  round: string | null;
  kickoffUtc: string;
  status: NormalizedFixtureStatus;
  venue: NormalizedVenue | null;
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
  goals: { home: number | null; away: number | null };
}

export interface NormalizedFixtureStats {
  providerFixtureId: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  stats: Record<string, number | string | null>;
}

export interface NormalizedFixturePlayer {
  providerFixtureId: number;
  teamId: number;
  teamName: string;
  playerId: number;
  playerName: string;
  position: string | null;
  minutes: number | null;
  rating: string | null;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
  isCaptain: boolean | null;
}

export interface NormalizedOddsSnapshot {
  providerFixtureId: number;
  markets: unknown[];
}

export interface NormalizedSnapshot {
  providerKey: ProviderKey;
  generatedAtUtc: string;
  fixtures: NormalizedFixture[];
  fixtureStats: NormalizedFixtureStats[];
  fixturePlayers: NormalizedFixturePlayer[];
  odds: NormalizedOddsSnapshot[];
}
