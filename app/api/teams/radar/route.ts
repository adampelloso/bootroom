import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { inArray } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { team } from "@/lib/db-schema";
import { computeTeamRadar, parseSeasonYear, resolveTeamLeagueSeason, seasonYearToLabel } from "@/lib/radar";

type RadarTeamResponse = {
  team_id: string;
  team_name: string;
  league: string | null;
  matches_played: number;
  crest_url: string | null;
  percentiles?: {
    attacking: number;
    defending: number;
    possession: number;
    pressing: number;
    goals: number;
    corners: number;
    set_pieces: number;
  };
  raw?: {
    xg_for_per90: number;
    xg_against_per90: number;
    possession_pct_avg: number;
    ppda: number | null;
    goals_per90: number;
    corners_for_per90: number;
    shots_on_target_per90: number;
    shots_on_target_against_per90: number;
    shots_for_per90: number;
    free_kicks_final_third_per90: number | null;
    pass_accuracy_pct: number | null;
    passes_completed_per90: number | null;
    touches_in_box_per90: number | null;
  };
  error?: {
    code: "team_not_found" | "insufficient_matches" | "no_season_data";
    message: string;
  };
};

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teamIdsParam = (searchParams.get("teamIds") ?? "").trim();
  const requestedSeasonYear = parseSeasonYear(searchParams.get("season"));
  const teamIds = teamIdsParam
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id))
    .slice(0, 2);

  if (teamIds.length === 0) {
    return NextResponse.json({ error: "Missing teamIds" }, { status: 400 });
  }

  const db = getDb();
  const teamRows = await db
    .select({ id: team.id, name: team.name, logo: team.logo })
    .from(team)
    .where(inArray(team.id, teamIds));

  const byId = new Map(teamRows.map((row) => [row.id, row]));
  const teams: RadarTeamResponse[] = [];
  let seasonLabel = requestedSeasonYear != null ? seasonYearToLabel(requestedSeasonYear) : null;

  for (const teamId of teamIds) {
    const meta = byId.get(teamId);
    if (!meta) {
      teams.push({
        team_id: String(teamId),
        team_name: `Team ${teamId}`,
        league: null,
        matches_played: 0,
        crest_url: null,
        error: {
          code: "team_not_found",
          message: `No seasonal data found for Team ${teamId}.`,
        },
      });
      continue;
    }

    const leagueSeason = resolveTeamLeagueSeason(meta.name, requestedSeasonYear);
    if (!leagueSeason) {
      teams.push({
        team_id: String(meta.id),
        team_name: meta.name,
        league: null,
        matches_played: 0,
        crest_url: meta.logo ?? null,
        error: {
          code: "no_season_data",
          message: `No seasonal data found for ${meta.name}.`,
        },
      });
      continue;
    }

    if (!seasonLabel) seasonLabel = seasonYearToLabel(leagueSeason.seasonYear);

    const radar = computeTeamRadar(meta.name, leagueSeason.leagueId, leagueSeason.leagueName, leagueSeason.seasonYear);
    if (!radar) {
      teams.push({
        team_id: String(meta.id),
        team_name: meta.name,
        league: leagueSeason.leagueName,
        matches_played: 0,
        crest_url: meta.logo ?? null,
        error: {
          code: "no_season_data",
          message: `No seasonal data found for ${meta.name}.`,
        },
      });
      continue;
    }

    if (radar.matchesPlayed < 5) {
      teams.push({
        team_id: String(meta.id),
        team_name: meta.name,
        league: radar.leagueName,
        matches_played: radar.matchesPlayed,
        crest_url: meta.logo ?? null,
        error: {
          code: "insufficient_matches",
          message: `${meta.name} has played fewer than 5 league matches this season. Radar unavailable.`,
        },
      });
      continue;
    }

    teams.push({
      team_id: String(meta.id),
      team_name: meta.name,
      league: radar.leagueName,
      matches_played: radar.matchesPlayed,
      crest_url: meta.logo ?? null,
      percentiles: radar.percentiles,
      raw: radar.raw,
    });
  }

  return NextResponse.json(
    {
      season: seasonLabel,
      teams,
    },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
  );
}
