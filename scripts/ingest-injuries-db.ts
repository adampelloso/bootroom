/**
 * Fetch injury data from API-Football and upsert to Turso DB.
 * One API call per league/date combination.
 *
 * Usage: npx tsx scripts/ingest-injuries-db.ts [--date=2026-03-05] [--league=39]
 */

import "dotenv/config";
import { upsertInjuries, type InjuryRow } from "./lib/db-writer";

const ALL_LEAGUE_IDS = [
  39, 78, 135, 140, 61,           // Big 5
  88, 94, 144, 203, 179, 218,     // European tier 1.5
  207, 119, 197, 210, 103, 113,   // European tier 2
  106, 345, 283, 286, 271, 332,   // European tier 2.5
  172, 244, 318, 383, 419,        // European tier 2.5 cont.
  253, 262, 71, 128,              // Americas
  307, 98, 292, 188,              // Asia / Middle East / Oceania
  2, 3, 848,                       // European cups
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

async function fetchInjuries(
  baseUrl: string,
  key: string,
  host: string | undefined,
  league: number,
  season: number,
  date: string,
) {
  const url = `${baseUrl}/injuries?league=${league}&season=${season}&date=${date}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status} for league ${league}`);
  const data = (await res.json()) as any;
  return data.response ?? [];
}

async function main() {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = process.env.API_FOOTBALL_HOST;
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }
  if (!process.env.TURSO_DATABASE_URL) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const args = parseArgs();
  const date = typeof args.date === "string" ? args.date : new Date().toISOString().slice(0, 10);
  const season = Number(args.season ?? 2025);
  const singleLeague = typeof args.league === "string" ? Number(args.league) : null;
  const leagues = singleLeague ? [singleLeague] : ALL_LEAGUE_IDS;

  console.log(`Fetching injuries for ${date} across ${leagues.length} leagues...`);

  const allRows: InjuryRow[] = [];

  for (const league of leagues) {
    const leagueSeason = getSeasonForLeague(league, season);
    process.stdout.write(`League ${league} (season ${leagueSeason})... `);

    try {
      const injuries = await fetchInjuries(baseUrl, key, host, league, leagueSeason, date);

      for (const entry of injuries) {
        const player = entry.player;
        const team = entry.team;
        const fixture = entry.fixture;
        if (!player?.id || !team?.id) continue;

        allRows.push({
          playerId: player.id,
          playerName: player.name ?? "Unknown",
          teamId: team.id,
          leagueId: entry.league?.id ?? league,
          type: player.type ?? "Missing Fixture",
          reason: player.reason ?? null,
          fixtureId: fixture?.id ?? null,
          updatedAt: Date.now(),
        });
      }

      console.log(`${injuries.length} injuries`);
      await new Promise((r) => setTimeout(r, 2500));
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  if (allRows.length > 0) {
    console.log(`\nUpserting ${allRows.length} injuries...`);
    await upsertInjuries(allRows);
  }

  console.log(`Done. ${allRows.length} total injuries ingested.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
