import type { ApiFootballFixtureStatisticsResponse } from "@/lib/api-football-types";
import type { NormalizedFixtureStats } from "./types";

export function normalizeFixtureStats(
  response: ApiFootballFixtureStatisticsResponse,
  fixtureId: number,
): NormalizedFixtureStats[] {
  return response.response.map((item) => ({
    providerFixtureId: fixtureId,
    teamId: item.team.id,
    teamName: item.team.name,
    teamLogo: item.team.logo ?? null,
    stats: statsToRecord(item.statistics),
  }));
}

function statsToRecord(
  stats: ApiFootballFixtureStatisticsResponse["response"][number]["statistics"],
): Record<string, number | string | null> {
  const record: Record<string, number | string | null> = {};
  for (const entry of stats) {
    record[entry.type] = entry.value;
  }
  return record;
}
