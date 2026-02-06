# model vs market

How odds are integrated into the prediction engine and how +EV signals are computed and surfaced.

## Odds ingestion

- **Source**: The Odds API (the-odds-api.com) via `scripts/ingest-odds.py`.
- **Storage**: Raw snapshots in `data/odds/<competition>/<date>.json`.
- **Normalization**: `python/model_data/odds_loader.py` converts The Odds API format into canonical `MarketPrice` objects (match_id, bookmaker, market_type, outcome, price).

## Match/odds alignment

- **Python**: `python/model_data/match_index.py` provides `match_fixture_to_odds()` and `build_match_odds_index()` to join API-Football fixtures with The Odds API matches by normalized team names + kickoff timestamps.
- **TypeScript**: `lib/odds/the-odds-api.ts` provides `getMarketProbsForMatch()` which:
  - Scans `data/odds/<competition>/` for the most recent snapshot.
  - Matches by team names + kickoff time (within tolerance).
  - Extracts vig-removed market probabilities for 1X2 and O/U 2.5.

## Odds as model features

- **Feature builder**: `python/model_data/features.py` now includes `compute_odds_features()` which:
  - Computes vig-removed implied probabilities for 1X2 and totals.
  - Aggregates across bookmakers (median prices, spreads).
  - Exposes columns: `p_market_home`, `p_market_draw`, `p_market_away`, `p_market_over_2_5`, `spread_h2h`, etc.
- **Training**: `python/train_goal_model.py` can train both:
  - **Pure model**: no odds features (baseline).
  - **Market-aware model**: includes odds features (for comparison and potential improvement).

## +EV computation

- **Core math**: `python/model_data/ev.py`:
  - `compute_edge_prob(p_model, p_market)`: edge in probability space.
  - `compute_ev(p_model, decimal_odds)`: expected value per unit stake = p_model * decimal_odds - 1.
  - `compute_model_vs_market()`: full comparison with edges, EV, and model fair odds.
- **Batch processing**: `python/build_model_vs_market.py`:
  - Takes odds snapshots + model probabilities (from Monte Carlo or Python models).
  - Computes edges and EV for all matches.
  - Writes `data/model_vs_market/<date>.json` for consumption by the Next.js app.

## UI integration

- **Sim page** (`app/match/[id]/sim/page.tsx`):
  - Loads market probabilities via `getMarketProbsForMatch()`.
  - Displays **Model vs market** section showing:
    - Model probability / Market probability for each outcome (1X2, O2.5).
    - Highlights outcomes with edge > 3% as **[+EV]**.
  - Format is strictly numeric; no narrative language.

## Thresholds and filters

- **Current EV threshold**: 3% (configurable in sim page).
- **Calibration-aware filtering**: Not yet implemented; future work will suppress +EV flags in regions where the model is known to be miscalibrated.
- **Guardrails**: Simple sanity checks (team name matching, time tolerance) prevent obvious mapping errors.

## Future work

- Backtest +EV signals over historical seasons to tune thresholds and identify reliable edge niches.
- Apply per-market calibration transforms before computing EV.
- Optional feed-level hints for matches with strong, calibrated edges.
