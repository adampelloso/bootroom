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
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { fixture } from "../lib/db-schema";
import { upsertFixtureOdds, type FixtureOddsRow } from "./lib/db-writer";
import { getOddsForFixtures } from "../lib/db-queries";
import { extractMarketProbsFromApiFootball } from "../lib/odds/api-football-odds";
import type { ApiFootballOddsResponse } from "../lib/api-football-types";

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_DELAY_MS = 3000;

interface Args {
  statuses: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  delayMs: number;
  batchSize: number;
  missingOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    statuses: ["NS"],
    delayMs: DEFAULT_DELAY_MS,
    batchSize: DEFAULT_BATCH_SIZE,
    missingOnly: true,
  };
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [k, v] = arg.slice(2).split("=");
    if (!k) continue;
    if (k === "statuses" && v) {
      const parsed = v.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
      if (parsed.length > 0) out.statuses = parsed;
    } else if (k === "date-from" && v) {
      out.dateFrom = v;
    } else if (k === "date-to" && v) {
      out.dateTo = v;
    } else if (k === "limit" && v) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out.limit = Math.floor(n);
    } else if (k === "delay-ms" && v) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out.delayMs = Math.floor(n);
    } else if (k === "batch-size" && v) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out.batchSize = Math.floor(n);
    } else if (k === "missing-only") {
      out.missingOnly = v == null ? true : v !== "false";
    }
  }
  return out;
}

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
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const host = process.env.API_FOOTBALL_HOST;
  const key = process.env.API_FOOTBALL_KEY;
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (!key) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }
  if (!tursoUrl) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const db = drizzle(createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN }));

  // Get target fixtures from DB
  const whereParts = [inArray(fixture.status, args.statuses)];
  if (args.dateFrom) whereParts.push(gte(fixture.date, args.dateFrom));
  if (args.dateTo) whereParts.push(lte(fixture.date, args.dateTo));
  const whereClause = whereParts.length > 1 ? and(...whereParts) : whereParts[0];

  const baseQuery = db
    .select({ id: fixture.id })
    .from(fixture)
    .where(whereClause)
    .orderBy(sql`${fixture.date} desc`);
  let targetFixtures = args.limit
    ? await baseQuery.limit(args.limit)
    : await baseQuery;

  if (args.missingOnly && targetFixtures.length > 0) {
    const ids = targetFixtures.map((f) => f.id);
    const existing = await getOddsForFixtures(ids);
    targetFixtures = targetFixtures.filter((f) => !existing.has(f.id));
  }

  console.log(
    `Found ${targetFixtures.length} fixtures for odds ingest` +
      ` (statuses=${args.statuses.join(",")}` +
      `${args.dateFrom ? `, from=${args.dateFrom}` : ""}` +
      `${args.dateTo ? `, to=${args.dateTo}` : ""}` +
      `${args.limit ? `, limit=${args.limit}` : ""}` +
      `, batchSize=${args.batchSize}` +
      `, delayMs=${args.delayMs}` +
      `, missingOnly=${args.missingOnly}` +
      `)`
  );
  if (targetFixtures.length === 0) return;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetFixtures.length; i += args.batchSize) {
    const batch = targetFixtures.slice(i, i + args.batchSize);
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

    console.log(`  Batch ${Math.floor(i / args.batchSize) + 1}: ${validRows.length}/${batch.length} odds saved`);
    if (i + args.batchSize < targetFixtures.length) await delay(args.delayMs);
  }

  console.log(`\nDone: ${successCount} odds saved, ${failCount} failed/no-odds`);
}

main().catch((err) => { console.error(err); process.exit(1); });
