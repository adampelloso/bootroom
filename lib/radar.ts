import { isCup } from "@/lib/leagues";
import { getLeagueSeasonTeamRows, getTeamHistoryRows, type TeamMatchRow } from "@/lib/insights/team-stats";

export type RadarAxisKey =
  | "attacking"
  | "defending"
  | "possession"
  | "pressing"
  | "goals"
  | "corners"
  | "set_pieces";

export interface RadarPercentiles {
  attacking: number;
  defending: number;
  possession: number;
  pressing: number;
  goals: number;
  corners: number;
  set_pieces: number;
}

export interface RadarRawStats {
  xg_for_per90: number;
  xg_against_per90: number;
  shots_on_target_per90: number;
  shots_on_target_against_per90: number;
  shots_for_per90: number;
  possession_pct_avg: number;
  ppda: number | null;
  goals_per90: number;
  corners_for_per90: number;
  touches_in_box_per90: number | null;
  pass_accuracy_pct: number | null;
  passes_completed_per90: number | null;
  free_kicks_final_third_per90: number | null;
}

export interface TeamRadarComputed {
  teamName: string;
  leagueId: number;
  leagueName: string;
  seasonYear: number;
  matchesPlayed: number;
  percentiles: RadarPercentiles;
  raw: RadarRawStats;
}

interface TeamAxisInput {
  matchesPlayed: number;
  attacking: number;
  defending: number;
  possession: number;
  pressing: number;
  goals: number;
  corners: number;
  set_pieces: number;
  raw: RadarRawStats;
}

const INVERTED_AXES = new Set<RadarAxisKey>(["defending", "pressing"]);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function mapToSeasonLabel(seasonYear: number): string {
  const nextYearShort = String((seasonYear + 1) % 100).padStart(2, "0");
  return `${seasonYear}-${nextYearShort}`;
}

export function parseSeasonYear(season?: string | null): number | null {
  if (!season) return null;
  const match = season.match(/^(\d{4})(?:[-/]\d{2,4})?$/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  return year;
}

function getTeamAxisInput(rows: TeamMatchRow[]): TeamAxisInput {
  const matchesPlayed = rows.length;
  const xgRows = rows.filter((r) => r.xgFor != null && r.xgAgainst != null);

  const xgForPer90 = xgRows.length > 0 ? avg(xgRows.map((r) => r.xgFor ?? 0)) : avg(rows.map((r) => r.goalsFor));
  const xgAgainstPer90 =
    xgRows.length > 0 ? avg(xgRows.map((r) => r.xgAgainst ?? 0)) : avg(rows.map((r) => r.goalsAgainst));
  const shotsOnTargetPer90 = avg(rows.map((r) => r.sotFor));
  const shotsOnTargetAgainstPer90 = avg(rows.map((r) => r.sotAgainst));
  const shotsForPer90 = avg(rows.map((r) => r.shotsFor));
  const possessionPctAvg = avg(rows.map((r) => r.possession));
  const goalsPer90 = avg(rows.map((r) => r.goalsFor));
  const cornersForPer90 = avg(rows.map((r) => r.cornersFor));
  const blockedShotsPer90 = avg(rows.map((r) => r.blockedShots));
  const foulsPer90 = avg(rows.map((r) => r.fouls));

  // Data-source fallbacks:
  // - Pressing: no PPDA available in current pipeline, proxy with defensive activity (blocked shots + low fouls).
  // - Set pieces: no free-kicks-final-third available, fallback to corners for per90.
  const pressingProxy = blockedShotsPer90 - foulsPer90 * 0.15;
  const setPiecesProxy = cornersForPer90;

  const attacking = xgForPer90 * 0.6 + shotsOnTargetPer90 * 0.25 + shotsForPer90 * 0.15;
  const defending = xgAgainstPer90 * 0.7 + shotsOnTargetAgainstPer90 * 0.3;
  const possession = possessionPctAvg;
  const pressing = pressingProxy;
  const goals = goalsPer90;
  const corners = cornersForPer90;
  const set_pieces = setPiecesProxy;

  return {
    matchesPlayed,
    attacking,
    defending,
    possession,
    pressing,
    goals,
    corners,
    set_pieces,
    raw: {
      xg_for_per90: round1(xgForPer90),
      xg_against_per90: round1(xgAgainstPer90),
      shots_on_target_per90: round1(shotsOnTargetPer90),
      shots_on_target_against_per90: round1(shotsOnTargetAgainstPer90),
      shots_for_per90: round1(shotsForPer90),
      possession_pct_avg: round1(possessionPctAvg),
      ppda: null,
      goals_per90: round1(goalsPer90),
      corners_for_per90: round1(cornersForPer90),
      touches_in_box_per90: null,
      pass_accuracy_pct: null,
      passes_completed_per90: null,
      free_kicks_final_third_per90: null,
    },
  };
}

function getPercentile(value: number, allValues: number[], invert: boolean): number {
  if (allValues.length === 0) return 0;
  const projected = invert ? -value : value;
  let rank = 0;
  for (const raw of allValues) {
    const candidate = invert ? -raw : raw;
    if (candidate <= projected) rank += 1;
  }
  return round1((rank / allValues.length) * 100);
}

function buildPercentiles(target: TeamAxisInput, leagueTable: TeamAxisInput[]): RadarPercentiles {
  const eligible = leagueTable.filter((entry) => entry.matchesPlayed >= 5);

  return {
    attacking: getPercentile(target.attacking, eligible.map((x) => x.attacking), INVERTED_AXES.has("attacking")),
    defending: getPercentile(target.defending, eligible.map((x) => x.defending), INVERTED_AXES.has("defending")),
    possession: getPercentile(target.possession, eligible.map((x) => x.possession), INVERTED_AXES.has("possession")),
    pressing: getPercentile(target.pressing, eligible.map((x) => x.pressing), INVERTED_AXES.has("pressing")),
    goals: getPercentile(target.goals, eligible.map((x) => x.goals), INVERTED_AXES.has("goals")),
    corners: getPercentile(target.corners, eligible.map((x) => x.corners), INVERTED_AXES.has("corners")),
    set_pieces: getPercentile(target.set_pieces, eligible.map((x) => x.set_pieces), INVERTED_AXES.has("set_pieces")),
  };
}

export function resolveTeamLeagueSeason(teamName: string, preferredSeasonYear?: number | null): {
  leagueId: number;
  leagueName: string;
  seasonYear: number;
} | null {
  const rows = getTeamHistoryRows(teamName).filter(
    (r) => r.leagueId != null && r.season != null && !isCup(r.leagueId),
  );
  if (rows.length === 0) return null;

  const bucket = new Map<string, { leagueId: number; leagueName: string; seasonYear: number; matches: number }>();
  for (const row of rows) {
    if (preferredSeasonYear != null && row.season !== preferredSeasonYear) continue;
    const key = `${row.leagueId}|${row.season}`;
    const prev = bucket.get(key);
    if (prev) {
      prev.matches += 1;
      continue;
    }
    bucket.set(key, {
      leagueId: row.leagueId!,
      leagueName: row.leagueName ?? `League ${row.leagueId}`,
      seasonYear: row.season!,
      matches: 1,
    });
  }

  const candidates = [...bucket.values()];
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.seasonYear - a.seasonYear || b.matches - a.matches);
  const top = candidates[0];
  return { leagueId: top.leagueId, leagueName: top.leagueName, seasonYear: top.seasonYear };
}

export function computeTeamRadar(teamName: string, leagueId: number, leagueName: string, seasonYear: number): TeamRadarComputed | null {
  const byTeam = getLeagueSeasonTeamRows(leagueId, seasonYear);
  if (byTeam.size === 0) return null;

  const leagueAxisTable: TeamAxisInput[] = [];
  let targetAxis: TeamAxisInput | null = null;

  for (const [name, rows] of byTeam) {
    const entry = getTeamAxisInput(rows);
    leagueAxisTable.push(entry);
    if (name === teamName) targetAxis = entry;
  }

  if (!targetAxis) return null;
  const percentiles = buildPercentiles(targetAxis, leagueAxisTable);
  return {
    teamName,
    leagueId,
    leagueName,
    seasonYear,
    matchesPlayed: targetAxis.matchesPlayed,
    percentiles,
    raw: targetAxis.raw,
  };
}

export function seasonYearToLabel(seasonYear: number): string {
  return mapToSeasonLabel(seasonYear);
}
