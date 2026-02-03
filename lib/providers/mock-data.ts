/**
 * Mock data in exact API-Football response shape for feed + match detail.
 * EPL (league 39), a few upcoming and recent fixtures with stats.
 */
import type {
  ApiFootballFixturesResponse,
  ApiFootballFixtureStatisticsResponse,
  ApiFootballFixturePlayersResponse,
  ApiFootballOddsResponse,
} from "@/lib/api-football-types";

const MOCK_FIXTURES: ApiFootballFixturesResponse["response"] = [
  {
    fixture: {
      id: 12345,
      referee: null,
      timezone: "UTC",
      date: "2025-02-08T15:00:00+00:00",
      timestamp: 1739026800,
      periods: { first: null, second: null },
      venue: { id: 555, name: "Emirates Stadium", city: "London" },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2025,
      round: "Regular Season - 25",
    },
    teams: {
      home: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", winner: null },
      away: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", winner: null },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: null,
      penalty: null,
    },
  },
  {
    fixture: {
      id: 12346,
      referee: null,
      timezone: "UTC",
      date: "2025-02-09T14:30:00+00:00",
      timestamp: 1739104200,
      periods: { first: null, second: null },
      venue: { id: 556, name: "Etihad Stadium", city: "Manchester" },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2025,
      round: "Regular Season - 25",
    },
    teams: {
      home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: null },
      away: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: null },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: null,
      penalty: null,
    },
  },
  {
    fixture: {
      id: 12347,
      referee: null,
      timezone: "UTC",
      date: "2025-02-10T19:00:00+00:00",
      timestamp: 1739214000,
      periods: { first: null, second: null },
      venue: { id: 558, name: "Tottenham Hotspur Stadium", city: "London" },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2025,
      round: "Regular Season - 25",
    },
    teams: {
      home: { id: 47, name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png", winner: null },
      away: { id: 66, name: "Aston Villa", logo: "https://media.api-sports.io/football/teams/66.png", winner: null },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: null,
      penalty: null,
    },
  },
  {
    fixture: {
      id: 12348,
      referee: null,
      timezone: "UTC",
      date: "2025-02-11T19:45:00+00:00",
      timestamp: 1739303100,
      periods: { first: null, second: null },
      venue: { id: 559, name: "Old Trafford", city: "Manchester" },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2025,
      round: "Regular Season - 25",
    },
    teams: {
      home: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", winner: null },
      away: { id: 45, name: "Everton", logo: "https://media.api-sports.io/football/teams/45.png", winner: null },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: null,
      penalty: null,
    },
  },
  {
    fixture: {
      id: 12340,
      referee: "M. Oliver",
      timezone: "UTC",
      date: "2025-02-02T14:00:00+00:00",
      timestamp: 1738422000,
      periods: { first: 1738425600, second: 1738429200 },
      venue: { id: 557, name: "Stamford Bridge", city: "London" },
      status: { long: "Match Finished", short: "FT", elapsed: 90 },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2025,
      round: "Regular Season - 24",
    },
    teams: {
      home: { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", winner: true },
      away: { id: 35, name: "Bournemouth", logo: "https://media.api-sports.io/football/teams/35.png", winner: false },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: 2, away: 0 },
      fulltime: { home: 3, away: 1 },
      extratime: null,
      penalty: null,
    },
  },
];

const MOCK_FIXTURE_STATS: Record<number, ApiFootballFixtureStatisticsResponse["response"]> = {
  12340: [
    {
      team: { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
      statistics: [
        { type: "Shots on Goal", value: 8 },
        { type: "Shots off Goal", value: 5 },
        { type: "Total Shots", value: 13 },
        { type: "Blocked Shots", value: 0 },
        { type: "Shots insidebox", value: 10 },
        { type: "Shots outsidebox", value: 3 },
        { type: "Fouls", value: 12 },
        { type: "Corner Kicks", value: 6 },
        { type: "Offsides", value: 2 },
        { type: "Ball Possession", value: "58%" },
        { type: "Yellow Cards", value: 2 },
        { type: "Red Cards", value: 0 },
        { type: "Goalkeeper Saves", value: 2 },
        { type: "Total passes", value: 512 },
        { type: "Passes accurate", value: 445 },
        { type: "Passes %", value: "87%" },
      ],
    },
    {
      team: { id: 35, name: "Bournemouth", logo: "https://media.api-sports.io/football/teams/35.png" },
      statistics: [
        { type: "Shots on Goal", value: 3 },
        { type: "Shots off Goal", value: 4 },
        { type: "Total Shots", value: 7 },
        { type: "Blocked Shots", value: 0 },
        { type: "Shots insidebox", value: 5 },
        { type: "Shots outsidebox", value: 2 },
        { type: "Fouls", value: 14 },
        { type: "Corner Kicks", value: 2 },
        { type: "Offsides", value: 1 },
        { type: "Ball Possession", value: "42%" },
        { type: "Yellow Cards", value: 3 },
        { type: "Red Cards", value: 0 },
        { type: "Goalkeeper Saves", value: 5 },
        { type: "Total passes", value: 378 },
        { type: "Passes accurate", value: 312 },
        { type: "Passes %", value: "83%" },
      ],
    },
  ],
};

const MOCK_FIXTURE_PLAYERS: Record<number, ApiFootballFixturePlayersResponse["response"]> = {
  12340: [
    {
      team: { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
      players: [
        {
          id: 882,
          name: "C. Palmer",
          firstname: "Cole",
          lastname: "Palmer",
          photo: "https://media.api-sports.io/football/players/882.png",
          statistics: [
            {
              games: { minutes: 90, position: "Midfielder", rating: "8.5", captain: false },
              shots: { total: 4, on: 3 },
              goals: { total: 2, assists: 1 },
            },
          ],
        },
        {
          id: 909,
          name: "N. Jackson",
          firstname: "Nicolas",
          lastname: "Jackson",
          photo: "https://media.api-sports.io/football/players/909.png",
          statistics: [
            {
              games: { minutes: 85, position: "Attacker", rating: "7.2", captain: false },
              shots: { total: 3, on: 2 },
              goals: { total: 1, assists: 0 },
            },
          ],
        },
      ],
    },
    {
      team: { id: 35, name: "Bournemouth", logo: "https://media.api-sports.io/football/teams/35.png" },
      players: [
        {
          id: 18748,
          name: "D. Solanke",
          firstname: "Dominic",
          lastname: "Solanke",
          photo: "https://media.api-sports.io/football/players/18748.png",
          statistics: [
            {
              games: { minutes: 90, position: "Attacker", rating: "6.8", captain: true },
              shots: { total: 2, on: 1 },
              goals: { total: 1, assists: 0 },
            },
          ],
        },
      ],
    },
  ],
};

function fixturesResponse(response: ApiFootballFixturesResponse["response"]): ApiFootballFixturesResponse {
  return {
    get: "fixtures",
    parameters: {},
    errors: {},
    results: response.length,
    paging: { current: 1, total: 1 },
    response,
  };
}

function statsResponse(response: ApiFootballFixtureStatisticsResponse["response"]): ApiFootballFixtureStatisticsResponse {
  return {
    get: "fixtures/statistics",
    parameters: {},
    errors: {},
    results: response.length,
    paging: { current: 1, total: 1 },
    response,
  };
}

function playersResponse(response: ApiFootballFixturePlayersResponse["response"]): ApiFootballFixturePlayersResponse {
  return {
    get: "fixtures/players",
    parameters: {},
    errors: {},
    results: response.length,
    paging: { current: 1, total: 1 },
    response,
  };
}

export function getMockFixturesResponse(leagueId: number, seasonYear: number): ApiFootballFixturesResponse {
  if (leagueId === 39 && seasonYear === 2025) {
    return fixturesResponse(MOCK_FIXTURES);
  }
  return fixturesResponse([]);
}

export function getMockFixtureResponse(fixtureId: number): ApiFootballFixturesResponse {
  const one = MOCK_FIXTURES.find((f) => f.fixture.id === fixtureId);
  return fixturesResponse(one ? [one] : []);
}

export function getMockFixtureStatsResponse(fixtureId: number): ApiFootballFixtureStatisticsResponse {
  const response = MOCK_FIXTURE_STATS[fixtureId] ?? [];
  return statsResponse(response);
}

export function getMockFixturePlayersResponse(fixtureId: number): ApiFootballFixturePlayersResponse {
  const response = MOCK_FIXTURE_PLAYERS[fixtureId] ?? [];
  return playersResponse(response);
}

export function getMockOddsResponse(_fixtureId: number, _markets?: string[]): ApiFootballOddsResponse {
  return {
    get: "odds",
    parameters: {},
    errors: {},
    results: 0,
    paging: { current: 1, total: 1 },
    response: [],
  };
}
