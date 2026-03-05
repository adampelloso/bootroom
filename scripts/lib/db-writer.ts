/**
 * Shared DB write helpers for ingest scripts.
 * All functions use batch INSERT ... ON CONFLICT DO UPDATE for efficiency.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { fixture, team, fixtureOdds, h2h, injury, fixtureLineup } from "../../lib/db-schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function getIngestDb() {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("Missing TURSO_DATABASE_URL");
    _db = drizzle(createClient({ url, authToken }));
  }
  return _db;
}

export type FixtureRow = typeof fixture.$inferInsert;
export type TeamRow = typeof team.$inferInsert;
export type FixtureOddsRow = typeof fixtureOdds.$inferInsert;

const BATCH_SIZE = 50;

export async function upsertFixtures(rows: FixtureRow[]) {
  if (rows.length === 0) return;
  const db = getIngestDb();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(fixture).values(batch).onConflictDoUpdate({
      target: fixture.id,
      set: {
        leagueId: sql`excluded.league_id`,
        season: sql`excluded.season`,
        round: sql`excluded.round`,
        date: sql`excluded.date`,
        kickoffUtc: sql`excluded.kickoff_utc`,
        status: sql`excluded.status`,
        homeTeamId: sql`excluded.home_team_id`,
        homeTeamName: sql`excluded.home_team_name`,
        awayTeamId: sql`excluded.away_team_id`,
        awayTeamName: sql`excluded.away_team_name`,
        homeGoals: sql`excluded.home_goals`,
        awayGoals: sql`excluded.away_goals`,
        htHomeGoals: sql`excluded.ht_home_goals`,
        htAwayGoals: sql`excluded.ht_away_goals`,
        venueName: sql`excluded.venue_name`,
        referee: sql`excluded.referee`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  }
}

export async function upsertTeams(rows: TeamRow[]) {
  if (rows.length === 0) return;
  const db = getIngestDb();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(team).values(batch).onConflictDoUpdate({
      target: team.id,
      set: {
        name: sql`excluded.name`,
        code: sql`excluded.code`,
        logo: sql`excluded.logo`,
      },
    });
  }
}

export async function upsertFixtureOdds(rows: FixtureOddsRow[]) {
  if (rows.length === 0) return;
  const db = getIngestDb();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(fixtureOdds).values(batch).onConflictDoUpdate({
      target: fixtureOdds.fixtureId,
      set: {
        homeProb: sql`excluded.home_prob`,
        drawProb: sql`excluded.draw_prob`,
        awayProb: sql`excluded.away_prob`,
        over25Prob: sql`excluded.over25_prob`,
        under25Prob: sql`excluded.under25_prob`,
        bttsProb: sql`excluded.btts_prob`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  }
}

export type InjuryRow = typeof injury.$inferInsert;

export async function upsertInjuries(rows: InjuryRow[]) {
  if (rows.length === 0) return;
  const db = getIngestDb();
  // Clear existing injuries and replace with fresh data
  // Injuries are ephemeral — full replace is safer than upsert
  const teamIds = [...new Set(rows.map((r) => r.teamId))];
  for (const tid of teamIds) {
    await db.delete(injury).where(sql`${injury.teamId} = ${tid}`);
  }
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(injury).values(batch);
  }
}

export type FixtureLineupRow = typeof fixtureLineup.$inferInsert;

export async function upsertFixtureLineups(rows: FixtureLineupRow[]) {
  if (rows.length === 0) return;
  const db = getIngestDb();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(fixtureLineup).values(batch).onConflictDoUpdate({
      target: [fixtureLineup.fixtureId, fixtureLineup.playerId],
      set: {
        playerName: sql`excluded.player_name`,
        position: sql`excluded.position`,
        started: sql`excluded.started`,
        minutes: sql`excluded.minutes`,
        teamId: sql`excluded.team_id`,
      },
    });
  }
}

export async function replaceH2H(teamAId: number, teamBId: number, fixtureIds: number[]) {
  const db = getIngestDb();
  const a = Math.min(teamAId, teamBId);
  const b = Math.max(teamAId, teamBId);
  // Delete existing H2H entries for this pair
  await db.delete(h2h).where(
    sql`${h2h.teamAId} = ${a} AND ${h2h.teamBId} = ${b}`
  );
  if (fixtureIds.length === 0) return;
  const rows = fixtureIds.map((fid) => ({ teamAId: a, teamBId: b, fixtureId: fid }));
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(h2h).values(batch);
  }
}
