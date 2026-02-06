#!/usr/bin/env bash
# Backfill historical fixture data for all leagues (see docs/historical-data-plan.md).
# Skips (league, season) if data/{leagueId}-{season}-fixtures.json already exists.
# Usage: bash scripts/backfill-historical.sh [delay_ms]
# Example: bash scripts/backfill-historical.sh 5000

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DELAY="${1:-5000}"
DATA_DIR="$PROJECT_ROOT/data"

# Priority 1: Big 5 leagues — 2023, 2024, 2025
BIG5_LEAGUES="39 78 135 140 61"
# Priority 2: European cups
EURO_LEAGUES="2 3 848"
# Priority 3: Domestic cups
CUP_LEAGUES="48 45 137 143 62 81"

SEASONS="2023 2024 2025"

run_one() {
  local league="$1"
  local season="$2"
  local outfile="$DATA_DIR/${league}-${season}-fixtures.json"
  if [ -f "$outfile" ]; then
    echo "[skip] $outfile exists"
    return 0
  fi
  echo "[ingest] league=$league season=$season delay=${DELAY}ms ..."
  node scripts/season-ingest.mjs --league="$league" --season="$season" --delay="$DELAY" --skipPlayers
}

echo "[backfill] Starting historical backfill (delay=${DELAY}ms). Resumable: re-run to skip existing files."
echo ""

for season in $SEASONS; do
  for league in $BIG5_LEAGUES $EURO_LEAGUES $CUP_LEAGUES; do
    run_one "$league" "$season" || {
      echo "[backfill] WARNING: ingest failed for league=$league season=$season (exit $?)"
    }
  done
done

echo ""
echo "[backfill] Done."
