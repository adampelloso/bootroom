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

// Keep in sync with lib/leagues.ts ALL_COMPETITION_IDS
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

// Calendar-year leagues need the current year as season (not the European season start year).
// European leagues running Aug-May use the start year (e.g. 2025 for 2025-26).
const CALENDAR_YEAR_LEAGUES = new Set([
  253,  // MLS
  71,   // Série A (Brazil)
  128,  // Liga Profesional (Argentina)
  98,   // J-League
  292,  // K-League 1
  103,  // Eliteserien (Norway)
  113,  // Allsvenskan (Sweden)
]);

function getSeasonForLeague(league, defaultSeason) {
  if (CALENDAR_YEAR_LEAGUES.has(league)) {
    return defaultSeason + 1; // e.g. 2025 → 2026
  }
  return defaultSeason;
}

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const baseSeason = Number(args.season ?? 2025);
  const days = Number(args.days ?? 7);
  const delayMs = Number(args.delay ?? 3000);
  const baseUrl = env.API_FOOTBALL_BASE_URL ?? process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = env.API_FOOTBALL_HOST ?? process.env.API_FOOTBALL_HOST;
  const key = env.API_FOOTBALL_KEY ?? process.env.API_FOOTBALL_KEY;

  if (!key) {
    console.error("Missing API_FOOTBALL_KEY in .env");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const allUpcoming = [];

  for (const league of ALL_LEAGUE_IDS) {
    const season = getSeasonForLeague(league, baseSeason);
    console.log(`Fetching upcoming fixtures for league ${league}, season ${season}...`);
    const res = await fetchJson(baseUrl, key, host, `/fixtures?league=${league}&season=${season}&status=NS`);
    const fixtures = res.response ?? [];

    // Filter to fixtures within the next N days
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;

    const upcoming = fixtures.filter((f) => {
      const kickoff = new Date(f.fixture.date).getTime();
      return kickoff >= now && kickoff <= cutoff;
    });

    console.log(`  Found ${upcoming.length} upcoming fixtures (within ${days} days)`);

    for (const item of upcoming) {
      allUpcoming.push({
        fixtureId: item.fixture.id,
        date: item.fixture.date,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeTeamId: item.teams.home.id,
        awayTeamId: item.teams.away.id,
        leagueId: item.league?.id ?? league,
        leagueName: item.league?.name,
        round: item.league?.round ?? null,
        season,
        venue: item.fixture.venue?.name ?? null,
      });
    }

    await delay(delayMs);
  }

  // Sort by kickoff date
  allUpcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const outPath = path.join(outDir, "upcoming-fixtures.json");
  fs.writeFileSync(outPath, JSON.stringify(allUpcoming, null, 2));
  console.log(`\nSaved ${allUpcoming.length} upcoming fixtures to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
