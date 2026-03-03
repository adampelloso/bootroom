/**
 * Server-side only: build trend chart data (last-N points + average) from
 * team match rows and L10 stats. Use this so the client receives plain
 * { value, opponentName }[] and average, avoiding RSC serialization issues.
 */

import type { TeamMatchRow } from "./team-stats";
import type { RollingStats } from "./team-stats";

export type StatTrendPoint = { value: number; opponentName: string };

export const TREND_STAT_KEYS = [
  "goalsFor",
  "goalsAgainst",
  "shotsFor",
  "shotsAgainst",
  "sotFor",
  "sotAgainst",
  "cornersFor",
  "cornersAgainst",
  "btts",
  "cleanSheet",
  "fouls",
  "yellowCards",
  "possession",
  "blockedShots",
] as const;

export type TrendStatKey = (typeof TREND_STAT_KEYS)[number];

export const TREND_STAT_TITLES: Record<TrendStatKey, string> = {
  goalsFor: "Goals for",
  goalsAgainst: "Goals against",
  shotsFor: "Shots for",
  shotsAgainst: "Shots against",
  sotFor: "Shots on target for",
  sotAgainst: "Shots on target against",
  cornersFor: "Corners for",
  cornersAgainst: "Corners against",
  btts: "BTTS (matches)",
  cleanSheet: "Clean sheets",
  fouls: "Fouls committed",
  yellowCards: "Yellow cards",
  possession: "Possession %",
  blockedShots: "Blocked shots",
};

export const TREND_STAT_INTEGER: Partial<Record<TrendStatKey, true>> = {
  goalsFor: true,
  goalsAgainst: true,
  btts: true,
  cleanSheet: true,
  fouls: true,
  yellowCards: true,
  blockedShots: true,
};

function rowValue(r: TeamMatchRow, key: TrendStatKey): number {
  const v = r[key];
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return 0;
}

function l10Value(l10: RollingStats, key: TrendStatKey): number {
  switch (key) {
    case "goalsFor":
      return l10.goalsFor;
    case "goalsAgainst":
      return l10.goalsAgainst;
    case "shotsFor":
      return l10.shotsFor;
    case "shotsAgainst":
      return l10.shotsAgainst;
    case "sotFor":
      return l10.sotFor;
    case "sotAgainst":
      return l10.sotAgainst;
    case "cornersFor":
      return l10.cornersFor;
    case "cornersAgainst":
      return l10.cornersAgainst;
    case "btts":
      return l10.bttsCount;
    case "cleanSheet":
      return l10.cleanSheets;
    case "fouls":
      return l10.fouls;
    case "yellowCards":
      return l10.yellowCards;
    case "possession":
      return l10.possession;
    case "blockedShots":
      return l10.blockedShots;
    default:
      return 0;
  }
}

export type TrendStatData = { data: StatTrendPoint[]; average: number };

export type TrendsByStat = Record<TrendStatKey, TrendStatData>;

export function buildTrendsByStat(
  rows: TeamMatchRow[],
  l10: RollingStats
): TrendsByStat {
  const out = {} as TrendsByStat;
  for (const key of TREND_STAT_KEYS) {
    out[key] = {
      data: rows.map((r) => ({
        value: rowValue(r, key),
        opponentName: typeof r.opponentName === "string" ? r.opponentName : "",
      })),
      average: l10Value(l10, key),
    };
  }
  return out;
}
