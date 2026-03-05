/**
 * Ingest H2H data from API-Football into Turso DB.
 * For each unique team pair in upcoming fixtures, fetches last 20 H2H meetings,
 * ensures they exist in the fixture table, and writes to the h2h table.
 *
 * Usage: npx tsx scripts/ingest-h2h-db.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { fixture } from "../lib/db-schema";
import { upsertFixtures, replaceH2H, type FixtureRow } from "./lib/db-writer";
import type { ApiFootballFixturesResponse, ApiFootballFixtureResponseItem } from "../lib/api-football-types";

const BATCH_SIZE = 5;
const DELAY_MS = 3000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchH2H(
  baseUrl: string,
  key: string,
  host: string | undefined,
  teamAId: number,
  teamBId: number,
  last: number = 20,
): Promise<ApiFootballFixturesResponse> {
  const url = `${baseUrl}/fixtures/headtohead?h2h=${teamAId}-${teamBId}&last=${last}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) throw new Error(`H2H fetch failed for ${teamAId}-${teamBId}: ${res.status}`);
  return res.json() as Promise<ApiFootballFixturesResponse>;
}

function apiItemToFixtureRow(item: ApiFootballFixtureResponseItem): FixtureRow {
  return {
    id: item.fixture.id,
    leagueId: item.league?.id ?? 0,
    season: item.league?.season ?? new Date(item.fixture.date).getFullYear(),
    round: item.league?.round ?? null,
    date: item.fixture.date.slice(0, 10),
    kickoffUtc: item.fixture.date,
    status: item.fixture.status.short,
    homeTeamId: item.teams.home.id,
    homeTeamName: item.teams.home.name,
    awayTeamId: item.teams.away.id,
    awayTeamName: item.teams.away.name,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
    htHomeGoals: item.score?.halftime?.home ?? null,
    htAwayGoals: item.score?.halftime?.away ?? null,
    venueName: item.fixture.venue?.name ?? null,
    referee: item.fixture.referee ?? null,
    updatedAt: Date.now(),
  };
}

async function main() {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = process.env.API_FOOTBALL_HOST;
  const key = process.env.API_FOOTBALL_KEY;
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (!key) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }
  if (!tursoUrl) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const db = drizzle(createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN }));

  // Get upcoming fixtures from DB
  const upcoming = await db
    .select({
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
    })
    .from(fixture)
    .where(eq(fixture.status, "NS"));

  // Deduplicate team pairs (sorted IDs)
  const seen = new Set<string>();
  const pairs: { teamAId: number; teamBId: number }[] = [];
  for (const { homeTeamId, awayTeamId } of upcoming) {
    const a = Math.min(homeTeamId, awayTeamId);
    const b = Math.max(homeTeamId, awayTeamId);
    const key = `${a}-${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ teamAId: a, teamBId: b });
  }

  console.log(`Found ${pairs.length} unique team pairs for H2H ingest`);
  if (pairs.length === 0) return;

  let successCount = 0;

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ teamAId, teamBId }) => {
        try {
          const res = await fetchH2H(baseUrl, key, host, teamAId, teamBId);
          const items = res.response ?? [];
          if (items.length === 0) return;

          // Ensure all H2H fixtures exist in the fixture table
          const fixtureRows = items.map(apiItemToFixtureRow);
          await upsertFixtures(fixtureRows);

          // Write H2H links
          const fixtureIds = items.map((item) => item.fixture.id);
          await replaceH2H(teamAId, teamBId, fixtureIds);
          successCount++;
          console.log(`  H2H ${teamAId}-${teamBId}: ${items.length} meetings`);
        } catch (err) {
          console.warn(`  Failed H2H for ${teamAId}-${teamBId}: ${err}`);
        }
      }),
    );

    if (i + BATCH_SIZE < pairs.length) await delay(DELAY_MS);
  }

  console.log(`\nDone: ${successCount}/${pairs.length} H2H pairs ingested`);
}

main().catch((err) => { console.error(err); process.exit(1); });
