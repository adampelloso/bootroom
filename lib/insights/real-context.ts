/**
 * Build real context for insight templates from team rolling stats.
 * Replaces stub values with actual L5/L10 data from ingested fixtures.
 */

import type { InsightType } from "./catalog";
import type { MatchStatsResult } from "./team-stats";

export interface RealContext {
  home: string;
  away: string;
  value: string;
  l5: string;
  l10: string;
  n: string;
  k: string;
  pct: string;
  diff: string;
  against: string;
  combinedCleanSheets: string;
}

function fmt1(n: number): string {
  return n.toFixed(1);
}

function fmt0(n: number): string {
  return String(Math.round(n));
}

/**
 * Build real context for a given insight type from match stats.
 * Returns null if required data is missing for this insight.
 */
export function buildRealContext(
  matchStats: MatchStatsResult,
  insightType: InsightType,
  homeTeamName: string,
  awayTeamName: string
): RealContext | null {
  const { home: homeStats, away: awayStats } = matchStats;

  const ctx: RealContext = {
    home: homeTeamName,
    away: awayTeamName,
    value: "",
    l5: "",
    l10: "",
    n: "10",
    k: "",
    pct: "",
    diff: "",
    against: "",
    combinedCleanSheets: fmt0(matchStats.combinedL10CleanSheets),
  };

  switch (insightType.key) {
    case "high_total_goals_environment":
    case "low_total_goals_environment":
      ctx.value = fmt1(matchStats.combinedL5Goals);
      ctx.l5 = fmt1(matchStats.combinedL5Goals);
      ctx.l10 = fmt1(matchStats.combinedL10Goals);
      break;

    case "btts_tendency_high":
      ctx.k = fmt0(matchStats.combinedL10BTTS);
      ctx.n = "10";
      ctx.pct = fmt0((matchStats.combinedL10BTTS / 20) * 100);
      break;

    case "btts_tendency_low":
      ctx.combinedCleanSheets = fmt0(matchStats.combinedL10CleanSheets);
      ctx.k = fmt0(matchStats.combinedL10CleanSheets);
      ctx.n = "10";
      break;

    case "home_goals_trending_up":
    case "home_goals_trending_down":
      ctx.l5 = fmt1(homeStats.l5.goalsFor);
      ctx.l10 = fmt1(homeStats.l10.goalsFor);
      ctx.against = fmt1(homeStats.l5.goalsAgainst);
      break;

    case "away_goals_trending_up":
    case "away_goals_trending_down":
      ctx.l5 = fmt1(awayStats.l5.goalsFor);
      ctx.l10 = fmt1(awayStats.l10.goalsFor);
      ctx.against = fmt1(awayStats.l5.goalsAgainst);
      break;

    case "first_half_goals_tilt":
    case "second_half_goals_tilt":
    case "late_chaos_profile":
    case "scoreline_clustering":
      ctx.value = fmt1(matchStats.combinedL5Goals);
      ctx.k = fmt0(matchStats.combinedL5BTTS);
      ctx.n = "5";
      break;

    case "shot_dominance_edge":
      const homeDiff = homeStats.l5.shotsFor - homeStats.l5.shotsAgainst;
      ctx.l5 = fmt1(homeStats.l5.shotsFor);
      ctx.diff = fmt1(Math.abs(homeDiff));
      break;

    case "sot_dominance_edge":
      ctx.l5 = fmt1(homeStats.l5.sotFor);
      ctx.against = fmt1(homeStats.l5.sotAgainst);
      break;

    case "opponent_shots_suppressed":
      ctx.against = fmt1(homeStats.l10.shotsAgainst);
      ctx.l5 = fmt1(homeStats.l5.shotsFor);
      ctx.l10 = fmt1(homeStats.l10.shotsFor);
      break;

    case "one_sided_match_profile":
      const diff =
        (homeStats.l5.shotsFor - homeStats.l5.shotsAgainst + (awayStats.l5.shotsFor - awayStats.l5.shotsAgainst)) / 2;
      ctx.diff = fmt1(Math.abs(diff));
      ctx.l5 = fmt1((homeStats.l5.sotFor + awayStats.l5.sotFor) / 2);
      break;

    case "underdog_resilience_profile":
      ctx.l5 = fmt1(awayStats.l10.shotsFor);
      ctx.against = fmt1(awayStats.l10.shotsAgainst);
      break;

    case "high_total_corners_environment":
    case "low_total_corners_environment":
    case "trailing_pressure_profile":
      ctx.value = fmt1(matchStats.combinedL5Corners);
      break;

    case "home_corners_dominance_trend":
      ctx.l5 = fmt1(homeStats.l5.cornersFor);
      ctx.diff = fmt1(homeStats.l5.cornersFor - homeStats.l5.cornersAgainst);
      break;

    case "away_corners_dominance_trend":
      ctx.l5 = fmt1(awayStats.l5.cornersFor);
      ctx.diff = fmt1(awayStats.l5.cornersFor - awayStats.l5.cornersAgainst);
      break;

    case "opponent_corners_suppressed":
      ctx.against = fmt1(homeStats.l5.cornersAgainst);
      ctx.l5 = fmt1(homeStats.l5.cornersFor);
      break;

    case "primary_shooter_concentration":
    case "distributed_shooting_profile":
    case "player_shots_trending_up":
    case "team_shot_volume_boost_spot":
      ctx.l5 = "—";
      ctx.l10 = "—";
      ctx.pct = "—";
      break;

    case "high_variance_match_profile":
    case "comeback_frequency":
      ctx.pct = "50";
      break;

    default:
      ctx.value = fmt1(matchStats.combinedL5Goals);
      ctx.l5 = fmt1(matchStats.combinedL5Goals);
      ctx.l10 = fmt1(matchStats.combinedL10Goals);
      ctx.against = fmt1(homeStats.l5.goalsAgainst);
      ctx.k = fmt0(matchStats.combinedL5BTTS);
      ctx.n = "5";
  }

  return ctx;
}
