/**
 * Pre-compute Monte Carlo simulations for all upcoming fixtures.
 * Writes per-date JSON files to data/simulations/YYYY-MM-DD.json.
 *
 * Run: npx tsx scripts/run-simulations.mts
 */

import fs from "fs";
import path from "path";
import { estimateMatchGoalLambdas, estimateMatchCornerLambdas, debugGoalLambdaComponents } from "@/lib/modeling/baseline-params";
import { simulateMatch } from "@/lib/modeling/mc-engine";
import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import { applyCalibration } from "@/lib/modeling/calibration";
import { blendModelAndMarket } from "@/lib/modeling/odds-blend";
import { isCup } from "@/lib/leagues";
import { resolveProvider } from "@/lib/providers/registry";
import { extractMarketProbsFromApiFootball } from "@/lib/odds/api-football-odds";
import type { MarketProbabilities } from "@/lib/odds/the-odds-api";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import type { GoalLambdaComponents, MatchGoalLambdas, MatchCornerLambdas } from "@/lib/modeling/baseline-params";
import { findFirstLegResult } from "@/lib/modeling/first-leg-lookup";
import type { FirstLegResult } from "@/lib/modeling/first-leg-lookup";

const EV_THRESHOLD = 0.03;
const SIMULATIONS = 100_000;

interface UpcomingFixture {
  fixtureId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  leagueName?: string;
  round?: string;
  season: number;
  venue: string | null;
}

interface SimInputs {
  goalLambdas: MatchGoalLambdas;
  cornerLambdas: MatchCornerLambdas | null;
  components: GoalLambdaComponents | null;
  hasMarketProbs: boolean;
}

interface FixtureSimResult {
  sim: MatchSimulationResult;
  feedProbs: FeedModelProbs;
  inputs: SimInputs;
  meta: {
    fixtureId: number;
    homeTeam: string;
    awayTeam: string;
    leagueId: number;
    kickoffUtc: string;
  };
}

interface SimulationFile {
  generated_at: string;
  simulations_per_fixture: number;
  fixtures: Record<string, FixtureSimResult>;
}

function computeFeedProbs(
  sim: MatchSimulationResult,
  marketProbs: MarketProbabilities | null,
): { feedProbs: FeedModelProbs; hasMarketProbs: boolean } {

  // Apply calibration
  const rawModelProbs = {
    home: applyCalibration("1X2", "H", sim.pHomeWin),
    draw: applyCalibration("1X2", "D", sim.pDraw),
    away: applyCalibration("1X2", "A", sim.pAwayWin),
    over_2_5: applyCalibration("OU_2.5", "Over", sim.pO25),
    under_2_5: applyCalibration("OU_2.5", "Under", 1 - sim.pO25),
  };

  // Blend with market if available
  const blendedProbs = marketProbs
    ? blendModelAndMarket(rawModelProbs, marketProbs, {
        homeSampleSize: 38,
        awaySampleSize: 38,
      })
    : rawModelProbs;

  // Compute edges and EV flags
  const calibratedBtts = applyCalibration("BTTS", "Yes", sim.pBTTS);
  const edges = marketProbs
    ? {
        home: blendedProbs.home - marketProbs.home,
        draw: blendedProbs.draw - marketProbs.draw,
        away: blendedProbs.away - marketProbs.away,
        over_2_5: marketProbs.over_2_5
          ? (blendedProbs.over_2_5 ?? rawModelProbs.over_2_5) - marketProbs.over_2_5
          : undefined,
        btts: marketProbs.btts != null
          ? calibratedBtts - marketProbs.btts
          : undefined,
      }
    : undefined;

  const storedMarketProbs = marketProbs
    ? {
        home: marketProbs.home,
        draw: marketProbs.draw,
        away: marketProbs.away,
        over_2_5: marketProbs.over_2_5,
        btts: marketProbs.btts,
      }
    : undefined;

  const evFlags: string[] = [];
  if (edges) {
    if (edges.home > EV_THRESHOLD) evFlags.push("HOME");
    if (edges.draw > EV_THRESHOLD) evFlags.push("DRAW");
    if (edges.away > EV_THRESHOLD) evFlags.push("AWAY");
    if (edges.over_2_5 && edges.over_2_5 > EV_THRESHOLD) evFlags.push("O2.5");
    if (edges.btts && edges.btts > EV_THRESHOLD) evFlags.push("BTTS");
  }

  // Top 3 most likely scorelines
  const topScorelines = Object.entries(sim.scorelines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([score, count]) => ({ score, prob: count / sim.totalSimulations }));

  const feedProbs: FeedModelProbs = {
    home: blendedProbs.home,
    draw: blendedProbs.draw,
    away: blendedProbs.away,
    over_2_5: blendedProbs.over_2_5,
    btts: calibratedBtts,
    mcOver25: sim.pO25,
    mcBtts: sim.pBTTS,
    edges,
    evFlags: evFlags.length > 0 ? evFlags : undefined,
    marketProbs: storedMarketProbs,
    expectedHomeGoals: sim.expectedHomeGoals,
    expectedAwayGoals: sim.expectedAwayGoals,
    expectedHomeCorners: sim.expectedHomeCorners,
    expectedAwayCorners: sim.expectedAwayCorners,
    topScorelines,
  };

  return { feedProbs, hasMarketProbs: marketProbs != null };
}

async function main() {
  const upcomingPath = path.join(process.cwd(), "data", "upcoming-fixtures.json");
  if (!fs.existsSync(upcomingPath)) {
    console.error(`No upcoming fixtures found at ${upcomingPath}`);
    console.error("Run ingest-upcoming-fixtures.mjs first.");
    process.exit(1);
  }

  const fixtures: UpcomingFixture[] = JSON.parse(fs.readFileSync(upcomingPath, "utf-8"));
  console.log(`Loaded ${fixtures.length} upcoming fixtures`);

  // Resolve provider for odds fetching
  const { provider } = resolveProvider("api-football");

  // Group fixtures by date
  const byDate = new Map<string, UpcomingFixture[]>();
  for (const f of fixtures) {
    const date = f.date.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(f);
  }

  const simDir = path.join(process.cwd(), "data", "simulations");
  if (!fs.existsSync(simDir)) fs.mkdirSync(simDir, { recursive: true });

  let totalSimulated = 0;
  let totalSkipped = 0;

  for (const [date, dateFixtures] of byDate) {
    console.log(`\nProcessing ${date} (${dateFixtures.length} fixtures)...`);

    const output: SimulationFile = {
      generated_at: new Date().toISOString(),
      simulations_per_fixture: SIMULATIONS,
      fixtures: {},
    };

    for (const fixture of dateFixtures) {
      const fixtureDate = fixture.date.slice(0, 10);

      // Look up first-leg result for cup 2nd legs
      let firstLegResult: FirstLegResult | undefined;
      if (isCup(fixture.leagueId) && fixture.round) {
        firstLegResult = findFirstLegResult(
          fixture.leagueId, fixture.season, fixture.round,
          fixture.homeTeam, fixture.awayTeam, fixture.date
        ) ?? undefined;
      }

      // Estimate lambdas (scoped to the fixture's competition)
      const goalLambdas = estimateMatchGoalLambdas(fixture.homeTeam, fixture.awayTeam, fixtureDate, fixture.leagueId, firstLegResult);
      if (!goalLambdas) {
        console.log(`  [SKIP] ${fixture.homeTeam} v ${fixture.awayTeam} — no goal lambdas`);
        totalSkipped++;
        continue;
      }

      const cornerLambdas = estimateMatchCornerLambdas(fixture.homeTeam, fixture.awayTeam, fixtureDate, fixture.leagueId);
      const components = debugGoalLambdaComponents(fixture.homeTeam, fixture.awayTeam, fixtureDate, fixture.leagueId, firstLegResult);

      if (firstLegResult) {
        const { leg2HomeGoalsInLeg1, leg2AwayGoalsInLeg1, aggregateDeficit } = firstLegResult;
        const trailing = aggregateDeficit > 0 ? fixture.homeTeam : fixture.awayTeam;
        console.log(
          `  [2-LEG] ${fixture.homeTeam} v ${fixture.awayTeam} — ` +
            `1st leg: ${leg2AwayGoalsInLeg1}-${leg2HomeGoalsInLeg1}, ` +
            `${trailing} trails by ${Math.abs(aggregateDeficit)}`
        );
      }

      // Run simulation
      const sim = simulateMatch({
        lambdaHomeGoals: goalLambdas.lambdaHomeGoals,
        lambdaAwayGoals: goalLambdas.lambdaAwayGoals,
        lambdaHomeCorners: cornerLambdas?.lambdaHomeCorners,
        lambdaAwayCorners: cornerLambdas?.lambdaAwayCorners,
        simulations: SIMULATIONS,
        tempoStd: 0.15,
      });

      // Fetch odds from API-Football
      let marketProbs: MarketProbabilities | null = null;
      try {
        const oddsRes = await provider.getOdds(fixture.fixtureId);
        marketProbs = extractMarketProbsFromApiFootball(oddsRes);
      } catch {
        // Odds fetch failed — continue without
      }

      // Compute feed probs (calibrated, blended, with edges)
      const { feedProbs, hasMarketProbs } = computeFeedProbs(sim, marketProbs);

      const result: FixtureSimResult = {
        sim,
        feedProbs,
        inputs: {
          goalLambdas,
          cornerLambdas,
          components,
          hasMarketProbs,
        },
        meta: {
          fixtureId: fixture.fixtureId,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          leagueId: fixture.leagueId,
          kickoffUtc: fixture.date,
        },
      };

      output.fixtures[String(fixture.fixtureId)] = result;
      totalSimulated++;

      const evLabel = feedProbs.evFlags?.length ? ` [${feedProbs.evFlags.join(",")}]` : "";
      console.log(
        `  [OK] ${fixture.homeTeam} v ${fixture.awayTeam} — ` +
          `xG ${sim.expectedHomeGoals.toFixed(2)}-${sim.expectedAwayGoals.toFixed(2)}` +
          `${hasMarketProbs ? " (blended)" : ""}${evLabel}`,
      );
    }

    const outPath = path.join(simDir, `${date}.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`  Saved ${Object.keys(output.fixtures).length} simulations to ${outPath}`);
  }

  console.log(`\nDone: ${totalSimulated} simulated, ${totalSkipped} skipped`);
}

main().catch(console.error);
