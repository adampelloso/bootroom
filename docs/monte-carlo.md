# monte carlo

Summary of the Monte Carlo prediction engine foundation.

## Data and inputs

- **Historical fixtures**: EPL seasons ingested into `data/epl-*-fixtures.json` using `scripts/season-ingest.mjs`.
- **Team histories**: `lib/insights/team-stats.ts` builds per-team match rows and rolling stats (L5, L10, season) for goals, shots, shots on target, corners, BTTS, O2.5.

## Baseline parameters

- `lib/modeling/baseline-params.ts`:
  - `estimateMatchGoalLambdas(home, away, date)` blends team L5 + season goal averages (home/away venue) and combines home attack vs away defence with a small home-advantage term.
  - `estimateMatchCornerLambdas(home, away, date)` does the same for total corners (for + against).

## Features for ML

- `lib/modeling/features.ts`:
  - `buildMatchFeatures(home, away, date)` returns a snapshot of rolling team features (goals, shots, corners, BTTS/O2.5) plus combined L5/L10 stats, suitable for both pre-match inference and offline training.

## Monte Carlo core

- `lib/modeling/mc-engine.ts`:
  - `simulateMatch({ lambdaHomeGoals, lambdaAwayGoals, lambdaHomeCorners?, lambdaAwayCorners?, simulations?, randomSeed? })`:
    - Samples Poisson goals (and optionally corners) for each simulation.
    - Returns scoreline frequencies, 1X2 probabilities, BTTS and O/U (2.5/3.5) hit rates, and expected goals/corners.

## Evaluation

- `lib/modeling/evaluation.ts`:
  - `evaluateBaselineOnSeason(season, { maxMatches?, simulations? })`:
    - Reads `epl-<season>-fixtures.json`, estimates goal lambdas pre-match, runs Monte Carlo, and computes mean Brier score for 1X2 outcomes across the season subset.

This stack gives you a baseline Monte Carlo engine wired to existing data, with clear seams for plugging in richer ML-based parameter estimators later.
