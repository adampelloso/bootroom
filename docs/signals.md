# signals

Summary of the new data and modeling scaffolding around the Monte Carlo engine.

## Event data

- Canonical schema defined in `python/model_data/schema.py` (`Match`, `Event`, `LineupEntry`, `MarketPrice`).
- Ingestion scripts:
  - `scripts/ingest-events-api_football.py`: fetches `/fixtures/events` from API-Football for a given league/season and writes JSONL under `data/events/api_football/...`.
  - `scripts/ingest-events-statsbomb.py`: reshapes local StatsBomb open-data event files into JSONL under `data/events/statsbomb/...`.
- Loader:
  - `python/model_data/events_loader.py`: maps provider JSONL into canonical `Event` objects and a pandas DataFrame for feature work.

## Modeling stack (Python)

- `python/requirements.txt`: baseline dependencies (`numpy`, `pandas`, `scikit-learn`, `pyarrow`).
- `python/model_data/features.py`: placeholder feature builder (`build_goal_model_features`) to turn match-level tables into X matrices.
- `python/train_goal_model.py`: trains simple GradientBoostingRegressor models for home/away goals from a pre-built match dataset and saves artefacts in `python/models/`.

## Odds and news

- `scripts/ingest-odds.py`: **Fully implemented** - fetches pre-match odds from The Odds API (the-odds-api.com) for major competitions (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, UEL). Requires `ODDS_API_KEY` in `.env`. Writes snapshots to `data/odds/<competition>/<date>.json`.
- `python/model_data/odds_loader.py`: normalizes The Odds API response format into canonical `MarketPrice` objects, aggregates prices across bookmakers.
- `python/model_data/odds_utils.py`: utilities for converting decimal odds to probabilities and removing vig on 1X2.
- `python/model_data/match_index.py`: match/odds alignment layer (joins API-Football fixtures to The Odds API matches by team names + kickoff time).
- `python/model_data/features.py`: extended to include `compute_odds_features()` which adds vig-removed market probabilities (`p_market_home`, `p_market_draw`, etc.) as features for training.
- `python/model_data/ev.py`: expected value computation (`compute_edge_prob`, `compute_ev`, `compute_model_vs_market`).
- `python/build_model_vs_market.py`: batch script to generate model-vs-market comparison JSON for upcoming fixtures.
- `lib/odds/the-odds-api.ts`: TypeScript helper to load odds snapshots and extract market probabilities for a given match.
- `app/match/[id]/sim/page.tsx`: **Updated** to display model vs market probabilities and highlight +EV outcomes (edge > 3%).
- `python/compare_model_vs_market.py`: example script showing how to compare your model λs vs market-implied probabilities for a given match.
- `scripts/ingest-injuries-api_football.py`: pulls injury snapshots from API-Football into `data/news/api_football/`.
- `python/model_data/news_flags.py`: derives simple injury flags (e.g. `key_player_out`) from structured payloads for use as model features.

These pieces give you a concrete starting point for richer event-level features, a Python modeling stack, and basic odds/news signals, ready to be iterated into the full world-class engine.*** End Patch```} -->
