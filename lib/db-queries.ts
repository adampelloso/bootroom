/**
 * Runtime DB read functions. All sports data access for page rendering.
 * Zero external API calls — reads exclusively from Turso.
 */

import { getDb } from "./db";
import { fixture, team, fixtureOdds, h2h, injury, fixtureLineup } from "./db-schema";
import { eq, and, gte, lte, inArray, or, sql } from "drizzle-orm";
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
  const { codeMap } = await getTeamMetaMaps(teamIds);
  return codeMap;
}

export async function getTeamLogoMap(teamIds: number[]): Promise<Map<number, string>> {
  if (teamIds.length === 0) return new Map();
  const { logoMap } = await getTeamMetaMaps(teamIds);
  return logoMap;
}

export async function getTeamMetaMaps(teamIds: number[]): Promise<{
  codeMap: Map<number, string>;
  logoMap: Map<number, string>;
}> {
  if (teamIds.length === 0) {
    return {
      codeMap: new Map<number, string>(),
      logoMap: new Map<number, string>(),
    };
  }
  const db = getDb();
  const rows = await db
    .select({ id: team.id, code: team.code, logo: team.logo })
    .from(team)
    .where(inArray(team.id, teamIds));
  const codeMap = new Map<number, string>();
  const logoMap = new Map<number, string>();
  for (const row of rows) {
    if (row.code) codeMap.set(row.id, row.code);
    if (row.logo) logoMap.set(row.id, row.logo);
  }
  return { codeMap, logoMap };
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
  if (teamIds.length === 0) return new Map();
  const db = getDb();
  const result = new Map<number, import("@/lib/feed").FormResult[]>();

  // Pull a bounded recent window to avoid scanning full history for each request.
  const lowerBound = new Date(`${beforeDate}T00:00:00Z`);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - 400);
  const fromDate = lowerBound.toISOString().slice(0, 10);

  const rows = await db
    .select({
      date: fixture.date,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
    })
    .from(fixture)
    .where(
      and(
        gte(fixture.date, fromDate),
        sql`${fixture.date} < ${beforeDate}`,
        sql`${fixture.status} IN ('FT', 'AET', 'PEN')`,
        sql`${fixture.homeGoals} IS NOT NULL`,
        or(inArray(fixture.homeTeamId, teamIds), inArray(fixture.awayTeamId, teamIds)),
      ),
    )
    .orderBy(sql`${fixture.date} DESC`);

  const tracked = new Set(teamIds);
  const newestFirst = new Map<number, import("@/lib/feed").FormResult[]>();
  for (const row of rows) {
    const homeId = row.homeTeamId;
    const awayId = row.awayTeamId;
    const hg = row.homeGoals!;
    const ag = row.awayGoals!;

    if (tracked.has(homeId)) {
      const arr = newestFirst.get(homeId) ?? [];
      if (arr.length < n) {
        arr.push(hg > ag ? "W" : hg < ag ? "L" : "D");
        newestFirst.set(homeId, arr);
      }
    }

    if (tracked.has(awayId)) {
      const arr = newestFirst.get(awayId) ?? [];
      if (arr.length < n) {
        arr.push(ag > hg ? "W" : ag < hg ? "L" : "D");
        newestFirst.set(awayId, arr);
      }
    }
  }

  for (const [teamId, arr] of newestFirst) {
    if (arr.length > 0) {
      // Convert newest-first to chronological oldest-first.
      result.set(teamId, [...arr].reverse());
    }
  }

  return result;
}

/** Get H2H fixtures for multiple team pairs in a single query batch. */
export async function getH2HForPairs(
  pairs: { homeId: number; awayId: number }[],
): Promise<Map<string, DbFixture[]>> {
  const result = new Map<string, DbFixture[]>();
  if (pairs.length === 0) return result;
  const db = getDb();
  const PAIR_CHUNK_SIZE = 40;

  const uniquePairs = new Map<string, { homeId: number; awayId: number }>();
  for (const { homeId, awayId } of pairs) {
    const key = `${Math.min(homeId, awayId)}-${Math.max(homeId, awayId)}`;
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { homeId, awayId });
    }
  }

  const uniqueValues = Array.from(uniquePairs.values());
  const h2hRows: Array<{ teamAId: number; teamBId: number; fixtureId: number }> = [];
  for (let i = 0; i < uniqueValues.length; i += PAIR_CHUNK_SIZE) {
    const chunk = uniqueValues.slice(i, i + PAIR_CHUNK_SIZE);
    const conditions = chunk.map(({ homeId, awayId }) =>
      and(
        eq(h2h.teamAId, Math.min(homeId, awayId)),
        eq(h2h.teamBId, Math.max(homeId, awayId)),
      ),
    );
    const chunkRows = await db
      .select({
        teamAId: h2h.teamAId,
        teamBId: h2h.teamBId,
        fixtureId: h2h.fixtureId,
      })
      .from(h2h)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .orderBy(sql`${h2h.fixtureId} DESC`);
    h2hRows.push(...chunkRows);
  }

  if (h2hRows.length === 0) return result;

  const fixtureIdsByPair = new Map<string, number[]>();
  for (const row of h2hRows) {
    const key = `${row.teamAId}-${row.teamBId}`;
    const arr = fixtureIdsByPair.get(key) ?? [];
    if (arr.length < 20) arr.push(row.fixtureId);
    fixtureIdsByPair.set(key, arr);
  }

  const fixtureIds = [...new Set(Array.from(fixtureIdsByPair.values()).flat())];
  if (fixtureIds.length === 0) return result;

  const fixtureRows = await db
    .select()
    .from(fixture)
    .where(inArray(fixture.id, fixtureIds));

  const fixtureById = new Map<number, DbFixture>();
  for (const row of fixtureRows) fixtureById.set(row.id, row);

  for (const [key, ids] of fixtureIdsByPair.entries()) {
    const fixtures = ids
      .map((id) => fixtureById.get(id))
      .filter((f): f is DbFixture => Boolean(f))
      .sort((a, b) => b.date.localeCompare(a.date));
    result.set(key, fixtures);
  }

  return result;
}

/** Get injured player IDs for a set of teams. Returns map of teamId → Set of injured playerIds. */
export async function getInjuredPlayersByTeam(
  teamIds: number[],
): Promise<Map<number, Set<number>>> {
  if (teamIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ playerId: injury.playerId, teamId: injury.teamId, type: injury.type })
    .from(injury)
    .where(inArray(injury.teamId, teamIds));
  const map = new Map<number, Set<number>>();
  for (const row of rows) {
    // Only exclude players who are confirmed missing
    if (row.type !== "Missing Fixture") continue;
    if (!map.has(row.teamId)) map.set(row.teamId, new Set());
    map.get(row.teamId)!.add(row.playerId);
  }
  return map;
}

export type DbInjury = typeof injury.$inferSelect;

/** Get all injuries for given teams (for UI display). */
export async function getInjuriesForTeams(
  teamIds: number[],
): Promise<DbInjury[]> {
  if (teamIds.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(injury)
    .where(inArray(injury.teamId, teamIds));
}

export interface RecentStarterRow {
  playerId: number;
  playerName: string;
  position: string | null;
  started: number;
  fixtureDate: string;
}

/**
 * Get lineup data for a team from their last N fixtures.
 * Returns all players who appeared, with started flag and fixture date.
 */
export async function getRecentLineups(
  teamId: number,
  beforeDate: string,
  n: number = 10,
): Promise<RecentStarterRow[]> {
  const db = getDb();
  // First get the last N fixture IDs for this team
  const recentFixtures = await db
    .select({ id: fixture.id, date: fixture.date })
    .from(fixture)
    .where(
      and(
        sql`(${fixture.homeTeamId} = ${teamId} OR ${fixture.awayTeamId} = ${teamId})`,
        sql`${fixture.date} < ${beforeDate}`,
        sql`${fixture.status} IN ('FT', 'AET', 'PEN')`,
      ),
    )
    .orderBy(sql`${fixture.date} DESC`)
    .limit(n);

  if (recentFixtures.length === 0) return [];

  const fixtureIds = recentFixtures.map((f) => f.id);
  const fixtureDateMap = new Map(recentFixtures.map((f) => [f.id, f.date]));

  const rows = await db
    .select({
      playerId: fixtureLineup.playerId,
      playerName: fixtureLineup.playerName,
      position: fixtureLineup.position,
      started: fixtureLineup.started,
      fixtureId: fixtureLineup.fixtureId,
    })
    .from(fixtureLineup)
    .where(
      and(
        eq(fixtureLineup.teamId, teamId),
        inArray(fixtureLineup.fixtureId, fixtureIds),
      ),
    );

  return rows.map((r) => ({
    playerId: r.playerId,
    playerName: r.playerName,
    position: r.position,
    started: r.started,
    fixtureDate: fixtureDateMap.get(r.fixtureId) ?? "",
  }));
}

/**
 * Batch fetch recent lineups for multiple teams.
 */
export async function getRecentLineupsBatch(
  teamIds: number[],
  beforeDate: string,
  n: number = 10,
): Promise<Map<number, RecentStarterRow[]>> {
  if (teamIds.length === 0) return new Map();
  const db = getDb();
  const result = new Map<number, RecentStarterRow[]>();

  // Bound the scan window; this is enough to get last N matches for active teams.
  const lowerBound = new Date(`${beforeDate}T00:00:00Z`);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - 400);
  const fromDate = lowerBound.toISOString().slice(0, 10);

  const fixturesForTeams = await db
    .select({
      id: fixture.id,
      date: fixture.date,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
    })
    .from(fixture)
    .where(
      and(
        gte(fixture.date, fromDate),
        sql`${fixture.date} < ${beforeDate}`,
        sql`${fixture.status} IN ('FT', 'AET', 'PEN')`,
        or(inArray(fixture.homeTeamId, teamIds), inArray(fixture.awayTeamId, teamIds)),
      ),
    )
    .orderBy(sql`${fixture.date} DESC`);

  const tracked = new Set(teamIds);
  const fixtureIdsByTeam = new Map<number, number[]>();
  const fixtureDateMap = new Map<number, string>();

  for (const row of fixturesForTeams) {
    fixtureDateMap.set(row.id, row.date);
    if (tracked.has(row.homeTeamId)) {
      const arr = fixtureIdsByTeam.get(row.homeTeamId) ?? [];
      if (arr.length < n) {
        arr.push(row.id);
        fixtureIdsByTeam.set(row.homeTeamId, arr);
      }
    }
    if (tracked.has(row.awayTeamId)) {
      const arr = fixtureIdsByTeam.get(row.awayTeamId) ?? [];
      if (arr.length < n) {
        arr.push(row.id);
        fixtureIdsByTeam.set(row.awayTeamId, arr);
      }
    }
  }

  const allFixtureIds = Array.from(
    new Set(Array.from(fixtureIdsByTeam.values()).flat())
  );
  if (allFixtureIds.length === 0) return result;

  const lineupRows = await db
    .select({
      teamId: fixtureLineup.teamId,
      playerId: fixtureLineup.playerId,
      playerName: fixtureLineup.playerName,
      position: fixtureLineup.position,
      started: fixtureLineup.started,
      fixtureId: fixtureLineup.fixtureId,
    })
    .from(fixtureLineup)
    .where(
      and(
        inArray(fixtureLineup.teamId, teamIds),
        inArray(fixtureLineup.fixtureId, allFixtureIds),
      ),
    );

  const fixtureSetByTeam = new Map<number, Set<number>>();
  for (const [teamId, ids] of fixtureIdsByTeam) {
    fixtureSetByTeam.set(teamId, new Set(ids));
  }

  for (const row of lineupRows) {
    const teamFixtures = fixtureSetByTeam.get(row.teamId);
    if (!teamFixtures || !teamFixtures.has(row.fixtureId)) continue;
    const out = result.get(row.teamId) ?? [];
    out.push({
      playerId: row.playerId,
      playerName: row.playerName,
      position: row.position,
      started: row.started,
      fixtureDate: fixtureDateMap.get(row.fixtureId) ?? "",
    });
    result.set(row.teamId, out);
  }

  return result;
}
