import fs from "fs";
import path from "path";
import { estimateMatchGoalLambdas } from "@/lib/modeling/baseline-params";
import { simulateMatch } from "@/lib/modeling/mc-engine";

type IngestedFixture = {
  fixture: {
    fixture: { date: string };
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
    status?: { short?: string };
  };
};

export interface EvaluationSummary {
  matchesEvaluated: number;
  meanBrier1X2: number;
}

export interface MultiSeasonEvaluation {
  seasons: number[];
  perSeason: Record<number, EvaluationSummary>;
  aggregate: EvaluationSummary;
}

function loadSeasonFixtures(season: number): IngestedFixture[] {
  const dataDir = path.join(process.cwd(), "data");
  const filename = `epl-${season}-fixtures.json`;
  const fullPath = path.join(dataDir, filename);
  if (!fs.existsSync(fullPath)) return [];
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as IngestedFixture[];
}

function brierScore(probs: [number, number, number], outcome: [number, number, number]): number {
  const [p1, pX, p2] = probs;
  const [o1, oX, o2] = outcome;
  return ((p1 - o1) ** 2 + (pX - oX) ** 2 + (p2 - o2) ** 2) / 3;
}

function evaluateBaselineOnSeasonInternal(
  season: number,
  options?: { maxMatches?: number; simulations?: number; scaleHome?: number; scaleAway?: number }
): EvaluationSummary {
  const fixtures = loadSeasonFixtures(season);
  if (fixtures.length === 0) {
    return { matchesEvaluated: 0, meanBrier1X2: 0 };
  }

  const maxMatches = options?.maxMatches ?? 500;
  const simulations = options?.simulations ?? 20000;
  const scaleHome = options?.scaleHome ?? 1;
  const scaleAway = options?.scaleAway ?? 1;

  let totalBrier = 0;
  let count = 0;

  for (const entry of fixtures) {
    if (count >= maxMatches) break;

    const f = entry.fixture;
    const status = (f as any).fixture?.status?.short ?? (f.status?.short ?? "");
    const goals = f.goals;

    if (status !== "FT" || goals.home == null || goals.away == null) continue;

    const date = (f as any).fixture?.date ?? "";
    const fixtureDate = date ? String(date).slice(0, 10) : undefined;
    const homeTeam = f.teams.home.name;
    const awayTeam = f.teams.away.name;

    const lambdas = estimateMatchGoalLambdas(homeTeam, awayTeam, fixtureDate, 39 /* EPL */);
    if (!lambdas) continue;

    const sim = simulateMatch({
      lambdaHomeGoals: lambdas.lambdaHomeGoals * scaleHome,
      lambdaAwayGoals: lambdas.lambdaAwayGoals * scaleAway,
      simulations,
    });

    const p1 = sim.pHomeWin;
    const pX = sim.pDraw;
    const p2 = sim.pAwayWin;

    let outcome: [number, number, number];
    if (goals.home > goals.away) outcome = [1, 0, 0];
    else if (goals.home === goals.away) outcome = [0, 1, 0];
    else outcome = [0, 0, 1];

    totalBrier += brierScore([p1, pX, p2], outcome);
    count += 1;
  }

  return {
    matchesEvaluated: count,
    meanBrier1X2: count > 0 ? totalBrier / count : 0,
  };
}

/**
 * Public helper: evaluate baseline on a single season with default scaling.
 */
export function evaluateBaselineOnSeason(
  season: number,
  options?: { maxMatches?: number; simulations?: number }
): EvaluationSummary {
  return evaluateBaselineOnSeasonInternal(season, options);
}

/**
 * Evaluate across multiple seasons and search over a small grid of
 * global scaling factors for home/away λ to improve calibration.
 */
export function calibrateGoalScales(
  seasons: number[],
  options?: { maxMatchesPerSeason?: number; simulations?: number }
): {
  bestScaleHome: number;
  bestScaleAway: number;
  evaluation: MultiSeasonEvaluation;
} {
  const maxMatches = options?.maxMatchesPerSeason ?? 400;
  const simulations = options?.simulations ?? 15000;

  const scaleCandidates = [0.9, 1.0, 1.1];

  let bestScaleHome = 1;
  let bestScaleAway = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestEval: MultiSeasonEvaluation | null = null;

  for (const sh of scaleCandidates) {
    for (const sa of scaleCandidates) {
      const perSeason: Record<number, EvaluationSummary> = {};
      let totalMatches = 0;
      let totalWeightedBrier = 0;

      for (const season of seasons) {
        const summary = evaluateBaselineOnSeasonInternal(season, {
          maxMatches,
          simulations,
          scaleHome: sh,
          scaleAway: sa,
        });
        perSeason[season] = summary;
        totalMatches += summary.matchesEvaluated;
        totalWeightedBrier += summary.meanBrier1X2 * summary.matchesEvaluated;
      }

      const aggregate: EvaluationSummary = {
        matchesEvaluated: totalMatches,
        meanBrier1X2: totalMatches > 0 ? totalWeightedBrier / totalMatches : 0,
      };

      if (aggregate.meanBrier1X2 < bestScore) {
        bestScore = aggregate.meanBrier1X2;
        bestScaleHome = sh;
        bestScaleAway = sa;
        bestEval = { seasons, perSeason, aggregate };
      }
    }
  }

  return {
    bestScaleHome,
    bestScaleAway,
    evaluation:
      bestEval ??
      ({
        seasons,
        perSeason: {},
        aggregate: { matchesEvaluated: 0, meanBrier1X2: 0 },
      } as MultiSeasonEvaluation),
  };
}

