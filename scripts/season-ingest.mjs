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

async function main() {
  const env = readEnv();
  const args = parseArgs();
  const league = Number(args.league ?? 39);
  const season = Number(args.season ?? 2025);
  const delayMs = Number(args.delay ?? 5000);
  const limit = args.limit ? Number(args.limit) : null;
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
    (f) => f.fixture?.status?.short === "FT" && f.goals?.home != null && f.goals?.away != null,
  );

  const selected = limit ? finished.slice(0, limit) : finished;
  console.log(`Finished fixtures: ${finished.length}. Processing ${selected.length}...`);

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, `epl-${season}-fixtures.json`);

  const results = [];
  let index = 0;

  for (const fixture of selected) {
    index += 1;
    const fixtureId = fixture.fixture.id;
    console.log(`[${index}/${selected.length}] fixture ${fixtureId}`);
    const stats = await fetchJson(baseUrl, key, host, `/fixtures/statistics?fixture=${fixtureId}`);
    await delay(delayMs);
    const players = await fetchJson(baseUrl, key, host, `/fixtures/players?fixture=${fixtureId}`);
    await delay(delayMs);

    results.push({
      fixture,
      stats: stats.response ?? [],
      players: players.response ?? [],
    });
  }

  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} fixtures to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
