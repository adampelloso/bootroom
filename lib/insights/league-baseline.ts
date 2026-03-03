/**
 * League average (stub). Replace with real aggregation from ingested fixtures when available.
 */

import type { TrendStatKey } from "./trend-chart-data";

/** Stub league averages per stat (e.g. EPL typical). */
const STUB_LEAGUE_AVG: Record<TrendStatKey, number> = {
  goalsFor: 1.4,
  goalsAgainst: 1.3,
  shotsFor: 12,
  shotsAgainst: 11,
  sotFor: 4.2,
  sotAgainst: 4,
  cornersFor: 5.5,
  cornersAgainst: 5.2,
  btts: 5,
  cleanSheet: 4,
  fouls: 11,
  yellowCards: 1.8,
  possession: 50,
  blockedShots: 3.5,
};

export function getLeagueAverage(statKey: TrendStatKey): number {
  return STUB_LEAGUE_AVG[statKey] ?? 0;
}
