/**
 * Fetch fixture results directly from API-Football and upsert to Turso DB.
 * One API call per league — no per-fixture detail calls.
 * This is the fast path: gets scores, teams, dates into the DB quickly.
 *
 * Usage: npx tsx scripts/sync-fixtures-api-to-db.ts [--season=2025] [--league=39]
 */

import "dotenv/config";
import { upsertFixtures, upsertTeams, type FixtureRow, type TeamRow } from "./lib/db-writer";

const ALL_LEAGUE_IDS = [
  39, 78, 135, 140, 61,           // Big 5
  88, 94, 144, 203, 179, 218,     // European tier 1.5
  207, 119, 197, 210, 103, 113,   // European tier 2
  106, 345, 283, 286, 271, 332,   // European tier 2.5
  172, 244, 318, 383, 419,        // European tier 2.5 cont.
  253, 262, 71, 128,              // Americas
  307, 98, 292, 188,              // Asia / Middle East / Oceania
  40, 41, 42, 136, 79, 141, 62,  // Second-tier leagues
  2, 3, 848,                       // European cups
  48, 45, 137, 143, 66, 81,      // Domestic cups
];

const CALENDAR_YEAR_LEAGUES = new Set([253, 71, 128, 98, 292, 103, 113]);

function getSeasonForLeague(league: number, defaultSeason: number): number {
  if (CALENDAR_YEAR_LEAGUES.has(league)) return defaultSeason + 1;
  return defaultSeason;
}

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    out[key] = value ?? true;
  }
  return out;
}

async function fetchFixtures(baseUrl: string, key: string, host: string | undefined, league: number, season: number) {
  const url = `${baseUrl}/fixtures?league=${league}&season=${season}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status} for league ${league}`);
  const data = await res.json() as any;
  return data.response ?? [];
}

async function main() {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = process.env.API_FOOTBALL_HOST;
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }
  if (!process.env.TURSO_DATABASE_URL) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const args = parseArgs();
  const season = Number(args.season ?? 2025);
  const singleLeague = args.league ? Number(args.league) : null;
  const leagues = singleLeague ? [singleLeague] : ALL_LEAGUE_IDS;

  let totalFixtures = 0;
  const teamMap = new Map<number, TeamRow>();

  for (const league of leagues) {
    const leagueSeason = getSeasonForLeague(league, season);
    process.stdout.write(`League ${league} (season ${leagueSeason})... `);

    try {
      const fixtures = await fetchFixtures(baseUrl, key, host, league, leagueSeason);
      const rows: FixtureRow[] = [];

      for (const f of fixtures) {
        const fix = f.fixture;
        const teams = f.teams;
        const goals = f.goals;
        const score = f.score;
        if (!fix?.id || !teams) continue;

        rows.push({
          id: fix.id,
          leagueId: f.league?.id ?? league,
          season: f.league?.season ?? leagueSeason,
          round: f.league?.round ?? null,
          date: (fix.date ?? "").slice(0, 10),
          kickoffUtc: fix.date ?? "",
          status: fix.status?.short ?? "NS",
          homeTeamId: teams.home.id,
          homeTeamName: teams.home.name,
          awayTeamId: teams.away.id,
          awayTeamName: teams.away.name,
          homeGoals: goals?.home ?? null,
          awayGoals: goals?.away ?? null,
          htHomeGoals: score?.halftime?.home ?? null,
          htAwayGoals: score?.halftime?.away ?? null,
          venueName: fix.venue?.name ?? null,
          referee: fix.referee ?? null,
          updatedAt: Date.now(),
        });

        if (!teamMap.has(teams.home.id)) {
          teamMap.set(teams.home.id, { id: teams.home.id, name: teams.home.name, code: teams.home.code ?? null, logo: teams.home.logo ?? null });
        }
        if (!teamMap.has(teams.away.id)) {
          teamMap.set(teams.away.id, { id: teams.away.id, name: teams.away.name, code: teams.away.code ?? null, logo: teams.away.logo ?? null });
        }
      }

      await upsertFixtures(rows);
      console.log(`${rows.length} fixtures`);
      totalFixtures += rows.length;

      // Respect API rate limits (30 req/min on free plan)
      await new Promise((r) => setTimeout(r, 2500));
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  console.log(`\nUpserting ${teamMap.size} teams...`);
  await upsertTeams([...teamMap.values()]);

  console.log(`Done. ${totalFixtures} fixtures across ${leagues.length} leagues.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
