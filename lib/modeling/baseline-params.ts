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

/**
 * Shrink a raw attack/defence multiplier toward 1.0 based on sample size.
 * With few matches the estimate is noisy, so we trust the league average more.
 * At 20+ venue-filtered matches we use ~80% of the raw multiplier.
 */
function shrinkMultiplier(raw: number, sampleSize: number): number {
  // Confidence ramps from 0.3 (≤3 matches) to 0.85 (≥20 matches)
  const confidence = clamp(0.3 + (sampleSize / 20) * 0.55, 0.3, 0.85);
  return 1 + (raw - 1) * confidence;
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
  fixtureDate?: string,
  leagueId?: number
): { components: GoalLambdaComponents; homeStats: GoalsRolling; awayStats: GoalsRolling } | null {
  const homeStatsAll = getTeamStats(homeTeamName, fixtureDate, { venue: "home", leagueId });
  const awayStatsAll = getTeamStats(awayTeamName, fixtureDate, { venue: "away", leagueId });
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

  const league = getLeagueGoalAverages(leagueId);
  const leagueHomeGoals = league.homeGoals || 1.4;
  const leagueAwayGoals = league.awayGoals || 1.1;

  // League-normalized attack/defence multipliers with regression to the mean.
  // Shrink extreme multipliers toward 1.0 based on sample size.
  const homeSeasonN = homeStats.season.matchCount;
  const awaySeasonN = awayStats.season.matchCount;

  const rawHomeAttack = leagueHomeGoals > 0 ? homeAttack / leagueHomeGoals : 1;
  const rawAwayAttack = leagueAwayGoals > 0 ? awayAttack / leagueAwayGoals : 1;
  const rawHomeDef = leagueAwayGoals > 0 ? homeDef / leagueAwayGoals : 1;
  const rawAwayDef = leagueHomeGoals > 0 ? awayDef / leagueHomeGoals : 1;

  const homeAttackMultiplier = shrinkMultiplier(rawHomeAttack, homeSeasonN);
  const awayAttackMultiplier = shrinkMultiplier(rawAwayAttack, awaySeasonN);
  const homeDefenceMultiplier = shrinkMultiplier(rawHomeDef, homeSeasonN);
  const awayDefenceMultiplier = shrinkMultiplier(rawAwayDef, awaySeasonN);

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
 * - leagueId scopes team stats and league averages to a single competition.
 */
export function estimateMatchGoalLambdas(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string,
  leagueId?: number
): MatchGoalLambdas | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate, leagueId);
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
  fixtureDate?: string,
  leagueId?: number
): MatchCornerLambdas | null {
  const homeStatsAll = getTeamStats(homeTeamName, fixtureDate, { venue: "home", leagueId });
  const awayStatsAll = getTeamStats(awayTeamName, fixtureDate, { venue: "away", leagueId });
  const homeStats = safeStats(homeStatsAll);
  const awayStats = safeStats(awayStatsAll);

  if (!homeStats || !awayStats) return null;

  const homeCornersRecent = homeStats.l5.cornersFor;
  const homeCornersSeason = homeStats.season.cornersFor;
  const awayCornersRecent = awayStats.l5.cornersFor;
  const awayCornersSeason = awayStats.season.cornersFor;

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
  fixtureDate?: string,
  leagueId?: number
): GoalLambdaComponents | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate, leagueId);
  return computed?.components ?? null;
}

