/**
 * Regenerate calibration-data.json from backtest results.
 * Uses smoothed binning (pool-adjacent-violators + interpolation)
 * to produce monotonic, fine-grained calibration curves.
 *
 * Usage: npx tsx scripts/regenerate-calibration.ts
 */

import fs from "fs";
import path from "path";

interface CalibrationTable {
  markets: {
    [market: string]: {
      [outcome: string]: {
        xs: number[];
        ys: number[];
      };
    };
  };
}

// Load backtest CSV
function loadBacktestCSV(): Record<string, string>[] {
  const csvPath = path.join(process.cwd(), "data", "backtests", "backtest-detailed.csv");
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = vals[i]));
    return obj;
  });
}

// Pool Adjacent Violators Algorithm — ensures monotonic calibration
function poolAdjacentViolators(xs: number[], ys: number[], weights: number[]): number[] {
  const n = xs.length;
  if (n === 0) return [];

  // Sort by xs
  const indices = Array.from({ length: n }, (_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const sortedY = indices.map((i) => ys[i]);
  const sortedW = indices.map((i) => weights[i]);

  // PAV algorithm
  const result = [...sortedY];
  const w = [...sortedW];
  const blockStart: number[] = Array.from({ length: n }, (_, i) => i);
  const blockEnd: number[] = Array.from({ length: n }, (_, i) => i);

  let i = 0;
  while (i < n - 1) {
    // Find the next violation (result[i] > result[i+1] for isotonic increasing)
    if (result[i] > result[i + 1]) {
      // Merge blocks
      const start = blockStart[i];
      const end = blockEnd[i + 1];

      // Compute weighted average for merged block
      let sumWY = 0;
      let sumW = 0;
      for (let j = start; j <= end; j++) {
        sumWY += result[j] * w[j];
        sumW += w[j];
      }
      const avg = sumWY / sumW;

      // Set all in merged block to average
      for (let j = start; j <= end; j++) {
        result[j] = avg;
        blockStart[j] = start;
        blockEnd[j] = end;
      }

      // Back up to check for new violations
      if (start > 0) {
        i = blockStart[start - 1];
      }
    } else {
      i = blockEnd[i] + 1;
    }
  }

  // Unsort back to original order
  const final = new Array(n);
  for (let j = 0; j < n; j++) {
    final[indices[j]] = result[j];
  }
  return final;
}

// Fit calibration curve for a binary outcome
function fitCalibration(
  rawPredictions: number[],
  outcomes: boolean[],
  numBins: number = 50
): { xs: number[]; ys: number[] } {
  if (rawPredictions.length === 0) return { xs: [0, 1], ys: [0, 1] };

  // Sort by prediction
  const paired = rawPredictions.map((p, i) => ({ pred: p, outcome: outcomes[i] ? 1 : 0 }));
  paired.sort((a, b) => a.pred - b.pred);

  // Bin into groups with roughly equal counts
  const binSize = Math.max(1, Math.floor(paired.length / numBins));
  const binXs: number[] = [];
  const binYs: number[] = [];
  const binWs: number[] = [];

  for (let i = 0; i < paired.length; i += binSize) {
    const end = Math.min(i + binSize, paired.length);
    const slice = paired.slice(i, end);
    const avgPred = slice.reduce((s, d) => s + d.pred, 0) / slice.length;
    const avgOutcome = slice.reduce((s, d) => s + d.outcome, 0) / slice.length;
    binXs.push(avgPred);
    binYs.push(avgOutcome);
    binWs.push(slice.length);
  }

  // Apply PAV for monotonicity
  const monotoneYs = poolAdjacentViolators(binXs, binYs, binWs);

  // Generate fine-grained output points via linear interpolation
  const outputXs: number[] = [];
  const outputYs: number[] = [];

  // Ensure we cover 0 to 1
  const allXs = [0, ...binXs, 1];
  const allYs = [Math.max(0, monotoneYs[0] - binXs[0] * (monotoneYs[1] - monotoneYs[0]) / (binXs[1] - binXs[0] + 0.001)),
    ...monotoneYs,
    Math.min(1, monotoneYs[monotoneYs.length - 1] + (1 - binXs[binXs.length - 1]) * (monotoneYs[monotoneYs.length - 1] - monotoneYs[monotoneYs.length - 2]) / (binXs[binXs.length - 1] - binXs[binXs.length - 2] + 0.001))];

  // Clamp edge values
  allYs[0] = Math.max(0, Math.min(1, allYs[0]));
  allYs[allYs.length - 1] = Math.max(0, Math.min(1, allYs[allYs.length - 1]));

  // Generate 101 evenly-spaced output points
  for (let i = 0; i <= 100; i++) {
    const x = i / 100;
    outputXs.push(x);

    // Find surrounding points for interpolation
    let lo = 0;
    for (let j = 0; j < allXs.length - 1; j++) {
      if (allXs[j] <= x) lo = j;
    }
    const hi = Math.min(lo + 1, allXs.length - 1);

    if (lo === hi || allXs[hi] === allXs[lo]) {
      outputYs.push(Math.max(0, Math.min(1, allYs[lo])));
    } else {
      const t = (x - allXs[lo]) / (allXs[hi] - allXs[lo]);
      const y = allYs[lo] + t * (allYs[hi] - allYs[lo]);
      outputYs.push(Math.max(0, Math.min(1, y)));
    }
  }

  return { xs: outputXs, ys: outputYs };
}

function main() {
  console.log("Loading backtest results...");
  const rows = loadBacktestCSV();
  console.log(`${rows.length} matches loaded\n`);

  const calibration: CalibrationTable = { markets: {} };

  // 1X2 calibration (H, D, A)
  console.log("Fitting 1X2 calibration curves...");
  const rawH = rows.map((r) => parseFloat(r.p_home_raw));
  const rawD = rows.map((r) => parseFloat(r.p_draw_raw));
  const rawA = rows.map((r) => parseFloat(r.p_away_raw));
  const outH = rows.map((r) => r.result_1x2 === "H");
  const outD = rows.map((r) => r.result_1x2 === "D");
  const outA = rows.map((r) => r.result_1x2 === "A");

  const calH = fitCalibration(rawH, outH);
  const calD = fitCalibration(rawD, outD);
  const calA = fitCalibration(rawA, outA);

  calibration.markets["1X2"] = { H: calH, D: calD, A: calA };

  // Diagnostic: show sample points
  for (const [label, cal] of [["H", calH], ["D", calD], ["A", calA]] as const) {
    console.log(`  ${label}: ${cal.xs.length} points`);
    // Show a few sample points
    for (const x of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
      const idx = Math.round(x * 100);
      if (idx < cal.ys.length) {
        console.log(`    raw ${(x * 100).toFixed(0)}% → calibrated ${(cal.ys[idx] * 100).toFixed(1)}%`);
      }
    }
  }

  // O/U 2.5 calibration
  console.log("\nFitting O/U 2.5 calibration curves...");
  const rawO25 = rows.map((r) => parseFloat(r.p_o25_raw));
  const outO25 = rows.map((r) => r.result_o25 === "true");
  const rawU25 = rows.map((r) => 1 - parseFloat(r.p_o25_raw));
  const outU25 = rows.map((r) => r.result_o25 !== "true");

  const calOver = fitCalibration(rawO25, outO25);
  const calUnder = fitCalibration(rawU25, outU25);

  calibration.markets["OU_2.5"] = { Over: calOver, Under: calUnder };

  for (const [label, cal] of [["Over", calOver], ["Under", calUnder]] as const) {
    console.log(`  ${label}: ${cal.xs.length} points`);
    for (const x of [0.3, 0.4, 0.5, 0.6, 0.7]) {
      const idx = Math.round(x * 100);
      if (idx < cal.ys.length) {
        console.log(`    raw ${(x * 100).toFixed(0)}% → calibrated ${(cal.ys[idx] * 100).toFixed(1)}%`);
      }
    }
  }

  // BTTS calibration (Yes, No)
  console.log("\nFitting BTTS calibration curves...");
  const rawBttsYes = rows.map((r) => parseFloat(r.p_btts_raw));
  const outBttsYes = rows.map((r) => r.result_btts === "true");
  const rawBttsNo = rows.map((r) => 1 - parseFloat(r.p_btts_raw));
  const outBttsNo = rows.map((r) => r.result_btts !== "true");

  const calBttsYes = fitCalibration(rawBttsYes, outBttsYes);
  const calBttsNo = fitCalibration(rawBttsNo, outBttsNo);

  calibration.markets["BTTS"] = { Yes: calBttsYes, No: calBttsNo };

  for (const [label, cal] of [["Yes", calBttsYes], ["No", calBttsNo]] as const) {
    console.log(`  ${label}: ${cal.xs.length} points`);
    for (const x of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
      const idx = Math.round(x * 100);
      if (idx < cal.ys.length) {
        console.log(`    raw ${(x * 100).toFixed(0)}% → calibrated ${(cal.ys[idx] * 100).toFixed(1)}%`);
      }
    }
  }

  // Write calibration file
  const outPath = path.join(process.cwd(), "lib", "modeling", "calibration-data.json");
  fs.writeFileSync(outPath, JSON.stringify(calibration, null, 2));
  console.log(`\nCalibration data written to ${outPath}`);

  // Quick validation: are the curves smooth?
  console.log("\n=== SMOOTHNESS CHECK (1X2-H) ===");
  let maxJump = 0;
  for (let i = 1; i < calH.ys.length; i++) {
    const jump = Math.abs(calH.ys[i] - calH.ys[i - 1]);
    if (jump > maxJump) maxJump = jump;
  }
  console.log(`Max jump between adjacent points: ${(maxJump * 100).toFixed(2)}%`);
  console.log(maxJump < 0.05 ? "PASS: Smooth curve (max jump < 5%)" : "WARN: Large jumps detected");
}

main();
