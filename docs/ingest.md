# ingest

Summary of how automated data fetching is wired for cron / schedulers.

## What the runner does

- **Season snapshot**: `scripts/season-snapshot.mjs`
  - Refreshes finished fixtures for a league/season from API-Football.
  - Controlled via `LEAGUE` (default `39` = EPL) and `SEASON` (default `2025`).
- **Odds ingest**: `scripts/ingest-odds.py`
  - Fetches pre-match odds from The Odds API into `data/odds/<competition>/...`.
  - Controlled via `ODDS_COMPETITIONS` (`epl` by default; space-separated list).
- **News / injuries (optional)**: `scripts/ingest-injuries-api_football.py`
  - Writes raw injury snapshots under `data/news/api_football/`.
  - Controlled via `INJURY_TEAM_IDS` (space-separated API-Football team ids).

All of the above are orchestrated by:

- `scripts/ingest-daily.sh`
  - Activates `python/.venv` if present.
  - Runs `season-snapshot.mjs` for the configured league/season.
  - Runs `ingest-odds.py` for each competition in `ODDS_COMPETITIONS`.
  - Optionally runs `ingest-injuries-api_football.py` for each team in `INJURY_TEAM_IDS`.
  - Exposed via `npm run ingest:daily`.

## How to schedule it (cron example)

1. **On your server**, add a cron entry under the deploy user (example: 4x/day, odds-heavy):

   ```bash
   # m h  dom mon dow   command
   5 6,11,16,21 * * * cd /path/to/bootroom && /bin/bash -lc 'npm run ingest:daily >> logs/ingest.log 2>&1'
   ```

   - `LEAGUE`, `SEASON`, `ODDS_COMPETITIONS`, `INJURY_TEAM_IDS` can be set in the shell environment or via a wrapper script.
   - Ensure `.env` contains `API_FOOTBALL_KEY` and `ODDS_API_KEY`.

2. **Odds cadence**:

   - 2–4 runs per day is safe:
     - Early morning (pre-board).
     - Late morning / early afternoon.
     - Pre-evening matches.
     - Late-night catch-up (results + late odds).

## GitHub Actions sketch (optional)

For a fully managed schedule, a GitHub Actions workflow can call the same runner:

```yaml
name: Ingest data

on:
  schedule:
    - cron: "5 6,11,16,21 * * *"

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install Python deps
        run: |
          python -m venv python/.venv
          source python/.venv/bin/activate
          pip install -r python/requirements.txt
      - name: Run ingest
        env:
          API_FOOTBALL_KEY: ${{ secrets.API_FOOTBALL_KEY }}
          ODDS_API_KEY: ${{ secrets.ODDS_API_KEY }}
          LEAGUE: "39"
          SEASON: "2025"
          ODDS_COMPETITIONS: "epl"
        run: |
          npm install
          npm run ingest:daily
```

This keeps ingestion **no-maintenance** once deployed: the app relies on a single, idempotent runner that can be wired to cron, a scheduler, or Actions without changing application code.

