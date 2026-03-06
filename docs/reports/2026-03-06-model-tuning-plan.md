# Historical Model QA + Conservative Tuning Plan

Date: 2026-03-06

## Data scope used
- Finished fixtures with odds in DB: 391
- Usable for calibration scoring: 268 fixtures per core market (H/D/A/O2.5/BTTS), 1,340 observations total
- Leagues represented: 34
- Simulation source mix:
  - precomputed sims: 36 fixtures
  - runtime sims (reconstructed): 232 fixtures
  - skipped (no lambdas): 123 fixtures

Raw report: `docs/reports/2026-03-06-historical-calibration.txt`

## Plain-English takeaways
- At aggregate level, model is not wildly off:
  - Home and BTTS are close to observed rates.
  - Draw is modestly underpredicted.
  - Away is modestly overpredicted.
- Biggest risk is not global bias; it is **league+market pockets** where sample behavior diverges hard.
- Many high-edge picks are overconfident in specific league/market buckets.

## Where model currently falls short
1. League-bucket instability
- Multiple league+market cells show >20pp calibration error with low-to-mid sample counts.
- This indicates one-size-fits-all calibration is too coarse.

2. Away-side overconfidence
- Aggregate away market calibration is +3.6pp high versus outcomes.
- Several overconfident edge pockets are away-heavy.

3. Edge selection fragility
- In some league/market cells, picks with edge>=4% have large negative realized bias.
- Current edge flagging does not account for local uncertainty enough.

4. Coverage gap still exists
- Only a subset of finished fixtures has retrievable historical odds.
- Backfill quality degrades in older tails where provider returns no odds.

## Do-not-overcorrect principles
To preserve model integrity and avoid chasing noise:
- No global hard shifts from small league samples.
- No market rule changes based on cells with n < 25.
- Use shrinkage toward global priors for sparse cells.
- Keep sportsbook comparisons as reference; do not force model to mimic books.

## Proposed tuning (ordered, conservative)
1. Hierarchical calibration (global -> league)
- Keep current global calibration tables.
- Add league-level residual calibrators only when league-market n >= 50.
- For n < 50, shrink league adjustment toward 0 using sample-size weighting.

2. Edge reliability gating
- Compute per league+market reliability score from:
  - sample size
  - absolute calibration error
  - edge-pick realized bias
- Suppress HIGH/MEDIUM edge tags when reliability is low; keep raw numbers visible.

3. Away-market dampener (small, global)
- Apply a conservative shrink toward baseline for away probabilities only, e.g. 3-6% relative shrink, then re-evaluate.
- Only keep if it improves out-of-sample Brier and calibration.

4. Draw-market correction
- Apply small uplift candidate to draw probabilities (1-3pp range) with cross-validation.
- Keep only if both calibration and Brier improve.

5. Backtest protocol hardening
- Evaluate in rolling windows (time-ordered), not pooled random splits.
- Report confidence intervals for calibration error and edge bias.

## Immediate implementation tasks
1. Build `scripts/build-league-calibration.ts`
- Inputs: historical obs from `qa-historical-calibration-runtime.ts`
- Output: `lib/modeling/calibration-league-data.json` with shrinkage metadata.

2. Add `applyLeagueCalibration(leagueId, market, outcome, prob)`
- Called after global calibration.
- Uses hierarchical shrinkage and minimum-sample guards.

3. Add `edgeReliability` to match/player edge outputs
- Feed/UI can down-rank unreliable edges without hiding data.

4. Add `scripts/qa-calibration-rolling.ts`
- Rolling-window evaluation and stability report by market + league.

## Success criteria for next iteration
- Aggregate |calibration error| under 2.5pp for H/D/A/O2.5/BTTS.
- No league+market cell with n>=50 and |error| > 8pp.
- Edge>=4% buckets show non-negative realized bias in top tracked leagues.
- Brier score does not degrade versus current baseline.
