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

async function ingestOneLeague(baseUrl, key, host, league, season, delayMs, limit, skipPlayers) {
  const fixturesRes = await fetchJson(baseUrl, key, host, `/fixtures?league=${league}&season=${season}`);
  const fixtures = fixturesRes.response ?? [];
  const finished = fixtures.filter(
    (f) => f.fixture?.status?.short === "FT" && f.goals?.home != null && f.goals?.away != null,
  );
  const selected = limit ? finished.slice(0, limit) : finished;

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
  return results;
}

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const season = Number(args.season ?? 2025);
  const delayMs = Number(args.delay ?? 5000);
  const limit = args.limit ? Number(args.limit) : null;
  const skipPlayers = Boolean(args.skipPlayers);
  const batchAll = Boolean(args.all);
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

  for (const league of leaguesToIngest) {
    console.log(`\nFetching fixtures for league ${league}, season ${season}...`);
    const results = await ingestOneLeague(baseUrl, key, host, league, season, delayMs, limit, skipPlayers);
    const outPath = path.join(outDir, `${league}-${season}-fixtures.json`);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} fixtures to ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
