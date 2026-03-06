/**
 * Player-level simulation module.
 * Distributes team-level outputs (expected goals, shots, assists) across
 * predicted starters using a smoothed propensity model:
 * - scorer propensity blends goals/shots/SOT + position prior + start certainty
 * - assist propensity blends assists/chance proxies + position prior + start certainty
 * - low-sample players are shrunk toward position priors (empirical-Bayes style)
 * - scorer constraints: GK <= 1% anytime scorer, outfield starters >= 1%
 */

import type { PredictedLineup, PredictedStarter, LineupConfidence } from "./predicted-lineup";
import { getTeamStats, getTeamPrimaryLeagueId } from "@/lib/insights/team-stats";
import { isCup } from "@/lib/leagues";

export interface PlayerSimResult {
  playerId: number;
  name: string;
  position: string | null;
  confidence: LineupConfidence;
  goalShare: number; // constrained expected-goal share of teamLambda
  anytimeScorerProb: number; // 1 - exp(-teamLambda * goalShare)
  anytimeAssistProb: number; // 1 - exp(-expectedAssists)
  expectedGoals: number; // teamLambda * goalShare
  expectedShots: number; // teamAvgShots * shotShare
  expectedSOT: number; // teamAvgSOT * sotShare
  expectedAssists: number; // teamLambda * assistShare * assistGoalRatio
}

export interface MatchPlayerSim {
  home: PlayerSimResult[];
  away: PlayerSimResult[];
}

export interface PlayerSimOptions {
  simulations?: number;
  randomSeed?: number;
  tempoStd?: number;
}

// Assist-to-goal ratio: ~0.6 in top leagues (assists per goal scored)
const ASSIST_GOAL_RATIO = 0.6;
const GOALKEEPER_MAX_SCORER_PROB = 0.01;
const OUTFIELD_MIN_SCORER_PROB = 0.01;
const GOALKEEPER_MAX_ASSIST_PROB = 0.01;

const SCORER_PRIOR_BY_POS: Record<string, number> = {
  Goalkeeper: 0.003,
  Defender: 0.03,
  Midfielder: 0.1,
  Attacker: 0.24,
};

const ASSIST_PRIOR_BY_POS: Record<string, number> = {
  Goalkeeper: 0.003,
  Defender: 0.05,
  Midfielder: 0.12,
  Attacker: 0.1,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function posKey(position: string | null): keyof typeof SCORER_PRIOR_BY_POS {
  if (position === "Goalkeeper" || position === "G") return "Goalkeeper";
  if (position === "Defender" || position === "D") return "Defender";
  if (position === "Midfielder" || position === "M") return "Midfielder";
  return "Attacker";
}

function isGoalkeeper(position: string | null): boolean {
  return posKey(position) === "Goalkeeper";
}

function probToLambda(prob: number): number {
  return -Math.log(Math.max(1e-9, 1 - clamp(prob, 0, 0.999999)));
}

function createRng(seed?: number): () => number {
  if (seed == null) return Math.random;
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-Math.max(0, lambda));
  let p = 1;
  let k = 0;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function sampleWeightedIndex(weights: number[], rng: () => number, excludeIdx: number = -1): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === excludeIdx) continue;
    total += Math.max(0, weights[i]);
  }
  if (total <= 0) return -1;
  const r = rng() * total;
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === excludeIdx) continue;
    cum += Math.max(0, weights[i]);
    if (r <= cum) return i;
  }
  return -1;
}

/**
 * Project a target vector onto a bounded simplex:
 *   minimize distortion from target shape, subject to:
 *   - sum(x) = total
 *   - lower[i] <= x[i] <= upper[i]
 */
function allocateWithBounds(
  target: number[],
  lowerIn: number[],
  upperIn: number[],
  total: number
): number[] {
  const n = target.length;
  if (n === 0 || total <= 0) return Array.from({ length: n }, () => 0);

  const lower = lowerIn.map((v) => Math.max(0, v));
  const upper = upperIn.map((v) => Math.max(0, v));
  const x = Array.from({ length: n }, () => 0);

  // Feasibility guards: if constraints are impossible, scale lower bounds down.
  const lowerSum = lower.reduce((a, b) => a + b, 0);
  if (lowerSum > total && lowerSum > 0) {
    const s = total / lowerSum;
    for (let i = 0; i < n; i++) lower[i] *= s;
  }
  const upperSum = upper.reduce((a, b) => a + b, 0);
  if (upperSum < total && upperSum > 0) {
    const s = total / upperSum;
    for (let i = 0; i < n; i++) upper[i] *= s;
  }

  const fixed = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (target[i] <= lower[i]) {
      x[i] = lower[i];
      fixed[i] = true;
    } else if (target[i] >= upper[i]) {
      x[i] = upper[i];
      fixed[i] = true;
    }
  }

  // Active-set reallocation loop.
  for (let iter = 0; iter < n + 5; iter++) {
    let fixedSum = 0;
    for (let i = 0; i < n; i++) {
      if (fixed[i]) fixedSum += x[i];
    }
    const remaining = Math.max(0, total - fixedSum);
    const active: number[] = [];
    let activeWeight = 0;
    for (let i = 0; i < n; i++) {
      if (!fixed[i]) {
        active.push(i);
        activeWeight += Math.max(target[i], 1e-9);
      }
    }

    if (active.length === 0) break;
    let changed = false;
    for (const i of active) {
      const w = Math.max(target[i], 1e-9);
      const proposed = remaining * (w / activeWeight);
      if (proposed < lower[i]) {
        x[i] = lower[i];
        fixed[i] = true;
        changed = true;
      } else if (proposed > upper[i]) {
        x[i] = upper[i];
        fixed[i] = true;
        changed = true;
      } else {
        x[i] = proposed;
      }
    }

    if (!changed) break;
  }

  // Last-step normalization safety.
  const sum = x.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    const s = total / sum;
    for (let i = 0; i < n; i++) {
      x[i] = clamp(x[i] * s, lower[i], upper[i]);
    }
  }

  return x;
}

function simulatePlayerGoals(
  starters: PredictedStarter[],
  teamLambda: number,
  teamAvgShots: number,
  teamAvgSOT: number,
  options?: PlayerSimOptions
): PlayerSimResult[] {
  const simulations = Math.max(1000, options?.simulations ?? 100000);
  const rng = createRng(options?.randomSeed);
  const tempoStd = Math.max(0, options?.tempoStd ?? 0.15);
  const totalShots = starters.reduce((sum, p) => sum + p.seasonShots, 0);
  const totalSOT = starters.reduce((sum, p) => sum + p.seasonSOT, 0);

  const scorerTargets: number[] = [];
  const assistTargets: number[] = [];

  for (const p of starters) {
    const pos = posKey(p.position);
    const apps = Math.max(1, p.appearances || 1);
    const goals90 = p.goalsPerGame > 0 ? p.goalsPerGame : p.seasonGoals / apps;
    const assists90 = p.assistsPerGame > 0 ? p.assistsPerGame : p.seasonAssists / apps;
    const shots90 = p.shotsPerGame > 0 ? p.shotsPerGame : p.seasonShots / apps;
    const sot90 = apps > 0 ? p.seasonSOT / apps : 0;
    const reliability = clamp(apps / (apps + 8), 0, 0.95);
    const startBoost = 0.75 + 0.5 * clamp(p.startRate, 0, 1);

    const scorerObserved =
      0.55 * goals90 +
      0.30 * (sot90 * 0.28) +
      0.15 * (shots90 * 0.08);
    const scorerSmoothed =
      reliability * scorerObserved +
      (1 - reliability) * SCORER_PRIOR_BY_POS[pos];
    scorerTargets.push(Math.max(1e-6, scorerSmoothed * startBoost));

    const assistObserved =
      0.6 * assists90 +
      0.25 * (shots90 * 0.04) +
      0.15 * (sot90 * 0.05);
    const assistSmoothed =
      reliability * assistObserved +
      (1 - reliability) * ASSIST_PRIOR_BY_POS[pos];
    assistTargets.push(Math.max(1e-6, assistSmoothed * startBoost));
  }

  const scorerTargetSum = scorerTargets.reduce((a, b) => a + b, 0);
  const scorerRawX = scorerTargets.map((v) =>
    scorerTargetSum > 0 ? (teamLambda * v) / scorerTargetSum : teamLambda / starters.length
  );
  const scorerLower = starters.map((p) =>
    isGoalkeeper(p.position) ? 0 : probToLambda(OUTFIELD_MIN_SCORER_PROB)
  );
  const scorerUpper = starters.map((p) =>
    isGoalkeeper(p.position) ? probToLambda(GOALKEEPER_MAX_SCORER_PROB) : Number.POSITIVE_INFINITY
  );
  const constrainedScorerX = allocateWithBounds(
    scorerRawX,
    scorerLower,
    scorerUpper,
    Math.max(0, teamLambda)
  );

  const teamAssistLambda = Math.max(0, teamLambda * ASSIST_GOAL_RATIO);
  const assistTargetSum = assistTargets.reduce((a, b) => a + b, 0);
  const assistRawX = assistTargets.map((v) =>
    assistTargetSum > 0 ? (teamAssistLambda * v) / assistTargetSum : teamAssistLambda / starters.length
  );
  const assistLower = starters.map(() => 0);
  const assistUpper = starters.map((p) =>
    isGoalkeeper(p.position) ? probToLambda(GOALKEEPER_MAX_ASSIST_PROB) : Number.POSITIVE_INFINITY
  );
  const constrainedAssistX = allocateWithBounds(
    assistRawX,
    assistLower,
    assistUpper,
    teamAssistLambda
  );

  const scorerWeightSum = constrainedScorerX.reduce((a, b) => a + b, 0);
  const assistWeightSum = constrainedAssistX.reduce((a, b) => a + b, 0);
  const scorerWeights = constrainedScorerX.map((x) => (scorerWeightSum > 0 ? x / scorerWeightSum : 1 / starters.length));
  const assistWeights = constrainedAssistX.map((x) => (assistWeightSum > 0 ? x / assistWeightSum : 1 / starters.length));

  const goalHits = new Array<number>(starters.length).fill(0);
  const assistHits = new Array<number>(starters.length).fill(0);
  const goalSums = new Array<number>(starters.length).fill(0);
  const assistSums = new Array<number>(starters.length).fill(0);

  for (let simIdx = 0; simIdx < simulations; simIdx++) {
    let scale = 1;
    if (tempoStd > 0) {
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      scale = Math.max(0.25, 1 + z0 * tempoStd);
    }
    const teamGoals = samplePoisson(Math.max(0, teamLambda) * scale, rng);
    if (teamGoals <= 0) continue;

    const scoredThisSim = new Array<boolean>(starters.length).fill(false);
    const assistedThisSim = new Array<boolean>(starters.length).fill(false);

    for (let g = 0; g < teamGoals; g++) {
      const scorerIdx = sampleWeightedIndex(scorerWeights, rng);
      if (scorerIdx < 0) continue;
      goalSums[scorerIdx] += 1;
      scoredThisSim[scorerIdx] = true;

      if (rng() < ASSIST_GOAL_RATIO) {
        const assistIdx = sampleWeightedIndex(assistWeights, rng, scorerIdx);
        if (assistIdx >= 0) {
          assistSums[assistIdx] += 1;
          assistedThisSim[assistIdx] = true;
        }
      }
    }

    for (let i = 0; i < starters.length; i++) {
      if (scoredThisSim[i]) goalHits[i] += 1;
      if (assistedThisSim[i]) assistHits[i] += 1;
    }
  }

  return starters.map((p, idx): PlayerSimResult => {
    const shotShare = totalShots > 0 ? p.seasonShots / totalShots : 1 / Math.max(1, starters.length);
    const sotShare = totalSOT > 0 ? p.seasonSOT / totalSOT : 1 / Math.max(1, starters.length);
    const playerExpectedGoals = goalSums[idx] / simulations;
    const expectedAssists = assistSums[idx] / simulations;
    let anytimeScorerProb = goalHits[idx] / simulations;
    let anytimeAssistProb = assistHits[idx] / simulations;

    if (isGoalkeeper(p.position)) {
      anytimeScorerProb = Math.min(anytimeScorerProb, GOALKEEPER_MAX_SCORER_PROB);
      anytimeAssistProb = Math.min(anytimeAssistProb, GOALKEEPER_MAX_ASSIST_PROB);
    } else {
      anytimeScorerProb = Math.max(anytimeScorerProb, OUTFIELD_MIN_SCORER_PROB);
    }
    const goalShare = teamLambda > 0 ? playerExpectedGoals / teamLambda : 0;

    return {
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      confidence: p.confidence,
      goalShare,
      anytimeScorerProb,
      anytimeAssistProb,
      expectedGoals: playerExpectedGoals,
      expectedShots: teamAvgShots * shotShare,
      expectedSOT: teamAvgSOT * sotShare,
      expectedAssists,
    };
  });
}

/**
 * Produce player-level sim results for both teams.
 *
 * @param homeLineup - Predicted lineup for home team
 * @param awayLineup - Predicted lineup for away team
 * @param homeLambda - Expected home goals from MC engine
 * @param awayLambda - Expected away goals from MC engine
 * @param fixtureDate - ISO date string
 * @param leagueId - League ID for stats lookup
 */
export function getMatchPlayerSim(
  homeLineup: PredictedLineup,
  awayLineup: PredictedLineup,
  homeLambda: number,
  awayLambda: number,
  fixtureDate?: string,
  leagueId?: number,
  options?: PlayerSimOptions
): MatchPlayerSim {
  // Get team rolling stats for shots/SOT baselines
  const useCupFallback = leagueId != null && isCup(leagueId);

  function getTeamShotBaselines(teamName: string) {
    const statsLeagueId = useCupFallback
      ? getTeamPrimaryLeagueId(teamName, fixtureDate) ?? leagueId
      : leagueId;
    const stats = getTeamStats(teamName, fixtureDate, {
      venue: "all",
      leagueId: statsLeagueId,
    });
    if (!stats || stats.season.matchCount === 0) {
      return { avgShots: 12, avgSOT: 4 }; // league-average fallback
    }
    return {
      avgShots: stats.season.shotsFor,
      avgSOT: stats.season.sotFor,
    };
  }

  const homeBaselines = getTeamShotBaselines(homeLineup.teamName);
  const awayBaselines = getTeamShotBaselines(awayLineup.teamName);

  const home = simulatePlayerGoals(
    homeLineup.starters,
    homeLambda,
    homeBaselines.avgShots,
    homeBaselines.avgSOT,
    options
  );

  const away = simulatePlayerGoals(
    awayLineup.starters,
    awayLambda,
    awayBaselines.avgShots,
    awayBaselines.avgSOT,
    options
  );

  return { home, away };
}
