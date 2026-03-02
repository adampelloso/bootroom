/**
 * Comprehensive backtesting framework for the Monte Carlo simulation engine.
 * Runs simulations on historical matches (without lookahead) and compares
 * predictions to actual results across multiple markets.
 *
 * Usage:
 *   npx tsx scripts/run-backtest.ts                           # all leagues/seasons
 *   npx tsx scripts/run-backtest.ts --league 39 --season 2023 # specific
 *   npx tsx scripts/run-backtest.ts --sims 50000 --seed 42    # control params
 *   npx tsx scripts/run-backtest.ts --verbose                  # per-match output
 */

import fs from "fs";
import path from "path";
import { estimateMatchGoalLambdas, estimateMatchCornerLambdas } from "@/lib/modeling/baseline-params";
import { simulateMatch } from "@/lib/modeling/mc-engine";
import { applyCalibration } from "@/lib/modeling/calibration";
import { isCup, getCompetitionByLeagueId } from "@/lib/leagues";

// ── Types ──────────────────────────────────────────────────────────────────

interface BacktestConfig {
  leagueId: number | null;
  season: number | null;
  simulations: number;
  seed: number;
  skipPerTeam: number;
  outputDir: string;
  verbose: boolean;
}

interface MatchResult {
  fixture_id: number;
  kickoff_utc: string;
  league_id: number;
  league_name: string;
  season: number;
  round: string;
  home_team: string;
  away_team: string;
  goals_home: number;
  goals_away: number;
  corners_home: number | null;
  corners_away: number | null;
  lambda_home: number;
  lambda_away: number;
  lambda_corners_home: number | null;
  lambda_corners_away: number | null;
  p_home_raw: number;
  p_draw_raw: number;
  p_away_raw: number;
  p_btts_raw: number;
  p_o25_raw: number;
  p_o35_raw: number;
  p_home: number;
  p_draw: number;
  p_away: number;
  p_btts: number;
  p_o25: number;
  xg_home: number;
  xg_away: number;
  xc_home: number | null;
  xc_away: number | null;
  result_1x2: "H" | "D" | "A";
  result_btts: boolean;
  result_o25: boolean;
  result_o35: boolean;
  result_corners_o105: boolean | null;
  correct_1x2: boolean;
  correct_btts: boolean;
  correct_o25: boolean;
  match_number: number;
  season_fraction: number;
}

interface CalibrationBucket {
  bucket_low: number;
  bucket_high: number;
  count: number;
  predicted_avg: number;
  actual_rate: number;
  deviation: number;
}

interface MarketMetrics {
  market: string;
  brier_score: number;
  brier_score_raw?: number;
  log_loss: number;
  accuracy: number;
  sample_size: number;
  calibration_buckets: CalibrationBucket[];
}

interface ROISimulation {
  market: string;
  threshold: number;
  bets: number;
  wins: number;
  hit_rate: number;
  roi_percent: number;
}

interface BacktestSummary {
  meta: {
    generated_at: string;
    leagues: { id: number; name: string }[];
    total_matches: number;
    skipped_early: number;
    failed_lambda: number;
    simulations_per_match: number;
    seed: number;
  };
  overall: {
    markets: MarketMetrics[];
    roi_simulation: ROISimulation[];
  };
  by_league: Record<string, { league_name: string; matches: number; markets: MarketMetrics[] }>;
  by_season_half: { first_half: MarketMetrics[]; second_half: MarketMetrics[] };
}

// ── Fixture loading ────────────────────────────────────────────────────────

interface IngestedEntry {
  fixture: {
    fixture: { id: number; date: string; status: { short: string } };
    league: { id: number; name: string; season: number; round: string };
    teams: { home: { id: number; name: string }; away: { id: number; name: string } };
    goals: { home: number | null; away: number | null };
  };
  stats?: Array<{
    team: { id: number; name: string };
    statistics: Array<{ type: string; value: number | string | null }>;
  }>;
}

interface FixtureFile {
  filePath: string;
  leagueId: number;
  season: number;
}

function discoverFixtureFiles(config: BacktestConfig): FixtureFile[] {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) return [];

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith("-fixtures.json"));
  const seen = new Map<string, FixtureFile>();

  for (const file of files) {
    let leagueId: number;
    let season: number;

    // Legacy naming: epl-2020-fixtures.json → league 39
    const legacyMatch = file.match(/^epl-(\d+)-fixtures\.json$/);
    if (legacyMatch) {
      leagueId = 39;
      season = parseInt(legacyMatch[1]);
    } else {
      // Standard naming: <leagueId>-<season>-fixtures.json
      const stdMatch = file.match(/^(\d+)-(\d+)-fixtures\.json$/);
      if (!stdMatch) continue;
      leagueId = parseInt(stdMatch[1]);
      season = parseInt(stdMatch[2]);
    }

    // Filter cups
    if (isCup(leagueId)) continue;

    // Apply CLI filters
    if (config.leagueId != null && leagueId !== config.leagueId) continue;
    if (config.season != null && season !== config.season) continue;

    // De-duplicate: prefer numeric-prefix format
    const key = `${leagueId}-${season}`;
    if (!seen.has(key) || !legacyMatch) {
      seen.set(key, { filePath: path.join(dataDir, file), leagueId, season });
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.leagueId - b.leagueId || a.season - b.season);
}

function loadFixtures(file: FixtureFile): IngestedEntry[] {
  const raw = fs.readFileSync(file.filePath, "utf8");
  const parsed = JSON.parse(raw) as IngestedEntry[];
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((e) => {
      const status = e.fixture?.fixture?.status?.short;
      const goals = e.fixture?.goals;
      return status === "FT" && goals?.home != null && goals?.away != null;
    })
    .sort((a, b) => {
      const da = new Date(a.fixture.fixture.date).getTime();
      const db = new Date(b.fixture.fixture.date).getTime();
      return da - db;
    });
}

/** Get a human-readable league name: SUPPORTED_COMPETITIONS label → fixture data → fallback */
function resolveLeagueName(leagueId: number, fixtures: IngestedEntry[]): string {
  const comp = getCompetitionByLeagueId(leagueId);
  if (comp) return comp.label;
  // Extract from first fixture's league data
  if (fixtures.length > 0) {
    const name = fixtures[0].fixture?.league?.name;
    if (name) return name;
  }
  return `League ${leagueId}`;
}

function extractCorners(
  stats: IngestedEntry["stats"],
  homeTeamId: number,
  awayTeamId: number
): { home: number; away: number } | null {
  if (!stats || stats.length === 0) return null;

  let homeCorners: number | null = null;
  let awayCorners: number | null = null;

  for (const teamStats of stats) {
    const teamId = teamStats.team?.id;
    for (const stat of teamStats.statistics ?? []) {
      if (stat.type === "Corner Kicks" && typeof stat.value === "number") {
        if (teamId === homeTeamId) homeCorners = stat.value;
        else if (teamId === awayTeamId) awayCorners = stat.value;
      }
    }
  }

  if (homeCorners == null || awayCorners == null) return null;
  return { home: homeCorners, away: awayCorners };
}

// ── Poisson CDF for corners ────────────────────────────────────────────────

function poissonCdf(k: number, lambda: number): number {
  if (lambda <= 0) return 1;
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= k; i++) {
    sum += term;
    if (i < k) term *= lambda / (i + 1);
  }
  return Math.min(sum, 1);
}

function pCornersOver(threshold: number, lambdaHome: number, lambdaAway: number): number {
  return 1 - poissonCdf(Math.floor(threshold), lambdaHome + lambdaAway);
}

// ── Metrics computation ────────────────────────────────────────────────────

const EPS = 1e-7;

function clampProb(p: number): number {
  return Math.max(EPS, Math.min(1 - EPS, p));
}

function brierScoreBinary(predictions: number[], outcomes: boolean[]): number {
  if (predictions.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < predictions.length; i++) {
    const o = outcomes[i] ? 1 : 0;
    sum += (predictions[i] - o) ** 2;
  }
  return sum / predictions.length;
}

function brierScore1X2(results: MatchResult[]): number {
  if (results.length === 0) return 0;
  let sum = 0;
  for (const r of results) {
    const oH = r.result_1x2 === "H" ? 1 : 0;
    const oD = r.result_1x2 === "D" ? 1 : 0;
    const oA = r.result_1x2 === "A" ? 1 : 0;
    sum += ((r.p_home - oH) ** 2 + (r.p_draw - oD) ** 2 + (r.p_away - oA) ** 2) / 3;
  }
  return sum / results.length;
}

function brierScore1X2Raw(results: MatchResult[]): number {
  if (results.length === 0) return 0;
  let sum = 0;
  for (const r of results) {
    const oH = r.result_1x2 === "H" ? 1 : 0;
    const oD = r.result_1x2 === "D" ? 1 : 0;
    const oA = r.result_1x2 === "A" ? 1 : 0;
    sum += ((r.p_home_raw - oH) ** 2 + (r.p_draw_raw - oD) ** 2 + (r.p_away_raw - oA) ** 2) / 3;
  }
  return sum / results.length;
}

function logLossBinary(predictions: number[], outcomes: boolean[]): number {
  if (predictions.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < predictions.length; i++) {
    const p = clampProb(predictions[i]);
    const o = outcomes[i] ? 1 : 0;
    sum += -(o * Math.log(p) + (1 - o) * Math.log(1 - p));
  }
  return sum / predictions.length;
}

function logLoss1X2(results: MatchResult[]): number {
  if (results.length === 0) return 0;
  let sum = 0;
  for (const r of results) {
    const pH = clampProb(r.p_home);
    const pD = clampProb(r.p_draw);
    const pA = clampProb(r.p_away);
    if (r.result_1x2 === "H") sum += -Math.log(pH);
    else if (r.result_1x2 === "D") sum += -Math.log(pD);
    else sum += -Math.log(pA);
  }
  return sum / results.length;
}

function accuracy1X2(results: MatchResult[]): number {
  if (results.length === 0) return 0;
  let correct = 0;
  for (const r of results) {
    const maxP = Math.max(r.p_home, r.p_draw, r.p_away);
    let predicted: "H" | "D" | "A";
    if (maxP === r.p_home) predicted = "H";
    else if (maxP === r.p_away) predicted = "A";
    else predicted = "D";
    if (predicted === r.result_1x2) correct++;
  }
  return correct / results.length;
}

function accuracyBinary(predictions: number[], outcomes: boolean[]): number {
  if (predictions.length === 0) return 0;
  let correct = 0;
  for (let i = 0; i < predictions.length; i++) {
    const predicted = predictions[i] >= 0.5;
    if (predicted === outcomes[i]) correct++;
  }
  return correct / predictions.length;
}

function calibrationBuckets(predictions: number[], outcomes: boolean[], numBuckets = 10): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];
  const step = 1 / numBuckets;

  for (let b = 0; b < numBuckets; b++) {
    const low = b * step;
    const high = (b + 1) * step;
    const indices: number[] = [];

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] >= low && (b === numBuckets - 1 ? predictions[i] <= high : predictions[i] < high)) {
        indices.push(i);
      }
    }

    if (indices.length === 0) continue;

    const predAvg = indices.reduce((s, i) => s + predictions[i], 0) / indices.length;
    const actRate = indices.reduce((s, i) => s + (outcomes[i] ? 1 : 0), 0) / indices.length;

    buckets.push({
      bucket_low: low,
      bucket_high: high,
      count: indices.length,
      predicted_avg: predAvg,
      actual_rate: actRate,
      deviation: actRate - predAvg,
    });
  }

  return buckets;
}

function computeMarketMetrics(results: MatchResult[], market: string): MarketMetrics {
  if (market === "1X2") {
    return {
      market,
      brier_score: brierScore1X2(results),
      brier_score_raw: brierScore1X2Raw(results),
      log_loss: logLoss1X2(results),
      accuracy: accuracy1X2(results),
      sample_size: results.length,
      // Calibration for 1X2 home win as representative
      calibration_buckets: calibrationBuckets(
        results.map((r) => r.p_home),
        results.map((r) => r.result_1x2 === "H")
      ),
    };
  }

  let predictions: number[];
  let outcomes: boolean[];
  let rawPredictions: number[] | undefined;

  if (market === "BTTS") {
    predictions = results.map((r) => r.p_btts);
    rawPredictions = results.map((r) => r.p_btts_raw);
    outcomes = results.map((r) => r.result_btts);
  } else if (market === "Over 2.5") {
    predictions = results.map((r) => r.p_o25);
    rawPredictions = results.map((r) => r.p_o25_raw);
    outcomes = results.map((r) => r.result_o25);
  } else if (market === "Over 3.5") {
    predictions = results.map((r) => r.p_o35_raw);
    outcomes = results.map((r) => r.result_o35);
  } else if (market === "Corners>10.5") {
    const withCorners = results.filter((r) => r.result_corners_o105 != null);
    predictions = withCorners.map((r) => {
      if (r.lambda_corners_home == null || r.lambda_corners_away == null) return 0.5;
      return pCornersOver(10.5, r.lambda_corners_home, r.lambda_corners_away);
    });
    outcomes = withCorners.map((r) => r.result_corners_o105!);
    const metrics: MarketMetrics = {
      market,
      brier_score: brierScoreBinary(predictions, outcomes),
      log_loss: logLossBinary(predictions, outcomes),
      accuracy: accuracyBinary(predictions, outcomes),
      sample_size: withCorners.length,
      calibration_buckets: calibrationBuckets(predictions, outcomes),
    };
    return metrics;
  } else {
    return { market, brier_score: 0, log_loss: 0, accuracy: 0, sample_size: 0, calibration_buckets: [] };
  }

  const metrics: MarketMetrics = {
    market,
    brier_score: brierScoreBinary(predictions, outcomes),
    log_loss: logLossBinary(predictions, outcomes),
    accuracy: accuracyBinary(predictions, outcomes),
    sample_size: predictions.length,
    calibration_buckets: calibrationBuckets(predictions, outcomes),
  };

  if (rawPredictions) {
    metrics.brier_score_raw = brierScoreBinary(rawPredictions, outcomes);
  }

  return metrics;
}

function computeROI(results: MatchResult[]): ROISimulation[] {
  const thresholds = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8];
  const sims: ROISimulation[] = [];

  for (const t of thresholds) {
    // 1X2 Home
    const homeQualified = results.filter((r) => r.p_home >= t);
    if (homeQualified.length > 0) {
      const wins = homeQualified.filter((r) => r.result_1x2 === "H").length;
      const hitRate = wins / homeQualified.length;
      sims.push({ market: "1X2-H", threshold: t, bets: homeQualified.length, wins, hit_rate: hitRate, roi_percent: (hitRate / t - 1) * 100 });
    }

    // 1X2 Away
    const awayQualified = results.filter((r) => r.p_away >= t);
    if (awayQualified.length > 0) {
      const wins = awayQualified.filter((r) => r.result_1x2 === "A").length;
      const hitRate = wins / awayQualified.length;
      sims.push({ market: "1X2-A", threshold: t, bets: awayQualified.length, wins, hit_rate: hitRate, roi_percent: (hitRate / t - 1) * 100 });
    }

    // BTTS Yes
    const bttsQualified = results.filter((r) => r.p_btts >= t);
    if (bttsQualified.length > 0) {
      const wins = bttsQualified.filter((r) => r.result_btts).length;
      const hitRate = wins / bttsQualified.length;
      sims.push({ market: "BTTS-Y", threshold: t, bets: bttsQualified.length, wins, hit_rate: hitRate, roi_percent: (hitRate / t - 1) * 100 });
    }

    // Over 2.5
    const o25Qualified = results.filter((r) => r.p_o25 >= t);
    if (o25Qualified.length > 0) {
      const wins = o25Qualified.filter((r) => r.result_o25).length;
      const hitRate = wins / o25Qualified.length;
      sims.push({ market: "O2.5", threshold: t, bets: o25Qualified.length, wins, hit_rate: hitRate, roi_percent: (hitRate / t - 1) * 100 });
    }
  }

  return sims;
}

// ── Main backtest loop ─────────────────────────────────────────────────────

function runBacktest(config: BacktestConfig): { results: MatchResult[]; skippedEarly: number; failedLambda: number } {
  const fixtureFiles = discoverFixtureFiles(config);
  if (fixtureFiles.length === 0) {
    console.error("No fixture files found matching filters.");
    process.exit(1);
  }

  // Pre-load all fixture sets and resolve league names
  const loadedFiles: { file: FixtureFile; fixtures: IngestedEntry[]; leagueName: string }[] = [];
  for (const f of fixtureFiles) {
    const fixtures = loadFixtures(f);
    const leagueName = resolveLeagueName(f.leagueId, fixtures);
    loadedFiles.push({ file: f, fixtures, leagueName });
  }

  console.error(`Found ${fixtureFiles.length} fixture file(s):`);
  for (const lf of loadedFiles) {
    console.error(`  ${lf.leagueName} ${lf.file.season}`);
  }
  console.error("");

  const results: MatchResult[] = [];
  let skippedEarly = 0;
  let failedLambda = 0;

  // Track per-team match count across all files (for cold-start guard)
  const teamMatchCounts = new Map<string, number>();
  const bumpTeam = (name: string) => teamMatchCounts.set(name, (teamMatchCounts.get(name) ?? 0) + 1);
  const getTeamCount = (name: string) => teamMatchCounts.get(name) ?? 0;

  for (const { file, fixtures, leagueName } of loadedFiles) {

    console.error(`\n${leagueName} ${file.season}: ${fixtures.length} finished matches`);

    for (let idx = 0; idx < fixtures.length; idx++) {
      const entry = fixtures[idx];
      const f = entry.fixture;
      const fixtureId = f.fixture.id;
      const fixtureDate = String(f.fixture.date).slice(0, 10);
      const homeTeam = f.teams.home.name;
      const awayTeam = f.teams.away.name;
      const homeTeamId = f.teams.home.id;
      const awayTeamId = f.teams.away.id;
      const goalsHome = f.goals.home!;
      const goalsAway = f.goals.away!;

      // Cold-start guard
      if (getTeamCount(homeTeam) < config.skipPerTeam || getTeamCount(awayTeam) < config.skipPerTeam) {
        bumpTeam(homeTeam);
        bumpTeam(awayTeam);
        skippedEarly++;
        continue;
      }

      // Estimate lambdas
      const goalLambdas = estimateMatchGoalLambdas(homeTeam, awayTeam, fixtureDate, file.leagueId);
      if (!goalLambdas) {
        failedLambda++;
        bumpTeam(homeTeam);
        bumpTeam(awayTeam);
        if (config.verbose) {
          console.error(`  [SKIP] Match ${idx + 1}/${fixtures.length}: ${homeTeam} v ${awayTeam} — no lambdas`);
        }
        continue;
      }

      const cornerLambdas = estimateMatchCornerLambdas(homeTeam, awayTeam, fixtureDate, file.leagueId);

      // Simulate
      const sim = simulateMatch({
        lambdaHomeGoals: goalLambdas.lambdaHomeGoals,
        lambdaAwayGoals: goalLambdas.lambdaAwayGoals,
        lambdaHomeCorners: cornerLambdas?.lambdaHomeCorners,
        lambdaAwayCorners: cornerLambdas?.lambdaAwayCorners,
        simulations: config.simulations,
        randomSeed: config.seed + fixtureId,
        tempoStd: 0.15,
      });

      // Calibrate
      const pHome = applyCalibration("1X2", "H", sim.pHomeWin);
      const pDraw = applyCalibration("1X2", "D", sim.pDraw);
      const pAway = applyCalibration("1X2", "A", sim.pAwayWin);
      const pO25 = applyCalibration("OU_2.5", "Over", sim.pO25);
      const pBtts = applyCalibration("BTTS", "Yes", sim.pBTTS);

      // Extract actuals
      const corners = extractCorners(entry.stats, homeTeamId, awayTeamId);
      const result1x2: "H" | "D" | "A" = goalsHome > goalsAway ? "H" : goalsHome < goalsAway ? "A" : "D";
      const resultBtts = goalsHome > 0 && goalsAway > 0;
      const resultO25 = goalsHome + goalsAway >= 3;
      const resultO35 = goalsHome + goalsAway >= 4;
      const resultCornersO105 = corners != null ? corners.home + corners.away > 10.5 : null;

      // Correctness
      const maxP = Math.max(pHome, pDraw, pAway);
      const predicted1x2 = maxP === pHome ? "H" : maxP === pAway ? "A" : "D";

      const matchResult: MatchResult = {
        fixture_id: fixtureId,
        kickoff_utc: f.fixture.date,
        league_id: file.leagueId,
        league_name: leagueName,
        season: file.season,
        round: f.league.round ?? "",
        home_team: homeTeam,
        away_team: awayTeam,
        goals_home: goalsHome,
        goals_away: goalsAway,
        corners_home: corners?.home ?? null,
        corners_away: corners?.away ?? null,
        lambda_home: goalLambdas.lambdaHomeGoals,
        lambda_away: goalLambdas.lambdaAwayGoals,
        lambda_corners_home: cornerLambdas?.lambdaHomeCorners ?? null,
        lambda_corners_away: cornerLambdas?.lambdaAwayCorners ?? null,
        p_home_raw: sim.pHomeWin,
        p_draw_raw: sim.pDraw,
        p_away_raw: sim.pAwayWin,
        p_btts_raw: sim.pBTTS,
        p_o25_raw: sim.pO25,
        p_o35_raw: sim.pO35,
        p_home: pHome,
        p_draw: pDraw,
        p_away: pAway,
        p_btts: pBtts,
        p_o25: pO25,
        xg_home: sim.expectedHomeGoals,
        xg_away: sim.expectedAwayGoals,
        xc_home: sim.expectedHomeCorners ?? null,
        xc_away: sim.expectedAwayCorners ?? null,
        result_1x2: result1x2,
        result_btts: resultBtts,
        result_o25: resultO25,
        result_o35: resultO35,
        result_corners_o105: resultCornersO105,
        correct_1x2: predicted1x2 === result1x2,
        correct_btts: (pBtts >= 0.5) === resultBtts,
        correct_o25: (pO25 >= 0.5) === resultO25,
        match_number: idx + 1,
        season_fraction: fixtures.length > 1 ? idx / (fixtures.length - 1) : 0,
      };

      results.push(matchResult);
      bumpTeam(homeTeam);
      bumpTeam(awayTeam);

      if (config.verbose) {
        const check = matchResult.correct_1x2 ? "✓" : "✗";
        console.error(
          `  [${check}] ${idx + 1}/${fixtures.length}: ${homeTeam} ${goalsHome}-${goalsAway} ${awayTeam}` +
            ` | xG ${sim.expectedHomeGoals.toFixed(2)}-${sim.expectedAwayGoals.toFixed(2)}` +
            ` | 1X2 ${(pHome * 100).toFixed(0)}/${(pDraw * 100).toFixed(0)}/${(pAway * 100).toFixed(0)}`
        );
      } else if ((idx + 1) % 50 === 0 || idx === fixtures.length - 1) {
        process.stderr.write(`  ${idx + 1}/${fixtures.length} matches processed\r`);
      }
    }

    console.error(""); // newline after progress
  }

  return { results, skippedEarly, failedLambda };
}

// ── Output generation ──────────────────────────────────────────────────────

function writeCSV(results: MatchResult[], outputPath: string): void {
  const headers = [
    "fixture_id", "kickoff_utc", "league_id", "league_name", "season", "round",
    "home_team", "away_team", "goals_home", "goals_away", "corners_home", "corners_away",
    "lambda_home", "lambda_away", "lambda_corners_home", "lambda_corners_away",
    "p_home_raw", "p_draw_raw", "p_away_raw", "p_btts_raw", "p_o25_raw", "p_o35_raw",
    "p_home", "p_draw", "p_away", "p_btts", "p_o25",
    "xg_home", "xg_away", "xc_home", "xc_away",
    "result_1x2", "result_btts", "result_o25", "result_o35", "result_corners_o105",
    "correct_1x2", "correct_btts", "correct_o25",
    "match_number", "season_fraction",
  ];

  const csvEscape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.join(",")];
  for (const r of results) {
    const row = [
      r.fixture_id, r.kickoff_utc, r.league_id, r.league_name, r.season, r.round,
      r.home_team, r.away_team, r.goals_home, r.goals_away, r.corners_home, r.corners_away,
      r.lambda_home.toFixed(4), r.lambda_away.toFixed(4),
      r.lambda_corners_home?.toFixed(4) ?? "", r.lambda_corners_away?.toFixed(4) ?? "",
      r.p_home_raw.toFixed(4), r.p_draw_raw.toFixed(4), r.p_away_raw.toFixed(4),
      r.p_btts_raw.toFixed(4), r.p_o25_raw.toFixed(4), r.p_o35_raw.toFixed(4),
      r.p_home.toFixed(4), r.p_draw.toFixed(4), r.p_away.toFixed(4), r.p_btts.toFixed(4), r.p_o25.toFixed(4),
      r.xg_home.toFixed(4), r.xg_away.toFixed(4),
      r.xc_home?.toFixed(4) ?? "", r.xc_away?.toFixed(4) ?? "",
      r.result_1x2, r.result_btts, r.result_o25, r.result_o35,
      r.result_corners_o105 ?? "",
      r.correct_1x2, r.correct_btts, r.correct_o25,
      r.match_number, r.season_fraction.toFixed(4),
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  fs.writeFileSync(outputPath, lines.join("\n") + "\n");
}

function buildSummary(
  results: MatchResult[],
  skippedEarly: number,
  failedLambda: number,
  config: BacktestConfig
): BacktestSummary {
  const markets = ["1X2", "BTTS", "Over 2.5", "Over 3.5", "Corners>10.5"];
  const overallMarkets = markets.map((m) => computeMarketMetrics(results, m));
  const roi = computeROI(results);

  // By league
  const byLeague: Record<string, { league_name: string; matches: number; markets: MarketMetrics[] }> = {};
  const leagueGroups = new Map<number, MatchResult[]>();
  for (const r of results) {
    if (!leagueGroups.has(r.league_id)) leagueGroups.set(r.league_id, []);
    leagueGroups.get(r.league_id)!.push(r);
  }
  for (const [lid, lr] of leagueGroups) {
    byLeague[String(lid)] = {
      league_name: lr[0].league_name,
      matches: lr.length,
      markets: markets.map((m) => computeMarketMetrics(lr, m)),
    };
  }

  // By season half
  const firstHalf = results.filter((r) => r.season_fraction < 0.5);
  const secondHalf = results.filter((r) => r.season_fraction >= 0.5);

  // Unique leagues
  const leagueIds = [...new Set(results.map((r) => r.league_id))];
  const leagueList = leagueIds.map((id) => ({
    id,
    name: results.find((r) => r.league_id === id)?.league_name ?? `League ${id}`,
  }));

  return {
    meta: {
      generated_at: new Date().toISOString(),
      leagues: leagueList,
      total_matches: results.length,
      skipped_early: skippedEarly,
      failed_lambda: failedLambda,
      simulations_per_match: config.simulations,
      seed: config.seed,
    },
    overall: { markets: overallMarkets, roi_simulation: roi },
    by_league: byLeague,
    by_season_half: {
      first_half: markets.map((m) => computeMarketMetrics(firstHalf, m)),
      second_half: markets.map((m) => computeMarketMetrics(secondHalf, m)),
    },
  };
}

// ── Console report ─────────────────────────────────────────────────────────

function pad(s: string, width: number, align: "left" | "right" = "left"): string {
  if (align === "right") return s.padStart(width);
  return s.padEnd(width);
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function printReport(summary: BacktestSummary): void {
  const { meta, overall, by_league, by_season_half } = summary;
  const leagueNames = meta.leagues.map((l) => l.name).join(", ");

  console.log("");
  console.log("=".repeat(65));
  console.log("  BOOTROOM BACKTEST REPORT");
  console.log(`  Generated: ${meta.generated_at.slice(0, 19).replace("T", " ")}`);
  console.log(`  Leagues: ${leagueNames}`);
  console.log(`  Matches: ${meta.total_matches} evaluated (${meta.skipped_early} skipped early, ${meta.failed_lambda} no lambdas)`);
  console.log(`  Sims/match: ${meta.simulations_per_match.toLocaleString()} | Seed: ${meta.seed}`);
  console.log("=".repeat(65));

  // Overall metrics
  console.log("\nOVERALL METRICS");
  console.log("-".repeat(65));
  console.log(
    `${pad("Market", 14)} ${pad("Brier", 8, "right")} ${pad("Raw", 8, "right")} ${pad("LogLoss", 8, "right")} ${pad("Accuracy", 9, "right")} ${pad("N", 6, "right")}`
  );
  console.log("-".repeat(65));
  for (const m of overall.markets) {
    const rawStr = m.brier_score_raw != null ? m.brier_score_raw.toFixed(3) : "—";
    console.log(
      `${pad(m.market, 14)} ${pad(m.brier_score.toFixed(3), 8, "right")} ${pad(rawStr, 8, "right")} ${pad(m.log_loss.toFixed(3), 8, "right")} ${pad(pct(m.accuracy), 9, "right")} ${pad(String(m.sample_size), 6, "right")}`
    );
  }

  // Calibration for 1X2 home win
  const cal1x2 = overall.markets.find((m) => m.market === "1X2");
  if (cal1x2 && cal1x2.calibration_buckets.length > 0) {
    console.log("\nCALIBRATION (1X2 — Home Win)");
    console.log("-".repeat(55));
    console.log(`${pad("Predicted", 12)} ${pad("Actual", 10, "right")} ${pad("Count", 8, "right")} ${pad("Deviation", 12, "right")}`);
    console.log("-".repeat(55));
    for (const b of cal1x2.calibration_buckets) {
      const label = `${(b.bucket_low * 100).toFixed(0)}-${(b.bucket_high * 100).toFixed(0)}%`;
      const dev = b.deviation >= 0 ? `+${(b.deviation * 100).toFixed(1)}%` : `${(b.deviation * 100).toFixed(1)}%`;
      console.log(
        `${pad(label, 12)} ${pad(pct(b.actual_rate), 10, "right")} ${pad(String(b.count), 8, "right")} ${pad(dev, 12, "right")}`
      );
    }
  }

  // Calibration for O2.5
  const calO25 = overall.markets.find((m) => m.market === "Over 2.5");
  if (calO25 && calO25.calibration_buckets.length > 0) {
    console.log("\nCALIBRATION (Over 2.5 Goals)");
    console.log("-".repeat(55));
    console.log(`${pad("Predicted", 12)} ${pad("Actual", 10, "right")} ${pad("Count", 8, "right")} ${pad("Deviation", 12, "right")}`);
    console.log("-".repeat(55));
    for (const b of calO25.calibration_buckets) {
      const label = `${(b.bucket_low * 100).toFixed(0)}-${(b.bucket_high * 100).toFixed(0)}%`;
      const dev = b.deviation >= 0 ? `+${(b.deviation * 100).toFixed(1)}%` : `${(b.deviation * 100).toFixed(1)}%`;
      console.log(
        `${pad(label, 12)} ${pad(pct(b.actual_rate), 10, "right")} ${pad(String(b.count), 8, "right")} ${pad(dev, 12, "right")}`
      );
    }
  }

  // ROI simulation
  if (overall.roi_simulation.length > 0) {
    console.log("\nROI SIMULATION (flat-stake, fair-value odds)");
    console.log("-".repeat(65));
    console.log(
      `${pad("Market", 10)} ${pad("Thresh", 8, "right")} ${pad("Bets", 6, "right")} ${pad("Wins", 6, "right")} ${pad("HitRate", 9, "right")} ${pad("ROI", 9, "right")}`
    );
    console.log("-".repeat(65));
    for (const r of overall.roi_simulation) {
      const roiStr = r.roi_percent >= 0 ? `+${r.roi_percent.toFixed(1)}%` : `${r.roi_percent.toFixed(1)}%`;
      console.log(
        `${pad(r.market, 10)} ${pad(pct(r.threshold), 8, "right")} ${pad(String(r.bets), 6, "right")} ${pad(String(r.wins), 6, "right")} ${pad(pct(r.hit_rate), 9, "right")} ${pad(roiStr, 9, "right")}`
      );
    }
  }

  // By league
  const leagueEntries = Object.entries(by_league);
  if (leagueEntries.length > 1) {
    console.log("\nBY LEAGUE");
    console.log("-".repeat(65));
    console.log(
      `${pad("League", 16)} ${pad("N", 6, "right")} ${pad("Brier-1X2", 10, "right")} ${pad("Acc-1X2", 9, "right")} ${pad("Brier-BTTS", 11, "right")} ${pad("Brier-O2.5", 11, "right")}`
    );
    console.log("-".repeat(65));
    for (const [, data] of leagueEntries) {
      const brier1x2 = data.markets.find((m) => m.market === "1X2")?.brier_score ?? 0;
      const acc1x2 = data.markets.find((m) => m.market === "1X2")?.accuracy ?? 0;
      const brierBtts = data.markets.find((m) => m.market === "BTTS")?.brier_score ?? 0;
      const brierO25 = data.markets.find((m) => m.market === "Over 2.5")?.brier_score ?? 0;
      console.log(
        `${pad(data.league_name, 16)} ${pad(String(data.matches), 6, "right")} ${pad(brier1x2.toFixed(3), 10, "right")} ${pad(pct(acc1x2), 9, "right")} ${pad(brierBtts.toFixed(3), 11, "right")} ${pad(brierO25.toFixed(3), 11, "right")}`
      );
    }
  }

  // Season half comparison
  const firstHalf1x2 = by_season_half.first_half.find((m) => m.market === "1X2");
  const secondHalf1x2 = by_season_half.second_half.find((m) => m.market === "1X2");
  if (firstHalf1x2 && secondHalf1x2 && firstHalf1x2.sample_size > 0 && secondHalf1x2.sample_size > 0) {
    console.log("\nSEASON-HALF COMPARISON");
    console.log("-".repeat(55));
    console.log(
      `${pad("Half", 10)} ${pad("Brier-1X2", 10, "right")} ${pad("Acc-1X2", 9, "right")} ${pad("N", 6, "right")}`
    );
    console.log("-".repeat(55));
    console.log(
      `${pad("First", 10)} ${pad(firstHalf1x2.brier_score.toFixed(3), 10, "right")} ${pad(pct(firstHalf1x2.accuracy), 9, "right")} ${pad(String(firstHalf1x2.sample_size), 6, "right")}`
    );
    console.log(
      `${pad("Second", 10)} ${pad(secondHalf1x2.brier_score.toFixed(3), 10, "right")} ${pad(pct(secondHalf1x2.accuracy), 9, "right")} ${pad(String(secondHalf1x2.sample_size), 6, "right")}`
    );
    const brierDelta = ((secondHalf1x2.brier_score - firstHalf1x2.brier_score) / firstHalf1x2.brier_score * 100);
    const accDelta = (secondHalf1x2.accuracy - firstHalf1x2.accuracy) * 100;
    const brierDir = brierDelta <= 0 ? `${brierDelta.toFixed(1)}%` : `+${brierDelta.toFixed(1)}%`;
    const accDir = accDelta >= 0 ? `+${accDelta.toFixed(1)}pp` : `${accDelta.toFixed(1)}pp`;
    console.log(`Change:    Brier ${brierDir}, Accuracy ${accDir}`);
  }

  console.log("");
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(): BacktestConfig {
  const args = process.argv.slice(2);
  const config: BacktestConfig = {
    leagueId: null,
    season: null,
    simulations: 50_000,
    seed: 42,
    skipPerTeam: 5,
    outputDir: path.join(process.cwd(), "data", "backtests"),
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--league":
        config.leagueId = parseInt(args[++i]);
        break;
      case "--season":
        config.season = parseInt(args[++i]);
        break;
      case "--sims":
        config.simulations = parseInt(args[++i]);
        break;
      case "--seed":
        config.seed = parseInt(args[++i]);
        break;
      case "--skip":
        config.skipPerTeam = parseInt(args[++i]);
        break;
      case "--verbose":
        config.verbose = true;
        break;
      case "--help":
        console.log(`Usage: npx tsx scripts/run-backtest.ts [options]

Options:
  --league <id>    Filter to specific league (e.g. 39 for EPL)
  --season <year>  Filter to specific season (e.g. 2023)
  --sims <count>   Simulations per match (default: 50000)
  --seed <number>  RNG seed for reproducibility (default: 42)
  --skip <n>       Min matches per team before evaluation (default: 5)
  --verbose        Print per-match details
  --help           Show this help`);
        process.exit(0);
    }
  }

  return config;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const config = parseArgs();

  console.error("Starting backtest...\n");
  const startTime = Date.now();

  const { results, skippedEarly, failedLambda } = runBacktest(config);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\nBacktest complete: ${results.length} matches in ${elapsed}s`);

  if (results.length === 0) {
    console.error("No matches evaluated. Check your filters and data.");
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Build summary
  const summary = buildSummary(results, skippedEarly, failedLambda, config);

  // Write CSV
  const csvPath = path.join(config.outputDir, "backtest-detailed.csv");
  writeCSV(results, csvPath);
  console.error(`CSV written to ${csvPath}`);

  // Write JSON summary
  const jsonPath = path.join(config.outputDir, "backtest-summary.json");
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.error(`Summary written to ${jsonPath}`);

  // Print console report
  printReport(summary);
}

main();
