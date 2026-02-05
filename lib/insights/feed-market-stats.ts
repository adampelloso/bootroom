/**
 * Feed market rows: BTTS, O2.5, Corners.
 * Home = home team last 5 home matches, Away = away team last 5 away, Combined = those 10.
 * Season = team's full season (all matches before fixture) for hit rate / avg.
 */

import { getTeamLastNMatchRows, getTeamStats } from "./team-stats";
import type { TeamMatchRow } from "./team-stats";

/** Season hit rate: hits and total matches (for display as e.g. 6/10 or 60%). */
export type SeasonRate = { hits: number; total: number };

export type FeedMarketRow =
  | {
      market: "BTTS";
      homeHits: number;
      awayHits: number;
      combinedHits: number;
      avgGoals?: number;
      /** Season hit rate: home team all matches before fixture. */
      seasonHome?: SeasonRate;
      seasonAway?: SeasonRate;
    }
  | {
      market: "O2.5";
      homeHits: number;
      awayHits: number;
      combinedHits: number;
      avgGoals: number;
      seasonHome?: SeasonRate;
      seasonAway?: SeasonRate;
    }
  | {
      market: "Corners";
      homeAvg: number;
      awayAvg: number;
      combinedAvg: number;
      /** Season avg total corners per match. */
      seasonHomeAvg?: number;
      seasonAwayAvg?: number;
    };

function bttsHits(rows: TeamMatchRow[]): number {
  return rows.filter((r) => r.btts).length;
}

function o25Hits(rows: TeamMatchRow[]): number {
  return rows.filter((r) => r.goalsFor + r.goalsAgainst >= 3).length;
}

function avgGoals(rows: TeamMatchRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((a, r) => a + r.goalsFor + r.goalsAgainst, 0);
  return sum / rows.length;
}

function totalCorners(r: TeamMatchRow): number {
  return r.cornersFor + r.cornersAgainst;
}

function avgTotalCorners(rows: TeamMatchRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((a, r) => a + totalCorners(r), 0);
  return sum / rows.length;
}

/**
 * Compute feed market rows for a match.
 * Home team: last 5 home. Away team: last 5 away. Combined = those 10.
 * Season stats: each team's full season (all matches before fixture) for hit rate / avg.
 * Returns up to 3 rows in order: BTTS, O2.5, Corners. Skips a market if no data.
 */
export function getFeedMarketRows(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): FeedMarketRow[] {
  const homeHome = getTeamLastNMatchRows(homeTeamName, 5, fixtureDate, { venue: "home" });
  const awayAway = getTeamLastNMatchRows(awayTeamName, 5, fixtureDate, { venue: "away" });
  const combined = [...homeHome, ...awayAway];

  const homeSeason = getTeamStats(homeTeamName, fixtureDate, { venue: "all" });
  const awaySeason = getTeamStats(awayTeamName, fixtureDate, { venue: "all" });

  const rows: FeedMarketRow[] = [];

  if (homeHome.length > 0 || awayAway.length > 0) {
    rows.push({
      market: "BTTS",
      homeHits: bttsHits(homeHome),
      awayHits: bttsHits(awayAway),
      combinedHits: bttsHits(combined),
      avgGoals: avgGoals(combined),
      seasonHome:
        homeSeason?.season && homeSeason.season.matchCount > 0
          ? { hits: homeSeason.season.bttsCount, total: homeSeason.season.matchCount }
          : undefined,
      seasonAway:
        awaySeason?.season && awaySeason.season.matchCount > 0
          ? { hits: awaySeason.season.bttsCount, total: awaySeason.season.matchCount }
          : undefined,
    });
  }

  if (homeHome.length > 0 || awayAway.length > 0) {
    rows.push({
      market: "O2.5",
      homeHits: o25Hits(homeHome),
      awayHits: o25Hits(awayAway),
      combinedHits: o25Hits(combined),
      avgGoals: avgGoals(combined),
      seasonHome:
        homeSeason?.season && homeSeason.season.matchCount > 0
          ? { hits: homeSeason.season.o25Count, total: homeSeason.season.matchCount }
          : undefined,
      seasonAway:
        awaySeason?.season && awaySeason.season.matchCount > 0
          ? { hits: awaySeason.season.o25Count, total: awaySeason.season.matchCount }
          : undefined,
    });
  }

  if (homeHome.length > 0 || awayAway.length > 0) {
    const seasonHomeAvg =
      homeSeason?.season && homeSeason.season.matchCount > 0
        ? homeSeason.season.cornersFor + homeSeason.season.cornersAgainst
        : undefined;
    const seasonAwayAvg =
      awaySeason?.season && awaySeason.season.matchCount > 0
        ? awaySeason.season.cornersFor + awaySeason.season.cornersAgainst
        : undefined;
    rows.push({
      market: "Corners",
      homeAvg: avgTotalCorners(homeHome),
      awayAvg: avgTotalCorners(awayAway),
      combinedAvg: avgTotalCorners(combined),
      seasonHomeAvg,
      seasonAwayAvg,
    });
  }

  return rows.slice(0, 3);
}

/**
 * Optional: sort score for feed ordering. Not shown in UI.
 */
export function feedMatchScore(rows: FeedMarketRow[]): number {
  let score = 0;
  const btts = rows.find((r) => r.market === "BTTS");
  if (btts && btts.market === "BTTS") score += btts.combinedHits / 10;
  const o25 = rows.find((r) => r.market === "O2.5");
  if (o25 && o25.market === "O2.5") score += o25.combinedHits / 10;
  const corners = rows.find((r) => r.market === "Corners");
  if (corners && corners.market === "Corners") score += (corners.combinedAvg / 14) * 0.5;
  return score;
}

/** One chart point for screenshot charts. */
export type ScreenshotChartPoint = { value: number; opponentName: string };

/** Screenshot charts: Total Goals, BTTS, Total Corners (combined 10), then Team Corners For home/away (10 each). */
export function getDetailScreenshotCharts(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): {
  totalGoals: { data: ScreenshotChartPoint[]; average: number };
  btts: { data: ScreenshotChartPoint[]; average: number };
  totalCorners: { data: ScreenshotChartPoint[]; average: number };
  homeCornersFor: { data: ScreenshotChartPoint[]; average: number };
  awayCornersFor: { data: ScreenshotChartPoint[]; average: number };
} {
  const homeHome5 = getTeamLastNMatchRows(homeTeamName, 5, fixtureDate, { venue: "home" });
  const awayAway5 = getTeamLastNMatchRows(awayTeamName, 5, fixtureDate, { venue: "away" });
  const combined = [...homeHome5, ...awayAway5].sort((a, b) => a.dateMs - b.dateMs);

  const totalGoalsData: ScreenshotChartPoint[] = combined.map((r) => ({
    value: r.goalsFor + r.goalsAgainst,
    opponentName: r.opponentName,
  }));
  const totalGoalsAvg =
    totalGoalsData.length > 0
      ? totalGoalsData.reduce((a, p) => a + p.value, 0) / totalGoalsData.length
      : 0;

  const bttsData: ScreenshotChartPoint[] = combined.map((r) => ({
    value: r.btts ? 1 : 0,
    opponentName: r.opponentName,
  }));
  const bttsAvg =
    bttsData.length > 0 ? bttsData.reduce((a, p) => a + p.value, 0) / bttsData.length : 0;

  const totalCornersData: ScreenshotChartPoint[] = combined.map((r) => ({
    value: r.cornersFor + r.cornersAgainst,
    opponentName: r.opponentName,
  }));
  const totalCornersAvg =
    totalCornersData.length > 0
      ? totalCornersData.reduce((a, p) => a + p.value, 0) / totalCornersData.length
      : 0;

  const homeHome10 = getTeamLastNMatchRows(homeTeamName, 10, fixtureDate, { venue: "home" });
  const awayAway10 = getTeamLastNMatchRows(awayTeamName, 10, fixtureDate, { venue: "away" });

  const homeCornersForData: ScreenshotChartPoint[] = homeHome10.map((r) => ({
    value: r.cornersFor,
    opponentName: r.opponentName,
  }));
  const homeCornersForAvg =
    homeCornersForData.length > 0
      ? homeCornersForData.reduce((a, p) => a + p.value, 0) / homeCornersForData.length
      : 0;

  const awayCornersForData: ScreenshotChartPoint[] = awayAway10.map((r) => ({
    value: r.cornersFor,
    opponentName: r.opponentName,
  }));
  const awayCornersForAvg =
    awayCornersForData.length > 0
      ? awayCornersForData.reduce((a, p) => a + p.value, 0) / awayCornersForData.length
      : 0;

  return {
    totalGoals: { data: totalGoalsData, average: totalGoalsAvg },
    btts: { data: bttsData, average: bttsAvg },
    totalCorners: { data: totalCornersData, average: totalCornersAvg },
    homeCornersFor: { data: homeCornersForData, average: homeCornersForAvg },
    awayCornersFor: { data: awayCornersForData, average: awayCornersForAvg },
  };
}
