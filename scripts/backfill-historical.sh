#!/usr/bin/env bash
# Backfill historical fixture data for all supported leagues.
# Skips (league, season) if data/{leagueId}-{season}-fixtures.json already exists.
# Resumable: re-run to skip existing files and pick up where you left off.
#
# Usage: bash scripts/backfill-historical.sh [delay_ms]
# Example: bash scripts/backfill-historical.sh 5000

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DELAY="${1:-5000}"
DATA_DIR="$PROJECT_ROOT/data"

# ── Winter leagues (Aug–May): use European season start year ──
# 3 seasons: 2023, 2024, 2025
WINTER_SEASONS="2023 2024 2025"

# Big 5
BIG5="39 78 135 140 61"
# European tier 1.5
EUR_T15="88 94 144 203 179 218"
# European tier 2
EUR_T2="207 119 197 210 106 345 283"
# Second-tier leagues (Championship, Serie B, etc.)
SECOND_TIER="40 41 42 136 79 141 62"
# European cups
EURO_CUPS="2 3 848"
# Domestic cups
DOM_CUPS="48 45 137 143 66 81"
# Asia / Middle East / Oceania (winter schedule)
WINTER_OTHER="307 188"
# Liga MX (Apertura/Clausura straddles years, API-Football uses start year)
WINTER_AMERICAS="262"

ALL_WINTER="$BIG5 $EUR_T15 $EUR_T2 $SECOND_TIER $EURO_CUPS $DOM_CUPS $WINTER_OTHER $WINTER_AMERICAS"

# ── Calendar-year leagues (Feb/Mar–Nov/Dec): use calendar year ──
# 3 seasons: 2024, 2025, 2026
CALENDAR_SEASONS="2024 2025 2026"

# Americas
CAL_AMERICAS="253 71 128"
# Asia
CAL_ASIA="98 292"
# Scandinavia (spring-to-autumn)
CAL_SCANDI="103 113"

ALL_CALENDAR="$CAL_AMERICAS $CAL_ASIA $CAL_SCANDI"

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
echo "[backfill] Winter leagues: seasons $WINTER_SEASONS"
echo "[backfill] Calendar leagues: seasons $CALENDAR_SEASONS"
echo ""

# Winter leagues
for season in $WINTER_SEASONS; do
  for league in $ALL_WINTER; do
    run_one "$league" "$season" || {
      echo "[backfill] WARNING: ingest failed for league=$league season=$season (exit $?)"
    }
  done
done

# Calendar-year leagues
for season in $CALENDAR_SEASONS; do
  for league in $ALL_CALENDAR; do
    run_one "$league" "$season" || {
      echo "[backfill] WARNING: ingest failed for league=$league season=$season (exit $?)"
    }
  done
done

echo ""
echo "[backfill] Done."
