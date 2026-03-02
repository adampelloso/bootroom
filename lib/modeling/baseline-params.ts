import { getTeamStats, getLeagueGoalAverages, getTeamPrimaryLeagueId } from "@/lib/insights/team-stats";
import type { TeamRollingStats } from "@/lib/insights/team-stats";
import { isCup, getLeagueStrength } from "@/lib/leagues";
import type { FirstLegResult } from "@/lib/modeling/first-leg-lookup";

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

/**
 * Shrink extreme total lambdas toward the league average.
 * When λ_total deviates far from the league mean, the model is over-trusting
 * small-sample extreme form. Backtest data shows: λ_total > 3.5 → predicted 3.98,
 * actual 3.08; λ_total < 2.0 → predicted 1.77, actual 2.60.
 *
 * Uses a smooth sigmoid that progressively shrinks extremes:
 * - Within ±0.5 of league avg: minimal adjustment
 * - 1.5+ away from league avg: ~40% shrinkage toward mean
 */
function shrinkExtremeLambdas(
  lambdaHome: number,
  lambdaAway: number,
  leagueMean: number,
): { lambdaHome: number; lambdaAway: number } {
  const total = lambdaHome + lambdaAway;
  const deviation = total - leagueMean;
  const absDeviation = Math.abs(deviation);

  // No shrinkage for deviations under 0.3 goals from league average
  if (absDeviation < 0.3) return { lambdaHome, lambdaAway };

  // Sigmoid shrinkage: ramps from 0 (at 0.3 deviation) to ~0.4 (at large deviations)
  const maxShrink = 0.4;
  const shrinkFraction = maxShrink * (1 - Math.exp(-(absDeviation - 0.3) / 1.0));

  // Shrink total toward league mean, preserving home/away ratio
  const adjustedTotal = total - deviation * shrinkFraction;
  const ratio = total > 0 ? adjustedTotal / total : 1;

  return {
    lambdaHome: lambdaHome * ratio,
    lambdaAway: lambdaAway * ratio,
  };
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
  leagueId?: number,
  firstLegResult?: FirstLegResult,
): { components: GoalLambdaComponents; homeStats: GoalsRolling; awayStats: GoalsRolling } | null {
  // For cup matches, pull stats from each team's primary domestic league
  // so we're comparing like-for-like within their usual competition.
  const cupMatch = leagueId != null && isCup(leagueId);
  const homeLeagueId = cupMatch
    ? getTeamPrimaryLeagueId(homeTeamName, fixtureDate) ?? leagueId
    : leagueId;
  const awayLeagueId = cupMatch
    ? getTeamPrimaryLeagueId(awayTeamName, fixtureDate) ?? leagueId
    : leagueId;

  let homeStats = safeStats(getTeamStats(homeTeamName, fixtureDate, { venue: "home", leagueId: homeLeagueId }));
  let awayStats = safeStats(getTeamStats(awayTeamName, fixtureDate, { venue: "away", leagueId: awayLeagueId }));

  // Fall back to all-competition stats if primary league returns nothing
  if (!homeStats) homeStats = safeStats(getTeamStats(homeTeamName, fixtureDate, { venue: "home" }));
  if (!awayStats) awayStats = safeStats(getTeamStats(awayTeamName, fixtureDate, { venue: "away" }));

  if (!homeStats || !awayStats) return null;

  // Prefer xG over raw goals when available (xG is far less noisy).
  // Fall back to raw goals when xG coverage is insufficient (< 3 matches in window).
  const useXgL5Home = homeStats.l5.xgMatchCount >= 3;
  const useXgSeasonHome = homeStats.season.xgMatchCount >= 5;
  const useXgL5Away = awayStats.l5.xgMatchCount >= 3;
  const useXgSeasonAway = awayStats.season.xgMatchCount >= 5;

  const homeAttackRecent = useXgL5Home ? homeStats.l5.xgFor : homeStats.l5.goalsFor;
  const homeAttackSeason = useXgSeasonHome ? homeStats.season.xgFor : homeStats.season.goalsFor;
  const homeDefRecent = useXgL5Home ? homeStats.l5.xgAgainst : homeStats.l5.goalsAgainst;
  const homeDefSeason = useXgSeasonHome ? homeStats.season.xgAgainst : homeStats.season.goalsAgainst;

  const awayAttackRecent = useXgL5Away ? awayStats.l5.xgFor : awayStats.l5.goalsFor;
  const awayAttackSeason = useXgSeasonAway ? awayStats.season.xgFor : awayStats.season.goalsFor;
  const awayDefRecent = useXgL5Away ? awayStats.l5.xgAgainst : awayStats.l5.goalsAgainst;
  const awayDefSeason = useXgSeasonAway ? awayStats.season.xgAgainst : awayStats.season.goalsAgainst;

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

  // For cup matches, use a neutral top-flight baseline so both teams are
  // evaluated against the same yardstick before the strength adjustment.
  const baselineLeagueId = cupMatch ? undefined : leagueId;
  const league = getLeagueGoalAverages(baselineLeagueId);
  const leagueHomeGoals = league.homeGoals || 1.4;
  const leagueAwayGoals = league.awayGoals || 1.1;

  // Normalize each team's stats against their own league averages so
  // multipliers represent "how good are they relative to their league".
  const homeLeagueAvg = cupMatch ? getLeagueGoalAverages(homeLeagueId) : league;
  const awayLeagueAvg = cupMatch ? getLeagueGoalAverages(awayLeagueId) : league;
  const hlHome = homeLeagueAvg.homeGoals || leagueHomeGoals;
  const hlAway = homeLeagueAvg.awayGoals || leagueAwayGoals;
  const alHome = awayLeagueAvg.homeGoals || leagueHomeGoals;
  const alAway = awayLeagueAvg.awayGoals || leagueAwayGoals;

  // League-normalized attack/defence multipliers with regression to the mean.
  // Shrink extreme multipliers toward 1.0 based on sample size.
  const homeSeasonN = homeStats.season.matchCount;
  const awaySeasonN = awayStats.season.matchCount;

  const rawHomeAttack = hlHome > 0 ? homeAttack / hlHome : 1;
  const rawAwayAttack = alAway > 0 ? awayAttack / alAway : 1;
  const rawHomeDef = hlAway > 0 ? homeDef / hlAway : 1;
  const rawAwayDef = alHome > 0 ? awayDef / alHome : 1;

  let homeAttackMultiplier = shrinkMultiplier(rawHomeAttack, homeSeasonN);
  let awayAttackMultiplier = shrinkMultiplier(rawAwayAttack, awaySeasonN);
  let homeDefenceMultiplier = shrinkMultiplier(rawHomeDef, homeSeasonN);
  let awayDefenceMultiplier = shrinkMultiplier(rawAwayDef, awaySeasonN);

  // Cross-league strength adjustment for cup matches.
  // If teams come from different-strength leagues, scale their multipliers
  // so a top-flight team's "average" performance beats a lower-league team's.
  if (cupMatch) {
    const homeStrength = getLeagueStrength(homeLeagueId!);
    const awayStrength = getLeagueStrength(awayLeagueId!);

    // Scale attack up and defence down for the stronger-league team (and vice versa).
    // The ratio captures the gap: e.g. EPL (1.0) vs Championship (0.78) → 1.28x edge.
    if (homeStrength !== awayStrength) {
      const homeEdge = homeStrength / awayStrength; // >1 if home team from stronger league
      const awayEdge = awayStrength / homeStrength;

      // Apply as a moderate scaling (sqrt to avoid extreme swings)
      const homeScale = Math.sqrt(homeEdge);
      const awayScale = Math.sqrt(awayEdge);

      homeAttackMultiplier *= homeScale;
      homeDefenceMultiplier *= awayScale; // opponent's attack scaled up → more goals conceded
      awayAttackMultiplier *= awayScale;
      awayDefenceMultiplier *= homeScale;
    }
  }

  // Two-leg cup tie adjustment: trailing team attacks more, leading team sits deeper.
  if (cupMatch && firstLegResult && firstLegResult.aggregateDeficit !== 0) {
    const deficit = firstLegResult.aggregateDeficit;
    const capped = Math.min(Math.abs(deficit), 3);

    // Per-goal: ~6% attack boost for trailing team, ~4% defence weakening
    const atkBoost = 1 + capped * 0.06;      // max 1.18
    const defWeaken = 1 + capped * 0.04;      // max 1.12
    const atkReduce = 1 - capped * 0.04;      // min 0.88
    const defStrengthen = 1 - capped * 0.03;  // min 0.91

    if (deficit > 0) {
      // Home team (leg 2) is trailing → attacks more, defends worse
      homeAttackMultiplier *= atkBoost;
      homeDefenceMultiplier *= defWeaken;
      awayAttackMultiplier *= atkReduce;
      awayDefenceMultiplier *= defStrengthen;
    } else {
      // Away team (leg 2) is trailing → they attack more
      awayAttackMultiplier *= atkBoost;
      awayDefenceMultiplier *= defWeaken;
      homeAttackMultiplier *= atkReduce;
      homeDefenceMultiplier *= defStrengthen;
    }
  }

  const components: GoalLambdaComponents = {
    leagueHomeGoals,
    leagueAwayGoals,
    homeAttackMultiplier,
    homeDefenceMultiplier,
    awayAttackMultiplier,
    awayDefenceMultiplier,
    homeAdvantageFactor: 1.02, // ~2% residual home edge (venue effect already in team stats)
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
  leagueId?: number,
  firstLegResult?: FirstLegResult,
): MatchGoalLambdas | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate, leagueId, firstLegResult);
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

  let lambdaHomeGoals = clamp(lambdaHomeBase * homeFormFactor, 0.1, 5.0);
  let lambdaAwayGoals = clamp(lambdaAwayBase * awayFormFactor, 0.1, 5.0);

  // Shrink extreme total lambdas toward league average
  const leagueMean = leagueHomeGoals + leagueAwayGoals;
  const shrunk = shrinkExtremeLambdas(lambdaHomeGoals, lambdaAwayGoals, leagueMean);
  lambdaHomeGoals = shrunk.lambdaHome;
  lambdaAwayGoals = shrunk.lambdaAway;

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
  // Try league-scoped stats first, fall back to all-competition stats when
  // corner data is missing or near-zero (common for cup competitions where
  // lower-league teams lack stats in the cup's league ID).
  let homeStats = safeStats(getTeamStats(homeTeamName, fixtureDate, { venue: "home", leagueId }));
  let awayStats = safeStats(getTeamStats(awayTeamName, fixtureDate, { venue: "away", leagueId }));

  // If league-scoped stats have no meaningful corner data, broaden to all competitions.
  const MIN_CORNER_AVG = 1.0; // real teams average 4–7 corners; < 1 means data is missing
  if (homeStats && homeStats.season.cornersFor < MIN_CORNER_AVG && leagueId != null) {
    const broader = safeStats(getTeamStats(homeTeamName, fixtureDate, { venue: "home" }));
    if (broader && broader.season.cornersFor >= MIN_CORNER_AVG) homeStats = broader;
  }
  if (awayStats && awayStats.season.cornersFor < MIN_CORNER_AVG && leagueId != null) {
    const broader = safeStats(getTeamStats(awayTeamName, fixtureDate, { venue: "away" }));
    if (broader && broader.season.cornersFor >= MIN_CORNER_AVG) awayStats = broader;
  }
  // Also handle case where league-scoped stats returned null entirely
  if (!homeStats && leagueId != null) {
    homeStats = safeStats(getTeamStats(homeTeamName, fixtureDate, { venue: "home" }));
  }
  if (!awayStats && leagueId != null) {
    awayStats = safeStats(getTeamStats(awayTeamName, fixtureDate, { venue: "away" }));
  }

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
  leagueId?: number,
  firstLegResult?: FirstLegResult,
): GoalLambdaComponents | null {
  const computed = computeGoalLambdaComponents(homeTeamName, awayTeamName, fixtureDate, leagueId, firstLegResult);
  return computed?.components ?? null;
}

