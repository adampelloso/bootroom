## prediction-upgrade

Snapshot of the calibration + odds-aware upgrades to the prediction engine.

- **Backtest harness**: `python/backtest_run.py`
  - Replays a full EPL season (`data/epl-2020-fixtures.json`) without lookahead.
  - Computes Poisson-based probabilities for 1X2, BTTS, and O/U 2.5 per match.
  - Logs model probabilities and realized outcomes to `data/backtests/...`.

- **Calibration**:
  - `python/calibrate_probs.py` fits isotonic calibration curves for:
    - 1X2 (H/D/A)
    - O/U 2.5 (Over/Under)
  - Outputs JSON tables in `lib/modeling/calibration-data.json`.
  - `lib/modeling/calibration.ts` exposes `applyCalibration()` for use in the app.

- **Odds blending**:
  - `lib/modeling/odds-blend.ts` defines `blendModelAndMarket()`:
    - Takes calibrated model probabilities and market probabilities.
    - Blends them with a simple confidence proxy (sample-size based, currently stubbed).
  - `/match/[id]/sim` now:
    - Uses **calibrated** probabilities for 1X2 and O/U 2.5.
    - Blends them with market probabilities before computing edges.
    - Displays Model vs Market with `[+EV]` tags based on blended edge.

- **Feature expansion / modeling**:
  - `python/model_data/features.py`:
    - Adds simple schedule features (`home_days_since_last`, `home_matches_played`, etc.).
    - Integrates odds-derived features (`p_market_home`, `p_market_over_2_5`, spreads).
  - `python/train_goal_model.py` leverages these features for future ML models.

- **EV backtest**:
  - `python/backtest_ev.py`:
    - Consumes backtest CSV and (for now) pseudo-odds.
    - Simulates flat-stake +EV betting to provide a scaffold for future ROI analysis.

- **Governance & monitoring**:
  - `data/model/manifest.json` tracks `model_version`, `calibration_version`, and `ev_policy_version`.
  - `python/monitor_calibration.py` computes Brier scores and bucket-level calibration gaps, writing to `data/monitoring/...`.
  - `scripts/ingest-daily.sh` now emits a simple fixtures-count health line after running.

Together, these changes turn the Monte Carlo engine into a calibrated, odds-aware core with a concrete path to historical EV analysis and ongoing monitoring.

