/**
 * Ingest team metadata (codes, logos) from API-Football into Turso DB.
 * Fetches /teams for each supported league and upserts to team table.
 * Team codes (3-letter abbreviations) only come from this endpoint.
 *
 * Usage: npx tsx scripts/ingest-teams-db.ts
 */

import "dotenv/config";
import { upsertTeams, type TeamRow } from "./lib/db-writer";

const ALL_LEAGUE_IDS = [
  39, 78, 135, 140, 61,
  88, 94, 144, 203, 179, 218,
  207, 119, 197, 210, 103, 113,
  106, 345, 283,
  253, 262, 71, 128,
  307, 98, 292, 188,
  40, 41, 42, 136, 79, 141, 62,
  2, 3, 848,
  48, 45, 137, 143, 66, 81,
];

const CALENDAR_YEAR_LEAGUES = new Set([253, 71, 128, 98, 292, 103, 113]);

function getSeasonForLeague(league: number, baseSeason: number): number {
  return CALENDAR_YEAR_LEAGUES.has(league) ? baseSeason + 1 : baseSeason;
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = process.env.API_FOOTBALL_HOST;
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }
  if (!process.env.TURSO_DATABASE_URL) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const baseSeason = 2025;
  const teamMap = new Map<number, TeamRow>();

  for (const leagueId of ALL_LEAGUE_IDS) {
    const season = getSeasonForLeague(leagueId, baseSeason);
    console.log(`Fetching teams for league ${leagueId}, season ${season}...`);
    try {
      const res = await fetch(`${baseUrl}/teams?league=${leagueId}&season=${season}`, {
        headers: {
          "x-apisports-key": key,
          ...(host ? { "x-rapidapi-host": host } : {}),
        },
      });
      if (!res.ok) { console.warn(`  Failed: ${res.status}`); continue; }
      const data = await res.json() as { response?: Array<{ team: { id: number; name: string; code: string | null; logo: string } }> };
      for (const { team: t } of data.response ?? []) {
        teamMap.set(t.id, { id: t.id, name: t.name, code: t.code ?? null, logo: t.logo ?? null });
      }
      console.log(`  ${(data.response ?? []).length} teams`);
    } catch (err) {
      console.warn(`  Error: ${err}`);
    }
    await delay(2000);
  }

  console.log(`\nWriting ${teamMap.size} teams to DB...`);
  await upsertTeams([...teamMap.values()]);
  console.log("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
