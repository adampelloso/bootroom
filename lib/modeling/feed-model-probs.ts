/**
 * Compute model probabilities for feed matches.
 * Reads pre-computed simulations from disk (written by scripts/run-simulations.mts).
 * Falls back to runtime simulation if no pre-computed data exists.
 */

import type { FeedMatch } from "@/lib/feed";
import { getFeedModelProbsFromDisk } from "@/lib/modeling/sim-reader";
import { getOddsKeyForLeagueId } from "@/lib/leagues";
import { estimateMatchGoalLambdas, estimateMatchCornerLambdas } from "@/lib/modeling/baseline-params";
import { simulateMatch } from "@/lib/modeling/mc-engine";
import { applyCalibration } from "@/lib/modeling/calibration";
import { blendModelAndMarket } from "@/lib/modeling/odds-blend";
import { getMarketProbsForMatch } from "@/lib/odds/the-odds-api";

const EV_THRESHOLD = 0.03;

export interface FeedModelProbs {
  home: number;
  draw: number;
  away: number;
  over_2_5?: number;
  edges?: {
    home: number;
    draw: number;
    away: number;
    over_2_5?: number;
  };
  evFlags?: string[];
  expectedHomeGoals?: number;
  expectedAwayGoals?: number;
  expectedHomeCorners?: number;
  expectedAwayCorners?: number;
  topScorelines?: { score: string; prob: number }[];
}

const cache = new Map<string, FeedModelProbs>();

export function getFeedMatchModelProbs(match: FeedMatch): FeedModelProbs | null {
  const cacheKey = `${match.providerFixtureId}-${match.kickoffUtc}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Try pre-computed data from disk first
  const fromDisk = getFeedModelProbsFromDisk(match.providerFixtureId, match.kickoffUtc);
  if (fromDisk) {
    cache.set(cacheKey, fromDisk);
    return fromDisk;
  }

  // Fallback: runtime simulation (for dev/local when no pre-computed data)
  const fixtureDate = match.kickoffUtc?.slice(0, 10);
  const goalLambdas = estimateMatchGoalLambdas(match.homeTeamName, match.awayTeamName, fixtureDate);

  if (!goalLambdas) {
    return null;
  }

  const cornerLambdas = estimateMatchCornerLambdas(match.homeTeamName, match.awayTeamName, fixtureDate);

  const sim = simulateMatch({
    lambdaHomeGoals: goalLambdas.lambdaHomeGoals,
    lambdaAwayGoals: goalLambdas.lambdaAwayGoals,
    lambdaHomeCorners: cornerLambdas?.lambdaHomeCorners,
    lambdaAwayCorners: cornerLambdas?.lambdaAwayCorners,
    simulations: 10000,
    tempoStd: 0.15,
  });

  const oddsKey = match.leagueId != null ? getOddsKeyForLeagueId(match.leagueId) : null;
  const marketProbs =
    oddsKey != null
      ? getMarketProbsForMatch(
          oddsKey,
          match.homeTeamName,
          match.awayTeamName,
          match.kickoffUtc
        )
      : null;

  const rawModelProbs = {
    home: applyCalibration("1X2", "H", sim.pHomeWin),
    draw: applyCalibration("1X2", "D", sim.pDraw),
    away: applyCalibration("1X2", "A", sim.pAwayWin),
    over_2_5: applyCalibration("OU_2.5", "Over", sim.pO25),
    under_2_5: applyCalibration("OU_2.5", "Under", 1 - sim.pO25),
  };

  const blendedProbs = marketProbs
    ? blendModelAndMarket(rawModelProbs, marketProbs, {
        homeSampleSize: 38,
        awaySampleSize: 38,
      })
    : rawModelProbs;

  const edges = marketProbs
    ? {
        home: blendedProbs.home - marketProbs.home,
        draw: blendedProbs.draw - marketProbs.draw,
        away: blendedProbs.away - marketProbs.away,
        over_2_5: marketProbs.over_2_5
          ? (blendedProbs.over_2_5 ?? rawModelProbs.over_2_5) - marketProbs.over_2_5
          : undefined,
      }
    : undefined;

  const evFlags: string[] = [];
  if (edges) {
    if (edges.home > EV_THRESHOLD) evFlags.push("HOME");
    if (edges.draw > EV_THRESHOLD) evFlags.push("DRAW");
    if (edges.away > EV_THRESHOLD) evFlags.push("AWAY");
    if (edges.over_2_5 && edges.over_2_5 > EV_THRESHOLD) evFlags.push("O2.5");
  }

  const topScorelines = Object.entries(sim.scorelines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([score, count]) => ({ score, prob: count / sim.totalSimulations }));

  const result: FeedModelProbs = {
    home: blendedProbs.home,
    draw: blendedProbs.draw,
    away: blendedProbs.away,
    over_2_5: blendedProbs.over_2_5,
    edges,
    evFlags: evFlags.length > 0 ? evFlags : undefined,
    expectedHomeGoals: sim.expectedHomeGoals,
    expectedAwayGoals: sim.expectedAwayGoals,
    expectedHomeCorners: sim.expectedHomeCorners,
    expectedAwayCorners: sim.expectedAwayCorners,
    topScorelines,
  };

  cache.set(cacheKey, result);
  return result;
}
