import fs from "fs";
import path from "path";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
  return env;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    out[key] = value ?? true;
  }
  return out;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(baseUrl, key, host, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API-Football ${path} failed (${res.status})`);
  }
  return res.json();
}

// Keep in sync with lib/leagues.ts ALL_COMPETITION_IDS (used when --all)
const ALL_LEAGUE_IDS = [
  39, 78, 135, 140, 61,           // Big 5
  40, 41, 42, 136, 79, 141, 62,   // Second-tier leagues
  94, 88, 203, 144, 179, 218,     // European leagues (tier 1.5)
  197, 345, 207, 119, 103, 210,   // European leagues (tier 1.5 cont.)
  106, 283, 286, 271, 113, 332,   // European leagues (tier 2.5)
  172, 244, 318, 383, 419,        // European leagues (tier 2.5 cont.)
  2, 3, 848,                       // European cups
  48, 45, 137, 143, 66, 81,       // Domestic cups
];

function loadExistingFixtures(outPath) {
  if (!fs.existsSync(outPath)) return [];
  try {
    const raw = fs.readFileSync(outPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getFixtureId(entry) {
  return entry.fixture?.fixture?.id ?? entry.fixture?.id;
}

async function ingestOneLeague(baseUrl, key, host, league, season, delayMs, limit, skipPlayers, force, outPath) {
  // Load existing data for incremental mode
  const existing = force ? [] : loadExistingFixtures(outPath);
  const existingIds = new Set(existing.map((e) => getFixtureId(e)).filter(Boolean));

  // Fetch full fixture list (1 cheap API call)
  const fixturesRes = await fetchJson(baseUrl, key, host, `/fixtures?league=${league}&season=${season}`);
  const fixtures = fixturesRes.response ?? [];
  const finished = fixtures.filter(
    (f) => f.fixture?.status?.short === "FT" && f.goals?.home != null && f.goals?.away != null,
  );

  // Filter to only new fixtures
  const newFixtures = finished.filter((f) => !existingIds.has(f.fixture.id));
  const selected = limit ? newFixtures.slice(0, limit) : newFixtures;

  if (selected.length === 0 && !force) {
    console.log(`  ${finished.length} finished, 0 new (skipping detail fetches)`);
    return existing;
  }

  console.log(`  ${finished.length} finished, ${selected.length} new to fetch`);

  const results = [];
  let index = 0;
  for (const item of selected) {
    index += 1;
    const fixtureId = item.fixture.id;
    console.log(`  [${index}/${selected.length}] fixture ${fixtureId}`);
    const stats = await fetchJson(baseUrl, key, host, `/fixtures/statistics?fixture=${fixtureId}`);
    await delay(delayMs);
    let players = [];
    if (!skipPlayers) {
      const playersRes = await fetchJson(baseUrl, key, host, `/fixtures/players?fixture=${fixtureId}`);
      players = playersRes.response ?? [];
      await delay(delayMs);
    }
    // Persist full item with league (id, name) for competition-aware form/stats
    const withLeague = { ...item, league: item.league ?? { id: league } };
    results.push({
      fixture: withLeague,
      stats: stats.response ?? [],
      players,
    });
  }

  // Merge new + existing, sort by date
  const merged = [...existing, ...results];
  merged.sort((a, b) => {
    const dateA = a.fixture?.fixture?.date ?? a.fixture?.date ?? "";
    const dateB = b.fixture?.fixture?.date ?? b.fixture?.date ?? "";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return merged;
}

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const season = Number(args.season ?? 2025);
  const delayMs = Number(args.delay ?? 5000);
  const limit = args.limit ? Number(args.limit) : null;
  const skipPlayers = Boolean(args.skipPlayers);
  const batchAll = Boolean(args.all);
  const force = Boolean(args.force);
  const baseUrl = env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = env.API_FOOTBALL_HOST;
  const key = env.API_FOOTBALL_KEY;

  if (!key) {
    console.error("Missing API_FOOTBALL_KEY in .env");
    process.exit(1);
  }

  const leaguesToIngest = batchAll
    ? ALL_LEAGUE_IDS
    : [Number(args.league ?? 39)];

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  if (force) {
    console.log("Running in FORCE mode — full re-fetch, ignoring existing data");
  } else {
    console.log("Running in incremental mode — only fetching new fixtures");
  }

  for (const league of leaguesToIngest) {
    console.log(`\nFetching fixtures for league ${league}, season ${season}...`);
    const outPath = path.join(outDir, `${league}-${season}-fixtures.json`);
    const results = await ingestOneLeague(baseUrl, key, host, league, season, delayMs, limit, skipPlayers, force, outPath);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} fixtures to ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
