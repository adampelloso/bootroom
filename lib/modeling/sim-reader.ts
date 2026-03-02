/**
 * Read pre-computed MC simulation results from disk or Cloudflare KV.
 * Files are written by scripts/run-simulations.mts to data/simulations/YYYY-MM-DD.json.
 * On Workers: reads from KV key `sims:{YYYY-MM-DD}`.
 */

import fs from "fs";
import path from "path";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { applyCalibration } from "@/lib/modeling/calibration";
import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { GoalLambdaComponents, MatchGoalLambdas, MatchCornerLambdas } from "@/lib/modeling/baseline-params";
import { kvGet } from "@/lib/kv";

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

// Module-level cache: date string → parsed file
const fileCache = new Map<string, SimulationFile | null>();

/**
 * Preload simulation data from KV for given dates.
 * Call before getFeedModelProbsFromDisk to ensure KV data is in cache.
 * No-op on local dev (KV returns null).
 */
export async function preloadSimulations(dates: string[]): Promise<void> {
  const missing = dates.filter((d) => !fileCache.has(d));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (date) => {
      const data = await kvGet<SimulationFile>(`sims:${date}`);
      if (data) {
        fileCache.set(date, data);
      }
    }),
  );
}

function loadSimFile(date: string): SimulationFile | null {
  if (fileCache.has(date)) {
    return fileCache.get(date)!;
  }

  const filePath = path.join(process.cwd(), "data", "simulations", `${date}.json`);
  if (!fs.existsSync(filePath)) {
    fileCache.set(date, null);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: SimulationFile = JSON.parse(raw);
    fileCache.set(date, parsed);
    return parsed;
  } catch {
    fileCache.set(date, null);
    return null;
  }
}

/**
 * Get pre-computed FeedModelProbs for a fixture.
 * Used by feed-model-probs.ts as a replacement for runtime simulation.
 */
export function getFeedModelProbsFromDisk(
  fixtureId: number | string,
  kickoffUtc: string,
): FeedModelProbs | null {
  const date = kickoffUtc?.slice(0, 10);
  if (!date) return null;

  const simFile = loadSimFile(date);
  if (!simFile) return null;

  const entry = simFile.fixtures[String(fixtureId)];
  if (!entry) return null;
  // Backfill mcOver25/mcBtts from raw sim data if not already in feedProbs
  if (entry.feedProbs.mcOver25 == null && entry.sim?.pO25 != null) {
    entry.feedProbs.mcOver25 = entry.sim.pO25;
  }
  if (entry.feedProbs.mcBtts == null && entry.sim?.pBTTS != null) {
    entry.feedProbs.mcBtts = entry.sim.pBTTS;
  }
  if (entry.feedProbs.btts == null && entry.sim?.pBTTS != null) {
    entry.feedProbs.btts = applyCalibration("BTTS", "Yes", entry.sim.pBTTS);
  }
  return entry.feedProbs;
}

/**
 * Get full pre-computed simulation data for a fixture.
 * Used by the sim page for detailed display.
 */
export function getPrecomputedSim(
  fixtureId: number | string,
  kickoffUtc: string,
): FixtureSimResult | null {
  const date = kickoffUtc?.slice(0, 10);
  if (!date) return null;

  const simFile = loadSimFile(date);
  if (!simFile) return null;

  return simFile.fixtures[String(fixtureId)] ?? null;
}
