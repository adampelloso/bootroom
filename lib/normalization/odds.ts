import type { ApiFootballOddsResponse } from "@/lib/api-football-types";
import type { NormalizedOddsSnapshot } from "./types";

export function normalizeOddsSnapshot(
  response: ApiFootballOddsResponse,
  fixtureId: number,
): NormalizedOddsSnapshot {
  return {
    providerFixtureId: fixtureId,
    markets: response.response ?? [],
  };
}
