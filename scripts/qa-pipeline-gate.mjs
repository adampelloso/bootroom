import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [k, ...rest] = t.split("=");
    if (!k) continue;
    env[k] = rest.join("=").replace(/^"|"$/g, "");
  }
  return env;
}

function isoUtcDate(daysFromToday = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function loadUpcoming() {
  const filePath = path.join(process.cwd(), "data", "upcoming-fixtures.json");
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSimulationMapForDate(date) {
  const filePath = path.join(process.cwd(), "data", "simulations", `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed?.fixtures ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const env = { ...readEnv(), ...process.env };
  const url = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("[qa-gate] Missing TURSO_DATABASE_URL");
    process.exit(1);
  }

  const minOddsCoverage = Number(env.PIPELINE_MIN_ODDS_COVERAGE ?? 0.85);
  const client = createClient({ url, authToken });
  const from = isoUtcDate(0);
  const to = isoUtcDate(7);

  const upcoming = loadUpcoming();
  const upcomingIds = new Set(upcoming.map((u) => Number(u.fixtureId)).filter((n) => Number.isFinite(n)));

  const dbUpcomingRes = await client.execute({
    sql: `
      SELECT id
      FROM fixture
      WHERE status = 'NS'
        AND date >= ?
        AND date <= ?
    `,
    args: [from, to],
  });
  const dbUpcomingIds = new Set(dbUpcomingRes.rows.map((r) => Number(r.id)));

  const missingInDb = [...upcomingIds].filter((id) => !dbUpcomingIds.has(id));

  const simCoverageByDate = new Map();
  for (const row of upcoming) {
    const fixtureId = Number(row.fixtureId);
    const date = String(row.date ?? "").slice(0, 10);
    if (!Number.isFinite(fixtureId) || !date) continue;
    if (!simCoverageByDate.has(date)) {
      simCoverageByDate.set(date, loadSimulationMapForDate(date));
    }
  }

  const missingSimFixtureIds = [];
  for (const row of upcoming) {
    const fixtureId = Number(row.fixtureId);
    const date = String(row.date ?? "").slice(0, 10);
    if (!Number.isFinite(fixtureId) || !date) continue;
    const simMap = simCoverageByDate.get(date);
    if (!simMap || simMap[String(fixtureId)] == null) {
      missingSimFixtureIds.push(fixtureId);
    }
  }

  const oddsRes = await client.execute({
    sql: `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN fo.fixture_id IS NOT NULL THEN 1 ELSE 0 END) AS with_odds
      FROM fixture f
      LEFT JOIN fixture_odds fo ON fo.fixture_id = f.id
      WHERE f.status = 'NS'
        AND f.date >= ?
        AND f.date <= ?
    `,
    args: [from, to],
  });
  const oddsTotal = Number(oddsRes.rows[0]?.total ?? 0);
  const oddsWith = Number(oddsRes.rows[0]?.with_odds ?? 0);
  const oddsCoverage = oddsTotal > 0 ? oddsWith / oddsTotal : 1;

  const payload = {
    window: { from, to },
    thresholds: { minOddsCoverage },
    upcomingFileCount: upcomingIds.size,
    dbUpcomingCount: dbUpcomingIds.size,
    missingUpcomingInDb: missingInDb.length,
    missingSimulations: missingSimFixtureIds.length,
    oddsCoveragePct: Number((oddsCoverage * 100).toFixed(1)),
    oddsCoverageRaw: { withOdds: oddsWith, total: oddsTotal },
  };
  console.log(JSON.stringify(payload, null, 2));

  const failures = [];
  if (missingInDb.length > 0) failures.push(`missing fixtures in DB: ${missingInDb.length}`);
  if (missingSimFixtureIds.length > 0) failures.push(`missing simulations: ${missingSimFixtureIds.length}`);
  if (oddsCoverage < minOddsCoverage) failures.push(`odds coverage ${(oddsCoverage * 100).toFixed(1)}% < ${(minOddsCoverage * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.error(`[qa-gate] FAILED: ${failures.join("; ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[qa-gate] Unhandled error:", err);
  process.exit(1);
});

