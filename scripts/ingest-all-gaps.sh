#!/usr/bin/env bash
# Ingest ALL missing league-season combinations to make the DB comprehensive.
# Reads the gap list and runs season-ingest for each.
# Safe to re-run — season-ingest is incremental (skips existing fixtures).
#
# Usage: bash scripts/ingest-all-gaps.sh
# Estimated: ~67 league-seasons, ~15k-20k API calls across multiple days if needed.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

DELAY="${DELAY:-3000}"

# All 67 gaps: "leagueId:season" pairs
# season-ingest.mjs handles calendar-year offset internally when --season is the base,
# BUT for explicit seasons we pass the actual season year directly via --season.
GAPS=(
  # Big 5 missing 2024
  "135:2024"  # Serie A
  "140:2024"  # La Liga
  # European tier 1.5 missing 2024
  "88:2024"   # Eredivisie
  "94:2024"   # Liga Portugal
  "144:2024"  # Belgian Pro League
  "203:2024"  # Süper Lig
  "179:2024"  # Scottish Prem
  "179:2025"  # Scottish Prem
  "218:2024"  # Austrian BL
  "218:2025"  # Austrian BL
  # European tier 2 missing
  "207:2024"  # Swiss Super League
  "207:2025"  # Swiss Super League
  "119:2024"  # Superliga DK
  "119:2025"  # Superliga DK
  "197:2024"  # Super League GR
  "210:2024"  # HNL
  "210:2025"  # HNL
  "103:2024"  # Eliteserien (calendar: pass 2024 directly)
  "103:2026"  # Eliteserien (calendar: pass 2026 directly)
  "113:2024"  # Allsvenskan (calendar)
  "113:2025"  # Allsvenskan (calendar)
  "113:2026"  # Allsvenskan (calendar — current, 0 finished so far)
  "106:2024"  # Ekstraklasa
  "106:2025"  # Ekstraklasa
  "345:2024"  # Czech Liga
  "345:2025"  # Czech Liga
  # Americas — all missing
  "253:2024"  # MLS (calendar)
  "253:2025"  # MLS (calendar)
  "262:2023"  # Liga MX
  "262:2024"  # Liga MX
  "262:2025"  # Liga MX
  "71:2024"   # Série A BR (calendar)
  "71:2025"   # Série A BR (calendar)
  "71:2026"   # Série A BR (calendar — current)
  "128:2024"  # Liga Profesional (calendar)
  "128:2025"  # Liga Profesional (calendar)
  "128:2026"  # Liga Profesional (calendar — current)
  # Asia / Middle East / Oceania — all missing
  "307:2023"  # Saudi Pro
  "307:2024"  # Saudi Pro
  "307:2025"  # Saudi Pro
  "98:2024"   # J-League (calendar)
  "98:2025"   # J-League (calendar)
  "98:2026"   # J-League (calendar — current)
  "292:2024"  # K-League 1 (calendar)
  "292:2025"  # K-League 1 (calendar)
  "292:2026"  # K-League 1 (calendar — current)
  "188:2023"  # A-League
  "188:2024"  # A-League
  "188:2025"  # A-League
  # Second-tier leagues
  "40:2024"   # Championship
  "41:2024"   # League One
  "42:2023"   # League Two
  "42:2024"   # League Two
  "136:2023"  # Serie B
  "136:2024"  # Serie B
  "79:2023"   # 2. Bundesliga
  "79:2024"   # 2. Bundesliga
  "141:2023"  # Segunda Div.
  "141:2024"  # Segunda Div.
  # Cups
  "848:2023"  # UECL
  "848:2024"  # UECL
  "48:2023"   # FA Cup
  "45:2024"   # EFL Cup
  "45:2025"   # EFL Cup
  "66:2023"   # Coupe de France
  "66:2024"   # Coupe de France
  "66:2025"   # Coupe de France
)

TOTAL="${#GAPS[@]}"
echo "=== Filling ${TOTAL} league-season gaps ==="
echo "Delay between fixtures: ${DELAY}ms"
echo ""

echo ""

COUNT=0
for GAP in "${GAPS[@]}"; do
  LEAGUE="${GAP%%:*}"
  SEASON="${GAP##*:}"
  COUNT=$((COUNT + 1))

  echo ""
  echo "=== [${COUNT}/${TOTAL}] League ${LEAGUE}, season ${SEASON} ==="

  # For calendar-year leagues, season-ingest adds +1 when --season is base year.
  # But we're passing the ACTUAL season year, so we need to adjust:
  # If it's a calendar-year league and we want season X, pass X-1 as --season
  # so the script's +1 logic produces X.
  # Calendar-year leagues: 253, 71, 128, 98, 292, 103, 113
  case "$LEAGUE" in
    253|71|128|98|292|103|113)
      BASE_SEASON=$((SEASON - 1))
      ;;
    *)
      BASE_SEASON="$SEASON"
      ;;
  esac

  node scripts/season-ingest.mjs \
    --league="${LEAGUE}" \
    --season="${BASE_SEASON}" \
    --delay="${DELAY}" || {
    echo "WARNING: Failed league ${LEAGUE} season ${SEASON}"
    continue
  }
done

echo ""
echo "=== Season ingest complete. Now syncing to DB... ==="

# Refresh upcoming fixtures
echo ""
echo "=== Refreshing upcoming fixtures ==="
node scripts/ingest-upcoming-fixtures.mjs --season=2025 --days=7 --delay=2000 || {
  echo "WARNING: upcoming fixtures ingest failed"
}

# Sync everything to Turso
echo ""
echo "=== Syncing fixtures to DB ==="
npx tsx scripts/sync-fixtures-to-db.ts || {
  echo "WARNING: fixture sync failed"
}

echo ""
echo "=== Syncing teams to DB ==="
npx tsx scripts/ingest-teams-db.ts || {
  echo "WARNING: teams sync failed"
}

echo ""
echo "=== Ingesting H2H ==="
npx tsx scripts/ingest-h2h-db.ts || {
  echo "WARNING: H2H ingest failed"
}

echo ""
echo "=== Running simulations ==="
npx tsx scripts/run-simulations.ts || {
  echo "WARNING: simulations failed"
}

echo ""
echo "=== ALL DONE ==="
