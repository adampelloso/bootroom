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

# Odds ingestion from API-Football into fixture_odds (used by feed/today edge calculations).
# Replaces legacy ingest-odds.py flow.
ODDS_LOOKAHEAD_DAYS="${ODDS_LOOKAHEAD_DAYS:-7}"
ODDS_BATCH_SIZE="${ODDS_BATCH_SIZE:-10}"
ODDS_DELAY_MS="${ODDS_DELAY_MS:-500}"
ODDS_RETRY_PASSES="${ODDS_RETRY_PASSES:-2}"

TODAY_UTC="$(date -u +%Y-%m-%d)"
ODDS_TO="$(node -e "const d=new Date(); d.setUTCDate(d.getUTCDate()+Number('${ODDS_LOOKAHEAD_DAYS}')); process.stdout.write(d.toISOString().slice(0,10));")"

PASS=1
while [ "$PASS" -le "$ODDS_RETRY_PASSES" ]; do
  echo "[ingest-daily] odds ingest pass ${PASS}/${ODDS_RETRY_PASSES} (NS fixtures ${TODAY_UTC}..${ODDS_TO})"
  npx tsx "scripts/ingest-odds-db.ts" \
    --statuses=NS \
    --date-from="${TODAY_UTC}" \
    --date-to="${ODDS_TO}" \
    --missing-only=true \
    --batch-size="${ODDS_BATCH_SIZE}" \
    --delay-ms="${ODDS_DELAY_MS}" || {
    echo "[ingest-daily] WARNING: odds ingest pass ${PASS} failed"
  }
  PASS=$((PASS + 1))
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
