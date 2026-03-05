/**
 * Sync fixture + team data from ingested JSON files to Turso DB.
 * Reads season fixture files and upcoming-fixtures.json, writes to DB.
 * Run after season-ingest.mjs and ingest-upcoming-fixtures.mjs.
 *
 * Usage: npx tsx scripts/sync-fixtures-to-db.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { upsertFixtures, upsertTeams, type FixtureRow, type TeamRow } from "./lib/db-writer";

const DATA_DIR = path.join(process.cwd(), "data");

// ── Parse season fixture files ──────────────────────────────────────

interface SeasonFixtureEntry {
  fixture: {
    fixture?: { id: number; date: string; referee?: string | null; venue?: { name?: string }; status?: { short?: string } };
    id?: number;
    date?: string;
    referee?: string | null;
    venue?: { name?: string };
    status?: { short?: string };
    league?: { id?: number; season?: number; round?: string };
    teams?: { home: { id: number; name: string; logo?: string }; away: { id: number; name: string; logo?: string } };
    goals?: { home: number | null; away: number | null };
    score?: { halftime?: { home: number | null; away: number | null } };
  };
  stats?: unknown[];
  players?: unknown[];
}

function parseSeasonFixtures(): { fixtures: FixtureRow[]; teams: TeamRow[] } {
  const fixtures: FixtureRow[] = [];
  const teamMap = new Map<number, TeamRow>();

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.match(/^\d+-\d+-fixtures\.json$/));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    let entries: SeasonFixtureEntry[];
    try { entries = JSON.parse(raw); } catch { continue; }
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      // Handle nested fixture format (season-ingest produces { fixture: { fixture: {...}, league: {...}, ... } })
      const f = entry.fixture;
      const fix = f.fixture ?? f;
      const fixtureId = (fix as any).id;
      if (!fixtureId) continue;

      const league = f.league ?? (f as any).league;
      const teams = f.teams ?? (f as any).teams;
      const goals = f.goals ?? (f as any).goals;
      const score = f.score ?? (f as any).score;
      const dateStr = (fix as any).date ?? "";

      if (!teams) continue;

      fixtures.push({
        id: fixtureId,
        leagueId: league?.id ?? 0,
        season: league?.season ?? new Date(dateStr).getFullYear(),
        round: league?.round ?? null,
        date: dateStr.slice(0, 10),
        kickoffUtc: dateStr,
        status: (fix as any).status?.short ?? "FT",
        homeTeamId: teams.home.id,
        homeTeamName: teams.home.name,
        awayTeamId: teams.away.id,
        awayTeamName: teams.away.name,
        homeGoals: goals?.home ?? null,
        awayGoals: goals?.away ?? null,
        htHomeGoals: score?.halftime?.home ?? null,
        htAwayGoals: score?.halftime?.away ?? null,
        venueName: (fix as any).venue?.name ?? null,
        referee: (fix as any).referee ?? null,
        updatedAt: Date.now(),
      });

      // Collect teams — logo comes from fixture data, code from team.code if present
      if (!teamMap.has(teams.home.id)) {
        teamMap.set(teams.home.id, { id: teams.home.id, name: teams.home.name, code: teams.home.code ?? null, logo: teams.home.logo ?? null });
      }
      if (!teamMap.has(teams.away.id)) {
        teamMap.set(teams.away.id, { id: teams.away.id, name: teams.away.name, code: teams.away.code ?? null, logo: teams.away.logo ?? null });
      }
    }
  }

  return { fixtures, teams: [...teamMap.values()] };
}

// ── Parse upcoming fixtures file ────────────────────────────────────

interface UpcomingEntry {
  fixtureId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  leagueName?: string;
  round?: string | null;
  season: number;
  venue?: string | null;
}

function parseUpcomingFixtures(): FixtureRow[] {
  const filePath = path.join(DATA_DIR, "upcoming-fixtures.json");
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  let entries: UpcomingEntry[];
  try { entries = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(entries)) return [];

  return entries.map((e) => ({
    id: e.fixtureId,
    leagueId: e.leagueId,
    season: e.season,
    round: e.round ?? null,
    date: e.date.slice(0, 10),
    kickoffUtc: e.date,
    status: "NS",
    homeTeamId: e.homeTeamId,
    homeTeamName: e.homeTeam,
    awayTeamId: e.awayTeamId,
    awayTeamName: e.awayTeam,
    homeGoals: null,
    awayGoals: null,
    htHomeGoals: null,
    htAwayGoals: null,
    venueName: e.venue ?? null,
    referee: null,
    updatedAt: Date.now(),
  }));
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("Missing TURSO_DATABASE_URL");
    process.exit(1);
  }

  console.log("Parsing season fixture files...");
  const { fixtures: seasonFixtures, teams } = parseSeasonFixtures();
  console.log(`  Found ${seasonFixtures.length} season fixtures, ${teams.length} teams`);

  console.log("Parsing upcoming fixtures...");
  const upcomingFixtures = parseUpcomingFixtures();
  console.log(`  Found ${upcomingFixtures.length} upcoming fixtures`);

  // Merge: upcoming fixtures override season fixtures (more current status)
  const allFixtures = [...seasonFixtures, ...upcomingFixtures];
  console.log(`\nWriting ${allFixtures.length} fixtures to DB...`);
  await upsertFixtures(allFixtures);

  console.log(`Writing ${teams.length} teams to DB...`);
  await upsertTeams(teams);

  console.log("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
