#!/usr/bin/env bash

# Orchestrated ingest runner for cron / schedulers.
# - Updates season snapshots (finished fixtures)
# - Fetches latest odds
# - (Optionally) fetches news / injuries
#
# Safe to run multiple times per day; outputs are idempotent snapshots.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[ingest-daily] project root: $PROJECT_ROOT"

# Activate Python virtualenv if present (for odds / news scripts)
if [ -d "python/.venv" ]; then
  # shellcheck disable=SC1091
  source "python/.venv/bin/activate"
  echo "[ingest-daily] activated python/.venv"
else
  echo "[ingest-daily] WARNING: python/.venv not found; assuming 'python' is available on PATH"
fi

# League / season configuration (defaults: EPL 2025)
# Set LEAGUE=all to ingest all supported competitions (Big 5 + UCL/UEL/UECL + domestic cups).
LEAGUE="${LEAGUE:-39}"
SEASON="${SEASON:-2025}"

if [ "$LEAGUE" = "all" ]; then
  echo "[ingest-daily] season ingest for ALL competitions, season=${SEASON}"
  node "scripts/season-ingest.mjs" --all --season="${SEASON}" || {
    echo "[ingest-daily] WARNING: season ingest failed"
  }
else
  echo "[ingest-daily] season ingest for league=${LEAGUE} season=${SEASON}"
  node "scripts/season-ingest.mjs" --league="${LEAGUE}" --season="${SEASON}" || {
    echo "[ingest-daily] WARNING: season ingest failed"
  }
fi

# Player season stats ingestion (skip if already fetched within 20h)
if [ "$LEAGUE" = "all" ]; then
  echo "[ingest-daily] player stats ingest for ALL competitions, season=${SEASON}"
  node "scripts/ingest-players.mjs" --all --season="${SEASON}" --skip-if-fresh || {
    echo "[ingest-daily] WARNING: player stats ingest failed"
  }
else
  echo "[ingest-daily] player stats ingest for league=${LEAGUE} season=${SEASON}"
  node "scripts/ingest-players.mjs" --league="${LEAGUE}" --season="${SEASON}" --skip-if-fresh || {
    echo "[ingest-daily] WARNING: player stats ingest failed"
  }
fi

# Odds ingestion: competitions that have The Odds API sport_key (lib/leagues.ts oddsKey; scripts/ingest-odds.py SPORT_MAP).
# Competitions with oddsKey null (Coppa Italia, Copa del Rey, Coupe de France, DFB-Pokal) are fixtures/stats only.
# Set ODDS_COMPETITIONS to space-separated list; default below includes all with odds.
ODDS_COMPETITIONS="${ODDS_COMPETITIONS:-epl laliga seriea bundesliga ligue1 ucl uel uecl fa_cup efl_cup}"

for COMP in ${ODDS_COMPETITIONS}; do
  echo "[ingest-daily] odds ingest for competition=${COMP}"
  python "scripts/ingest-odds.py" --competition "${COMP}" || {
    echo "[ingest-daily] WARNING: odds ingest failed for ${COMP}"
  }
done

# Optional: injuries / news.
# Configure INJURY_TEAM_IDS as space-separated API-Football team IDs, e.g. "42 50".
INJURY_TEAM_IDS="${INJURY_TEAM_IDS:-}"

if [ -n "${INJURY_TEAM_IDS}" ]; then
  for TEAM_ID in ${INJURY_TEAM_IDS}; do
    echo "[ingest-daily] injuries ingest for team=${TEAM_ID} season=${SEASON}"
    python "scripts/ingest-injuries-api_football.py" --team-id "${TEAM_ID}" --season "${SEASON}" || {
      echo "[ingest-daily] WARNING: injuries ingest failed for team ${TEAM_ID}"
    }
  done
fi

# Upcoming fixtures (for simulation pipeline — 7-day window)
echo "[ingest-daily] fetching upcoming fixtures"
node "scripts/ingest-upcoming-fixtures.mjs" --season="${SEASON}" --days=7 || {
  echo "[ingest-daily] WARNING: upcoming fixtures ingest failed"
}

# Pre-compute Monte Carlo simulations
echo "[ingest-daily] running simulations"
npx tsx "scripts/run-simulations.ts" || {
  echo "[ingest-daily] WARNING: simulation run failed"
}

# Cleanup old simulation files (>7 days)
find data/simulations -name "*.json" -mtime +7 -delete 2>/dev/null || true

# Basic health check: count fixture files (any league) and total fixtures.
FIX_FILES="$(find data -maxdepth 1 -name "*-${SEASON}-fixtures.json" 2>/dev/null | wc -l)"
echo "[ingest-daily] fixture files for season ${SEASON}: ${FIX_FILES}"

echo "[ingest-daily] done"

