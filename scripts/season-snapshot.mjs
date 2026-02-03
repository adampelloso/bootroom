import fs from "fs";
import path from "path";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  if (!fs.existsSync(envPath)) {
    return env;
  }
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

function toDate(iso) {
  return new Date(iso).getTime();
}

function ensureArray(map, key) {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
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

function summarizeTeamStats(teamFixtures) {
  const total = teamFixtures.reduce(
    (acc, f) => {
      acc.goalsFor += f.goalsFor;
      acc.goalsAgainst += f.goalsAgainst;
      acc.btts += f.btts ? 1 : 0;
      return acc;
    },
    { goalsFor: 0, goalsAgainst: 0, btts: 0 },
  );
  const count = teamFixtures.length || 1;
  return {
    goalsFor: total.goalsFor / count,
    goalsAgainst: total.goalsAgainst / count,
    bttsRate: total.btts / count,
  };
}

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const league = Number(args.league ?? 39);
  const season = Number(args.season ?? 2025);
  const baseUrl = env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = env.API_FOOTBALL_HOST;
  const key = env.API_FOOTBALL_KEY;

  if (!key) {
    console.error("Missing API_FOOTBALL_KEY in .env");
    process.exit(1);
  }

  console.log(`Fetching fixtures for league ${league}, season ${season}...`);
  const fixturesRes = await fetchJson(baseUrl, key, host, `/fixtures?league=${league}&season=${season}`);
  const fixtures = fixturesRes.response ?? [];

  const finished = fixtures.filter(
    (f) => f.goals?.home != null && f.goals?.away != null,
  );

  console.log(`Fixtures: ${fixtures.length} total, ${finished.length} finished`);

  const byTeam = new Map();
  for (const fixture of finished) {
    const kickoff = fixture.fixture?.date;
    const home = fixture.teams?.home;
    const away = fixture.teams?.away;
    if (!home || !away || !kickoff) continue;
    const homeEntry = {
      date: kickoff,
      goalsFor: fixture.goals.home ?? 0,
      goalsAgainst: fixture.goals.away ?? 0,
      btts: (fixture.goals.home ?? 0) > 0 && (fixture.goals.away ?? 0) > 0,
    };
    const awayEntry = {
      date: kickoff,
      goalsFor: fixture.goals.away ?? 0,
      goalsAgainst: fixture.goals.home ?? 0,
      btts: homeEntry.btts,
    };
    ensureArray(byTeam, home.name).push(homeEntry);
    ensureArray(byTeam, away.name).push(awayEntry);
  }

  const summaries = [];
  for (const [team, fixturesList] of byTeam.entries()) {
    const sorted = fixturesList.sort((a, b) => toDate(a.date) - toDate(b.date));
    const seasonStats = summarizeTeamStats(sorted);
    const l5Stats = summarizeTeamStats(sorted.slice(-5));
    const l10Stats = summarizeTeamStats(sorted.slice(-10));
    summaries.push({ team, season: seasonStats, l5: l5Stats, l10: l10Stats });
  }

  summaries.sort((a, b) => b.l5.goalsFor - a.l5.goalsFor);
  console.log("Top 5 teams by L5 goals per match:");
  for (const row of summaries.slice(0, 5)) {
    console.log(
      `- ${row.team}: L5 GF ${row.l5.goalsFor.toFixed(2)}, GA ${row.l5.goalsAgainst.toFixed(2)}, BTTS ${(row.l5.bttsRate * 100).toFixed(0)}%`,
    );
  }

  console.log("\nTop 5 teams by season goals per match:");
  summaries.sort((a, b) => b.season.goalsFor - a.season.goalsFor);
  for (const row of summaries.slice(0, 5)) {
    console.log(
      `- ${row.team}: Season GF ${row.season.goalsFor.toFixed(2)}, GA ${row.season.goalsAgainst.toFixed(2)}, BTTS ${(row.season.bttsRate * 100).toFixed(0)}%`,
    );
  }

  console.log("\nNotes:");
  console.log("- This snapshot uses fixture-level goal data only.");
  console.log("- Shots/corners require per-fixture statistics calls; we can add that with a capped batch if needed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
