import { getTeamStats, getLeagueGoalAverages } from "@/lib/insights/team-stats";
import type { TeamRollingStats } from "@/lib/insights/team-stats";

type GoalsRolling = Pick<TeamRollingStats, "l5" | "season">;

function blendRecentSeason(
  recent: number,
  recentMatches: number,
  season: number,
  seasonMatches: number,
  recentWeightCap: number = 0.7
): number {
  if (seasonMatches === 0 && recentMatches === 0) return 0;
  if (seasonMatches === 0) return recent;
  if (recentMatches === 0) return season;

  const recentCoverage = Math.min(recentMatches / 5, 1); // how complete L5 is
  const wRecent = recentCoverage * recentWeightCap;
  const wSeason = 1 - wRecent;
  return wRecent * recent + wSeason * season;
}

function safeStats(team: TeamRollingStats | null): GoalsRolling | null {
  if (!team) return null;
  return { l5: team.l5, season: team.season };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export interface MatchGoalLambdas {
  lambdaHomeGoals: number;
  lambdaAwayGoals: number;
}

export interface MatchCornerLambdas {
  lambdaHomeCorners: number;
  lambdaAwayCorners: number;
}

export interface GoalLambdaComponents {
  leagueHomeGoals: number;
  leagueAwayGoals: number;
  homeAttackMultiplier: number;
  homeDefenceMultiplier: number;
  awayAttackMultiplier: number;
  awayDefenceMultiplier: number;
  homeAdvantageFactor: number;
}

function computeGoalLambdaComponents(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): { components: GoalLambdaComponents; homeStats: GoalsRolling; awayStats: GoalsRolling } | null {
  const homeStatsAll = getTeamStats(homeTeamName, fixtureDate, { venue: "home" });
  const awayStatsAll = getTeamStats(awayTeamName, fixtureDate, { venue: "away" });
  const homeStats = safeStats(homeStatsAll);
  const awayStats = safeStats(awayStatsAll);

  if (!homeStats || !awayStats) return null;

  const homeAttackRecent = homeStats.l5.goalsFor;
  const homeAttackSeason = homeStats.season.goalsFor;
  const homeDefRecent = homeStats.l5.goalsAgainst;
  const homeDefSeason = homeStats.season.goalsAgainst;

  const awayAttackRecent = awayStats.l5.goalsFor;
  const awayAttackSeason = awayStats.season.goalsFor;
  const awayDefRecent = awayStats.l5.goalsAgainst;
  const awayDefSeason = awayStats.season.goalsAgainst;

  const homeAttack = blendRecentSeason(
    homeAttackRecent,
    homeStats.l5.matchCount,
    homeAttackSeason,
    homeStats.season.matchCount
  );
  const homeDef = blendRecentSeason(
    homeDefRecent,
    homeStats.l5.matchCount,
    homeDefSeason,
    homeStats.season.matchCount
  );
  const awayAttack = blendRecentSeason(
    awayAttackRecent,
    awayStats.l5.matchCount,
    awayAttackSeason,
    awayStats.season.matchCount
  );
  const awayDef = blendRecentSeason(
    awayDefRecent,
    awayStats.l5.matchCount,
    awayDefSeason,
    awayStats.season.matchCount
  );

  const league = getLeagueGoalAverages();
  const leagueHomeGoals = league.homeGoals || 1.4;
  const leagueAwayGoals = league.awayGoals || 1.1;

  // League-normalized attack/defence multipliers.
  const homeAttackMultiplier = leagueHomeGoals > 0 ? homeAttack / leagueHomeGoals : 1;
  const awayAttackMultiplier = leagueAwayGoals > 0 ? awayAttack / leagueAwayGoals : 1;
  const homeDefenceMultiplier = leagueAwayGoals > 0 ? homeDef / leagueAwayGoals : 1;
  const awayDefenceMultiplier = leagueHomeGoals > 0 ? awayDef / leagueHomeGoals : 1;

  const components: GoalLambdaComponents = {
    leagueHomeGoals,
    leagueAwayGoals,
    homeAttackMultiplier,
    homeDefenceMultiplier,
    awayAttackMultiplier,
    awayDefenceMultiplier,
    homeAdvantageFactor: 1.1, // ~10% home edge
  };

  return { components, homeStats, awayStats };
}

/**
 * Baseline goal rate estimator:
 * - League-normalized home/away attack and defence strengths.
 * - Small recent-form and shot-intensity modifiers.
 */
export function estimateMatchGoalLambdas(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): MatchGoalLambdas | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate);
  if (!computed) return null;

  const { components, homeStats, awayStats } = computed;

  const {
    leagueHomeGoals,
    leagueAwayGoals,
    homeAttackMultiplier,
    homeDefenceMultiplier,
    awayAttackMultiplier,
    awayDefenceMultiplier,
    homeAdvantageFactor,
  } = components;

  // Recent vs season form modifiers (goals + shots).
  const safeDelta = (recent: number, season: number) => recent - season;
  const scaleDelta = (delta: number, maxAbs: number, cap: number) =>
    clamp(1 + (delta / maxAbs) * cap, 1 - cap, 1 + cap);

  const homeGoalsDelta = safeDelta(homeStats.l5.goalsFor, homeStats.season.goalsFor);
  const awayGoalsDelta = safeDelta(awayStats.l5.goalsFor, awayStats.season.goalsFor);
  const homeShotsDelta = safeDelta(homeStats.l5.shotsFor, homeStats.season.shotsFor);
  const awayShotsDelta = safeDelta(awayStats.l5.shotsFor, awayStats.season.shotsFor);

  const homeFormFactor =
    scaleDelta(homeGoalsDelta, 0.6, 0.12) * // up to ~12% from goals trend
    scaleDelta(homeShotsDelta, 4, 0.08); // up to ~8% from shots trend

  const awayFormFactor =
    scaleDelta(awayGoalsDelta, 0.6, 0.12) * scaleDelta(awayShotsDelta, 4, 0.08);

  const lambdaHomeBase =
    leagueHomeGoals * homeAttackMultiplier * awayDefenceMultiplier * homeAdvantageFactor;
  const lambdaAwayBase = leagueAwayGoals * awayAttackMultiplier * homeDefenceMultiplier;

  const lambdaHomeGoals = clamp(lambdaHomeBase * homeFormFactor, 0.1, 5.0);
  const lambdaAwayGoals = clamp(lambdaAwayBase * awayFormFactor, 0.1, 5.0);

  return {
    lambdaHomeGoals,
    lambdaAwayGoals,
  };
}

/**
 * Baseline corner rate estimator:
 * - Same blending logic as goals but on total corners (for+against).
 */
export function estimateMatchCornerLambdas(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): MatchCornerLambdas | null {
  const homeStatsAll = getTeamStats(homeTeamName, fixtureDate, { venue: "home" });
  const awayStatsAll = getTeamStats(awayTeamName, fixtureDate, { venue: "away" });
  const homeStats = safeStats(homeStatsAll);
  const awayStats = safeStats(awayStatsAll);

  if (!homeStats || !awayStats) return null;

  const homeCornersRecent = homeStats.l5.cornersFor + homeStats.l5.cornersAgainst;
  const homeCornersSeason = homeStats.season.cornersFor + homeStats.season.cornersAgainst;
  const awayCornersRecent = awayStats.l5.cornersFor + awayStats.l5.cornersAgainst;
  const awayCornersSeason = awayStats.season.cornersFor + awayStats.season.cornersAgainst;

  const homeCorners = blendRecentSeason(
    homeCornersRecent,
    homeStats.l5.matchCount,
    homeCornersSeason,
    homeStats.season.matchCount
  );
  const awayCorners = blendRecentSeason(
    awayCornersRecent,
    awayStats.l5.matchCount,
    awayCornersSeason,
    awayStats.season.matchCount
  );

  return {
    lambdaHomeCorners: clamp(homeCorners, 0.5, 18),
    lambdaAwayCorners: clamp(awayCorners, 0.5, 18),
  };
}

/**
 * Debug helper for UI: expose decomposed components used in goal λ estimation.
 */
export function debugGoalLambdaComponents(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): GoalLambdaComponents | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate);
  return computed?.components ?? null;
}

