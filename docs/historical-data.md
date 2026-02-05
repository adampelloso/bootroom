## Historical data

- **What**: Enable ingesting past seasons without player data so we can build deeper H2H history from fixtures + team stats only.
- **Script**: `scripts/season-ingest.mjs`

### New option

- **`--skipPlayers`**: when present, the script will:
  - Fetch fixtures and `/fixtures/statistics` as before.
  - **Skip** `/fixtures/players` calls (no player-level data).
  - Still write one JSON file per season: `data/epl-<season>-fixtures.json`.

Example (EPL, stats-only):

```bash
node scripts/season-ingest.mjs --league=39 --season=2025 --delay=5000 --skipPlayers
```

### Suggested runs for EPL H2H depth

To get ~10 historical H2H matches between most EPL pairs, you can ingest the last 5 seasons (adjust the years if needed):

```bash
node scripts/season-ingest.mjs --league=39 --season=2020 --delay=5000 --skipPlayers
node scripts/season-ingest.mjs --league=39 --season=2021 --delay=5000 --skipPlayers
node scripts/season-ingest.mjs --league=39 --season=2022 --delay=5000 --skipPlayers
node scripts/season-ingest.mjs --league=39 --season=2023 --delay=5000 --skipPlayers
node scripts/season-ingest.mjs --league=39 --season=2024 --delay=5000 --skipPlayers
```

Once these files exist in `data/`, we can wire the app to:

- Aggregate fixtures across seasons for each team pair.
- Compute “last 10 H2H” results and summaries using local JSON instead of live API calls.

