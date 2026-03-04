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

async function fetchJson(baseUrl, key, host, urlPath) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API-Football ${urlPath} failed (${res.status})`);
  }
  return res.json();
}

// Keep in sync with lib/leagues.ts ALL_COMPETITION_IDS and season-ingest.mjs
const ALL_LEAGUE_IDS = [
  39, 78, 135, 140, 61,           // Big 5
  88, 94, 144, 203, 179, 218,     // European tier 1.5
  207, 119, 197, 210, 103, 113,   // European tier 2
  106, 345,                        // European tier 2 cont.
  253, 262, 71, 128,              // Americas
  307, 98, 292, 188,              // Asia / Middle East / Oceania
  40, 41, 42, 136, 79, 141, 62,   // Second-tier leagues
  2, 3, 848,                       // European cups
  48, 45, 137, 143, 66, 81,       // Domestic cups
];

// Calendar-year leagues need current year as season (not European season start year).
const CALENDAR_YEAR_LEAGUES = new Set([
  253, 71, 128, 98, 292, 103, 113,
]);

function getSeasonForLeague(league, defaultSeason) {
  if (CALENDAR_YEAR_LEAGUES.has(league)) return defaultSeason + 1;
  return defaultSeason;
}

function flattenPlayer(item) {
  const player = item.player;
  const stats = item.statistics?.[0];
  if (!player || !stats) return null;

  return {
    playerId: player.id,
    name: player.name,
    teamId: stats.team?.id ?? null,
    teamName: stats.team?.name ?? null,
    position: stats.games?.position ?? null,
    appearances: stats.games?.appearences ?? 0,
    minutes: stats.games?.minutes ?? 0,
    shotsTotal: stats.shots?.total ?? 0,
    shotsOn: stats.shots?.on ?? 0,
    goals: stats.goals?.total ?? 0,
    assists: stats.goals?.assists ?? 0,
    keyPasses: stats.passes?.key ?? 0,
    rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
    lineups: stats.games?.lineups ?? 0,
  };
}

async function ingestOneLeague(baseUrl, key, host, league, season, delayMs) {
  const allPlayers = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    console.log(`  page ${page}/${totalPages}`);
    const res = await fetchJson(
      baseUrl,
      key,
      host,
      `/players?league=${league}&season=${season}&page=${page}`
    );
    totalPages = res.paging?.total ?? 1;
    const items = res.response ?? [];
    for (const item of items) {
      const flat = flattenPlayer(item);
      if (flat) allPlayers.push(flat);
    }
    page++;
    if (page <= totalPages) await delay(delayMs);
  }

  return allPlayers;
}

const FRESH_THRESHOLD_MS = 20 * 60 * 60 * 1000; // 20 hours

function isFileFresh(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  return Date.now() - stat.mtimeMs < FRESH_THRESHOLD_MS;
}

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const season = Number(args.season ?? 2025);
  const delayMs = Number(args.delay ?? 3000);
  const batchAll = Boolean(args.all);
  const skipIfFresh = Boolean(args["skip-if-fresh"]);
  const baseUrl =
    env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
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
    const leagueSeason = getSeasonForLeague(league, season);
    const outPath = path.join(outDir, `${league}-${leagueSeason}-players.json`);

    if (skipIfFresh && isFileFresh(outPath)) {
      console.log(`\nSkipping league ${league} — player file is fresh (< 20h old)`);
      continue;
    }

    console.log(
      `\nFetching player stats for league ${league}, season ${leagueSeason}...`
    );
    const players = await ingestOneLeague(
      baseUrl,
      key,
      host,
      league,
      leagueSeason,
      delayMs
    );
    fs.writeFileSync(outPath, JSON.stringify(players, null, 2));
    console.log(`Saved ${players.length} players to ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
