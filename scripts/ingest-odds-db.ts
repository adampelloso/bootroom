/**
 * Ingest odds from API-Football into Turso DB.
 * Reads upcoming fixtures from DB (status = 'NS'), fetches odds, extracts fair market probs.
 * Replaces the Python ingest-odds.py script entirely.
 *
 * Usage: npx tsx scripts/ingest-odds-db.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { fixture } from "../lib/db-schema";
import { upsertFixtureOdds, type FixtureOddsRow } from "./lib/db-writer";
import { extractMarketProbsFromApiFootball } from "../lib/odds/api-football-odds";
import type { ApiFootballOddsResponse } from "../lib/api-football-types";

const BATCH_SIZE = 5;
const DELAY_MS = 3000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOdds(
  baseUrl: string,
  key: string,
  host: string | undefined,
  fixtureId: number,
): Promise<ApiFootballOddsResponse> {
  const url = `${baseUrl}/odds?fixture=${fixtureId}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      ...(host ? { "x-rapidapi-host": host } : {}),
    },
  });
  if (!res.ok) throw new Error(`Odds fetch failed for fixture ${fixtureId}: ${res.status}`);
  return res.json() as Promise<ApiFootballOddsResponse>;
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
    .select({ id: fixture.id })
    .from(fixture)
    .where(eq(fixture.status, "NS"));

  console.log(`Found ${upcoming.length} upcoming fixtures to fetch odds for`);
  if (upcoming.length === 0) return;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < upcoming.length; i += BATCH_SIZE) {
    const batch = upcoming.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ id }) => {
        try {
          const oddsRes = await fetchOdds(baseUrl, key, host, id);
          const probs = extractMarketProbsFromApiFootball(oddsRes);
          if (!probs) return null;
          return {
            fixtureId: id,
            homeProb: probs.home,
            drawProb: probs.draw,
            awayProb: probs.away,
            over25Prob: probs.over_2_5 ?? null,
            under25Prob: probs.under_2_5 ?? null,
            bttsProb: probs.btts ?? null,
            updatedAt: Date.now(),
          } satisfies FixtureOddsRow;
        } catch (err) {
          console.warn(`  Failed odds for fixture ${id}: ${err}`);
          return null;
        }
      }),
    );

    const validRows = results.filter((r) => r !== null) as FixtureOddsRow[];
    if (validRows.length > 0) {
      await upsertFixtureOdds(validRows);
      successCount += validRows.length;
    }
    failCount += results.length - validRows.length;

    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${validRows.length}/${batch.length} odds saved`);
    if (i + BATCH_SIZE < upcoming.length) await delay(DELAY_MS);
  }

  console.log(`\nDone: ${successCount} odds saved, ${failCount} failed/no-odds`);
}

main().catch((err) => { console.error(err); process.exit(1); });
