# mc upgrade

Summary of the Monte Carlo engine upgrades within the existing stack.

## Parameters

- `lib/insights/team-stats.ts` now exposes `getLeagueGoalAverages()` for league-wide home/away goal means across all ingested EPL seasons.
- `lib/modeling/baseline-params.ts`:
  - Uses league-normalized **attack/defence multipliers** (home/away) instead of raw L5/season blends.
  - Adds small **recent-form and shot-intensity modifiers** on top of the base attack/defence model.
  - Exports `debugGoalLambdaComponents()` for UI/debug use.

## Monte Carlo core

- `lib/modeling/mc-engine.ts`:
  - Adds optional `tempoStd` on `MatchSimulationRequest` to introduce a shared latent **tempo factor** that scales both λs and creates realistic correlation between home and away goals.

## Calibration

- `lib/modeling/evaluation.ts`:
  - Keeps `evaluateBaselineOnSeason()` as the single-season evaluator.
  - Adds `calibrateGoalScales(seasons, opts)` which:
    - Runs multi-season backtests.
    - Searches a small grid of global home/away λ scaling factors.
    - Returns the best scales and aggregate Brier scores.

## UI sim page

- `app/match/[id]/sim/page.tsx` now shows:
  - Goal λ plus **component breakdown** (league avg, attack/defence multipliers).
  - Total goals distribution buckets (0,1,2,3,4+) and goal-difference buckets (Home+2, Home+1, Draw, Away+1, Away+2).
  - Existing 1X2, BTTS, and O/U probabilities and expected corners.

This keeps the engine purely stats- and Monte Carlo-driven but pushes robustness and interpretability as far as possible without new paid data sources or heavy ML infra.*** End Patch```} ***!
