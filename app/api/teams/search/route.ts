import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { inArray, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fixture, team } from "@/lib/db-schema";
import { getCompetitionByLeagueId, isCup } from "@/lib/leagues";

type TeamSearchRow = {
  team_id: string;
  team_name: string;
  league_id: number | null;
  league_name: string | null;
  season: number | null;
  crest_url: string | null;
};

function pickPrimaryLeague(rows: Array<{ leagueId: number; season: number; matches: number }>) {
  if (rows.length === 0) return null;
  const nonCup = rows.filter((r) => !isCup(r.leagueId));
  const pool = nonCup.length > 0 ? nonCup : rows;
  pool.sort((a, b) => b.season - a.season || b.matches - a.matches);
  return pool[0];
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ teams: [] as TeamSearchRow[] });

  const db = getDb();
  const pattern = `%${q.toLowerCase()}%`;
  const teams = await db
    .select({ id: team.id, name: team.name, logo: team.logo })
    .from(team)
    .where(sql`lower(${team.name}) like ${pattern}`)
    .limit(12);

  if (teams.length === 0) return NextResponse.json({ teams: [] as TeamSearchRow[] });

  const teamIds = teams.map((t) => t.id);
  const homeRollup = await db
    .select({
      teamId: fixture.homeTeamId,
      leagueId: fixture.leagueId,
      season: fixture.season,
      matches: sql<number>`count(*)`,
    })
    .from(fixture)
    .where(inArray(fixture.homeTeamId, teamIds))
    .groupBy(fixture.homeTeamId, fixture.leagueId, fixture.season);
  const awayRollup = await db
    .select({
      teamId: fixture.awayTeamId,
      leagueId: fixture.leagueId,
      season: fixture.season,
      matches: sql<number>`count(*)`,
    })
    .from(fixture)
    .where(inArray(fixture.awayTeamId, teamIds))
    .groupBy(fixture.awayTeamId, fixture.leagueId, fixture.season);
  const leagueRollup = [...homeRollup, ...awayRollup];

  const byTeam = new Map<number, Array<{ leagueId: number; season: number; matches: number }>>();
  for (const row of leagueRollup) {
    const current = byTeam.get(row.teamId) ?? [];
    current.push({
      leagueId: row.leagueId,
      season: row.season,
      matches: row.matches,
    });
    byTeam.set(row.teamId, current);
  }

  const results: TeamSearchRow[] = teams.map((t) => {
    const primary = pickPrimaryLeague(byTeam.get(t.id) ?? []);
    const comp = primary ? getCompetitionByLeagueId(primary.leagueId) : undefined;
    return {
      team_id: String(t.id),
      team_name: t.name,
      league_id: primary?.leagueId ?? null,
      league_name: primary ? (comp?.label ?? `League ${primary.leagueId}`) : null,
      season: primary?.season ?? null,
      crest_url: t.logo ?? null,
    };
  });

  return NextResponse.json(
    { teams: results },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
  );
}
