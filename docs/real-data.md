# Real Data and Shareable Screenshots

## Overview

The app uses **API-Football** as the live data source when `API_FOOTBALL_KEY` is set in `.env`. No database or other external tools are required for local use.

## Data Flow

- **Feed**: Calls API-Football `/fixtures?league=39&season=2025&from=YYYY-MM-DD&to=YYYY-MM-DD` for the selected date
- **Match detail**: Calls `/fixtures?id={fixtureId}` and `/fixtures/players?fixture={fixtureId}` for player stats
- **Date navigation**: URL param `?date=YYYY-MM-DD` drives the feed; DateNavigator updates the URL when the user changes date

## Shareable Screenshots

For match screenshots:

1. Open a match detail: `/match/{fixtureId}`
2. Click **Screenshot** in the nav, or go to `/match/{fixtureId}/export`
3. Choose aspect ratio: **1:1** (square) or **9:16** (portrait/stories)
4. Capture the screen (e.g. Cmd+Shift+4 on Mac, or browser DevTools screenshot)

The export page has minimal chrome for clean, shareable images.

## Optional: Full Season Ingest

To persist fixture + stats + players to `data/epl-2025-fixtures.json` (for offline analysis or backup):

```bash
node scripts/season-ingest.mjs --league=39 --season=2025 --delay=2000
```

The app does **not** read from this file; it always uses the API when the key is set. Ingest is for batch/offline use.
