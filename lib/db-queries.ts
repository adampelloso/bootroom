/**
 * Runtime DB read functions. All sports data access for page rendering.
 * Zero external API calls — reads exclusively from Turso.
 */

import { getDb } from "./db";
import { fixture, team, fixtureOdds, h2h } from "./db-schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import type { MarketProbabilities } from "@/lib/odds/the-odds-api";

export type DbFixture = typeof fixture.$inferSelect;

export async function getFixturesByDateRange(
  from: string,
  to: string,
  leagueIds?: number[],
): Promise<DbFixture[]> {
  const db = getDb();
  if (leagueIds && leagueIds.length > 0) {
    return db
      .select()
      .from(fixture)
      .where(
        and(
          gte(fixture.date, from),
          lte(fixture.date, to),
          inArray(fixture.leagueId, leagueIds),
        ),
      )
      .orderBy(fixture.kickoffUtc);
  }
  return db
    .select()
    .from(fixture)
    .where(and(gte(fixture.date, from), lte(fixture.date, to)))
    .orderBy(fixture.kickoffUtc);
}

export async function getFixtureById(id: number): Promise<DbFixture | null> {
  const db = getDb();
  const rows = await db.select().from(fixture).where(eq(fixture.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTeamCodeMap(teamIds: number[]): Promise<Map<number, string>> {
  if (teamIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ id: team.id, code: team.code })
    .from(team)
    .where(inArray(team.id, teamIds));
  const map = new Map<number, string>();
  for (const row of rows) {
    if (row.code) map.set(row.id, row.code);
  }
  return map;
}

export async function getTeamLogoMap(teamIds: number[]): Promise<Map<number, string>> {
  if (teamIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ id: team.id, logo: team.logo })
    .from(team)
    .where(inArray(team.id, teamIds));
  const map = new Map<number, string>();
  for (const row of rows) {
    if (row.logo) map.set(row.id, row.logo);
  }
  return map;
}

export async function getOddsForFixtures(
  fixtureIds: number[],
): Promise<Map<number, MarketProbabilities>> {
  if (fixtureIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select()
    .from(fixtureOdds)
    .where(inArray(fixtureOdds.fixtureId, fixtureIds));
  const map = new Map<number, MarketProbabilities>();
  for (const row of rows) {
    map.set(row.fixtureId, {
      home: row.homeProb,
      draw: row.drawProb,
      away: row.awayProb,
      over_2_5: row.over25Prob ?? undefined,
      under_2_5: row.under25Prob ?? undefined,
      btts: row.bttsProb ?? undefined,
    });
  }
  return map;
}

export async function getH2HFixtures(
  teamAId: number,
  teamBId: number,
  limit: number = 20,
): Promise<DbFixture[]> {
  const db = getDb();
  const a = Math.min(teamAId, teamBId);
  const b = Math.max(teamAId, teamBId);
  const h2hRows = await db
    .select({ fixtureId: h2h.fixtureId })
    .from(h2h)
    .where(and(eq(h2h.teamAId, a), eq(h2h.teamBId, b)))
    .limit(limit);
  if (h2hRows.length === 0) return [];
  const fixtureIds = h2hRows.map((r) => r.fixtureId);
  return db
    .select()
    .from(fixture)
    .where(inArray(fixture.id, fixtureIds))
    .orderBy(sql`${fixture.date} DESC`);
}

/** Get recent form (W/D/L) for a team from the DB. */
export async function getTeamFormFromDb(
  teamId: number,
  beforeDate: string,
  n: number = 5,
): Promise<import("@/lib/feed").FormResult[]> {
  const db = getDb();
  const rows = await db
    .select({
      homeTeamId: fixture.homeTeamId,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
    })
    .from(fixture)
    .where(
      and(
        sql`(${fixture.homeTeamId} = ${teamId} OR ${fixture.awayTeamId} = ${teamId})`,
        sql`${fixture.date} < ${beforeDate}`,
        sql`${fixture.status} IN ('FT', 'AET', 'PEN')`,
        sql`${fixture.homeGoals} IS NOT NULL`,
      ),
    )
    .orderBy(sql`${fixture.date} DESC`)
    .limit(n);

  // Reverse so oldest is first (chronological order)
  rows.reverse();

  return rows.map((r): import("@/lib/feed").FormResult => {
    const isHome = r.homeTeamId === teamId;
    const goalsFor = isHome ? r.homeGoals! : r.awayGoals!;
    const goalsAgainst = isHome ? r.awayGoals! : r.homeGoals!;
    if (goalsFor > goalsAgainst) return "W";
    if (goalsFor < goalsAgainst) return "L";
    return "D";
  });
}

/** Batch fetch form for multiple teams. */
export async function getTeamFormBatch(
  teamIds: number[],
  beforeDate: string,
  n: number = 5,
): Promise<Map<number, import("@/lib/feed").FormResult[]>> {
  const result = new Map<number, import("@/lib/feed").FormResult[]>();
  // Run in parallel — each is a single indexed query
  await Promise.all(
    teamIds.map(async (id) => {
      const form = await getTeamFormFromDb(id, beforeDate, n);
      if (form.length > 0) result.set(id, form);
    }),
  );
  return result;
}

/** Get H2H fixtures for multiple team pairs in a single query batch. */
export async function getH2HForPairs(
  pairs: { homeId: number; awayId: number }[],
): Promise<Map<string, DbFixture[]>> {
  const result = new Map<string, DbFixture[]>();
  if (pairs.length === 0) return result;

  // Fetch all at once — small enough for feed (typically 10-20 matches per day)
  for (const { homeId, awayId } of pairs) {
    const key = `${Math.min(homeId, awayId)}-${Math.max(homeId, awayId)}`;
    if (result.has(key)) continue;
    const fixtures = await getH2HFixtures(homeId, awayId);
    result.set(key, fixtures);
  }
  return result;
}
