import 'dotenv/config';
import { createClient } from '@libsql/client';

const maxCoreHours = Number(process.env.CORE_MAX_STALE_HOURS || 24);
const minCoverage = Number(process.env.CORE_MIN_UPCOMING_ODDS_COVERAGE || 0.6);

function hoursSince(rawTs) {
  if (rawTs == null) return null;
  const n = Number(rawTs);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('[freshness] Missing TURSO_DATABASE_URL');
    process.exit(1);
  }
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const [fixtureMax, oddsMax, upcoming] = await Promise.all([
    c.execute('SELECT MAX(updated_at) AS max_u FROM fixture'),
    c.execute('SELECT MAX(updated_at) AS max_u FROM fixture_odds'),
    c.execute("SELECT COUNT(1) AS total, SUM(CASE WHEN fo.fixture_id IS NOT NULL THEN 1 ELSE 0 END) AS with_odds FROM fixture f LEFT JOIN fixture_odds fo ON fo.fixture_id = f.id WHERE f.status='NS' AND f.date >= date('now') AND f.date <= date('now', '+7 day')"),
  ]);

  const fixtureAge = hoursSince(fixtureMax.rows[0]?.max_u);
  const oddsAge = hoursSince(oddsMax.rows[0]?.max_u);
  const total = Number(upcoming.rows[0]?.total || 0);
  const withOdds = Number(upcoming.rows[0]?.with_odds || 0);
  const oddsCoverage = total > 0 ? withOdds / total : 1;

  const payload = {
    checkedAt: new Date().toISOString(),
    thresholds: { maxCoreHours, minCoverage },
    fixtureAgeHours: fixtureAge == null ? null : Number(fixtureAge.toFixed(2)),
    oddsAgeHours: oddsAge == null ? null : Number(oddsAge.toFixed(2)),
    upcomingOddsCoveragePct: Number((oddsCoverage * 100).toFixed(1)),
    upcoming: { total, withOdds },
  };
  console.log(JSON.stringify(payload, null, 2));

  const failures = [];
  if (fixtureAge != null && fixtureAge > maxCoreHours) failures.push(`fixture stale ${fixtureAge.toFixed(1)}h`);
  if (oddsAge != null && oddsAge > maxCoreHours) failures.push(`odds stale ${oddsAge.toFixed(1)}h`);
  if (oddsCoverage < minCoverage) failures.push(`upcoming odds coverage ${(oddsCoverage * 100).toFixed(1)}% below ${(minCoverage * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.error(`[freshness] FAILED: ${failures.join('; ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[freshness] unhandled:', err);
  process.exit(1);
});
