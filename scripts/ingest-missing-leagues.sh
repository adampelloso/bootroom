#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

MISSING_LEAGUES=(113 253 262 71 128 307 98 292 188)

echo "=== Ingesting season fixtures for ${#MISSING_LEAGUES[@]} missing leagues ==="

for LEAGUE in "${MISSING_LEAGUES[@]}"; do
  echo ""
  echo "--- League ${LEAGUE} ---"
  node scripts/season-ingest.mjs --league="${LEAGUE}" --season=2025 --delay=3000 || {
    echo "WARNING: season ingest failed for league ${LEAGUE}"
  }
done

echo ""
echo "=== Ingesting player stats for missing leagues ==="
for LEAGUE in "${MISSING_LEAGUES[@]}"; do
  echo ""
  echo "--- Players: League ${LEAGUE} ---"
  node scripts/ingest-players.mjs --league="${LEAGUE}" --season=2025 || {
    echo "WARNING: player stats ingest failed for league ${LEAGUE}"
  }
done

echo ""
echo "=== Refreshing upcoming fixtures (all leagues) ==="
node scripts/ingest-upcoming-fixtures.mjs --season=2025 --days=7 --delay=2000 || {
  echo "WARNING: upcoming fixtures ingest failed"
}

echo ""
echo "=== Syncing all fixtures to DB ==="
npx tsx scripts/sync-fixtures-to-db.ts || {
  echo "WARNING: sync to DB failed"
}

echo ""
echo "=== Syncing teams to DB ==="
npx tsx scripts/ingest-teams-db.ts || {
  echo "WARNING: teams DB ingest failed"
}

echo ""
echo "=== Syncing H2H data ==="
npx tsx scripts/ingest-h2h-db.ts || {
  echo "WARNING: H2H ingest failed"
}

echo ""
echo "=== Running simulations ==="
npx tsx scripts/run-simulations.ts || {
  echo "WARNING: simulation run failed"
}

echo ""
echo "=== Done ==="
