import type { ApiFootballFixturePlayersResponse } from "@/lib/api-football-types";
import type { NormalizedFixturePlayer } from "./types";

export function normalizeFixturePlayers(
  response: ApiFootballFixturePlayersResponse,
  fixtureId: number,
): NormalizedFixturePlayer[] {
  const rows: NormalizedFixturePlayer[] = [];

  for (const team of response.response) {
    for (const player of team.players) {
      const primaryStats = player.statistics?.[0];

      rows.push({
        providerFixtureId: fixtureId,
        teamId: team.team.id,
        teamName: team.team.name,
        playerId: player.id,
        playerName: player.name,
        position: primaryStats?.games.position ?? null,
        minutes: primaryStats?.games.minutes ?? null,
        rating: primaryStats?.games.rating ?? null,
        shotsTotal: primaryStats?.shots?.total ?? null,
        shotsOn: primaryStats?.shots?.on ?? null,
        goals: primaryStats?.goals?.total ?? null,
        assists: primaryStats?.goals?.assists ?? null,
        isCaptain: primaryStats?.games.captain ?? null,
      });
    }
  }

  return rows;
}
