import type { FootballProvider } from "./types";
import type {
  ApiFootballFixturesResponse,
  ApiFootballFixtureStatisticsResponse,
  ApiFootballFixturePlayersResponse,
  ApiFootballOddsResponse,
} from "@/lib/api-football-types";
import {
  getMockFixturesResponse,
  getMockFixtureResponse,
  getMockFixtureStatsResponse,
  getMockFixturePlayersResponse,
  getMockOddsResponse,
} from "./mock-data";

/**
 * Mock provider returning API-Football-shaped data from static mock.
 * Use for UX development; swap to ApiFootballProvider when adding real ingestion.
 */
export const mockFootballProvider: FootballProvider = {
  async getLeagues() {
    return { response: [{ id: 39, name: "Premier League", country: "England" }] };
  },

  async getSeasons() {
    return { response: [2024, 2025] };
  },

  async getFixtures(leagueId: number, seasonYear: number): Promise<ApiFootballFixturesResponse> {
    return getMockFixturesResponse(leagueId, seasonYear);
  },

  async getFixture(fixtureId: number): Promise<ApiFootballFixturesResponse> {
    return getMockFixtureResponse(fixtureId);
  },

  async getFixtureStats(fixtureId: number): Promise<ApiFootballFixtureStatisticsResponse> {
    return getMockFixtureStatsResponse(fixtureId);
  },

  async getFixturePlayers(fixtureId: number): Promise<ApiFootballFixturePlayersResponse> {
    return getMockFixturePlayersResponse(fixtureId);
  },

  async getOdds(fixtureId: number, markets?: string[]): Promise<ApiFootballOddsResponse> {
    return getMockOddsResponse(fixtureId, markets);
  },
};
