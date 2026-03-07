"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type RadarPercentiles = {
  attacking: number;
  defending: number;
  possession: number;
  pressing: number;
  goals: number;
  corners: number;
  set_pieces: number;
};

type RadarRaw = {
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

export type TeamRadarData = {
  team_id: string;
  team_name: string;
  league: string | null;
  matches_played: number;
  crest_url: string | null;
  percentiles?: RadarPercentiles;
  raw?: RadarRaw;
  error?: {
    code: "team_not_found" | "insufficient_matches" | "no_season_data";
    message: string;
  };
};

interface TeamRadarProps {
  teams: TeamRadarData[];
  season: string;
  loading?: boolean;
  showTable?: boolean;
  showRawValues?: boolean;
}

const AXES: Array<{ key: keyof RadarPercentiles; label: string }> = [
  { key: "attacking", label: "Attacking" },
  { key: "goals", label: "Goals" },
  { key: "pressing", label: "Pressing" },
  { key: "corners", label: "Corners" },
  { key: "set_pieces", label: "Set Pieces" },
  { key: "defending", label: "Defending" },
  { key: "possession", label: "Possession" },
];

const TEAM_COLORS = ["#AAFF00", "#6B7280"] as const;

function percentileColorStyle(percentile: number): { color: string } {
  if (percentile >= 75) return { color: "var(--prob-very-high)" };
  if (percentile >= 60) return { color: "var(--prob-high)" };
  if (percentile >= 45) return { color: "var(--prob-mid)" };
  if (percentile >= 30) return { color: "var(--prob-low)" };
  return { color: "var(--prob-very-low)" };
}

function rawAxisLabel(axis: keyof RadarPercentiles, raw?: RadarRaw): string {
  if (!raw) return "Raw: n/a";
  switch (axis) {
    case "attacking":
      return `xG ${raw.xg_for_per90.toFixed(1)}, SOT ${raw.shots_on_target_per90.toFixed(1)}, Shots ${raw.shots_for_per90.toFixed(1)} per 90`;
    case "defending":
      return `xGA ${raw.xg_against_per90.toFixed(1)}, SOTA ${raw.shots_on_target_against_per90.toFixed(1)} per 90`;
    case "possession":
      return `Possession ${raw.possession_pct_avg.toFixed(1)}%`;
    case "pressing":
      return raw.ppda != null ? `PPDA ${raw.ppda.toFixed(1)}` : "Pressing proxy (fallback metric)";
    case "goals":
      return `Goals ${raw.goals_per90.toFixed(1)} per 90`;
    case "corners":
      return `Corners ${raw.corners_for_per90.toFixed(1)} per 90`;
    case "set_pieces":
      return raw.free_kicks_final_third_per90 != null
        ? `Corners ${raw.corners_for_per90.toFixed(1)}, Final-third FK ${raw.free_kicks_final_third_per90.toFixed(1)} per 90`
        : `Corners ${raw.corners_for_per90.toFixed(1)} per 90 (fallback)`;
  }
}

function RadarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-md bg-[var(--bg-surface)] border border-[var(--border-light)]" />
      <div className="h-[280px] md:h-[400px] rounded-md bg-[var(--bg-surface)] border border-[var(--border-light)]" />
    </div>
  );
}

export function TeamRadar({ teams, season, loading = false, showTable = true, showRawValues = false }: TeamRadarProps) {
  const renderableTeams = teams.filter((t) => t.percentiles && !t.error);
  const hasError = teams.some((t) => t.error);
  const crossLeague = renderableTeams.length === 2 && renderableTeams[0].league !== renderableTeams[1].league;

  const chartData = useMemo(() => {
    if (renderableTeams.length === 0) return [];
    return AXES.map((axis) => {
      const row: Record<string, string | number> = { axis: axis.label, axisKey: axis.key };
      for (const team of renderableTeams) {
        row[team.team_name] = team.percentiles?.[axis.key] ?? 0;
      }
      return row;
    });
  }, [renderableTeams]);

  const teamColorByName = useMemo(() => {
    const map = new Map<string, string>();
    renderableTeams.forEach((team, idx) => map.set(team.team_name, TEAM_COLORS[idx] ?? TEAM_COLORS[1]));
    return map;
  }, [renderableTeams]);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-main)]">TEAM COMPARISON</h2>
          <span className="text-[12px] uppercase text-tertiary">{season.replace("-", "/")} Season</span>
        </div>
        <RadarSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-main)]">TEAM COMPARISON</h2>
        <span className="text-[12px] uppercase text-tertiary">{season.replace("-", "/")} Season</span>
      </div>

      {showTable && renderableTeams.length > 0 ? (
        <div className="overflow-x-auto border border-[var(--border-light)] rounded-md bg-[var(--bg-surface)]">
          <table className="w-full min-w-[860px] text-[12px] font-mono" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 text-left px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-light)]">
                  Percentiles
                </th>
                {AXES.map((axis) => (
                  <th key={axis.key} className="text-center px-3 py-2 border-b border-[var(--border-light)] text-tertiary">
                    {axis.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderableTeams.map((team, idx) => (
                <tr key={team.team_id} className="border-b border-[var(--border-light)] last:border-b-0">
                  <td className="sticky left-0 z-10 bg-[var(--bg-surface)] px-3 py-2 align-top">
                    <div className="font-semibold" style={{ color: TEAM_COLORS[idx] ?? TEAM_COLORS[1] }}>
                      {team.team_name}
                    </div>
                    <div className="text-[11px] text-tertiary">
                      {team.league ?? "Unknown league"} {season.replace("-", "/")}
                    </div>
                    {crossLeague ? (
                      <div className="text-[10px] text-tertiary">League-relative percentiles</div>
                    ) : null}
                  </td>
                  {AXES.map((axis) => {
                    const value = team.percentiles?.[axis.key] ?? 0;
                    return (
                      <td key={axis.key} className="px-3 py-2 text-center font-semibold" style={percentileColorStyle(value)}>
                        {value.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasError ? (
        <div className="space-y-2">
          {teams
            .filter((team) => team.error)
            .map((team) => (
              <p key={team.team_id} className="text-[13px]" style={{ color: "var(--prob-very-low)" }}>
                {team.error?.message}
              </p>
            ))}
        </div>
      ) : null}

      {renderableTeams.length > 0 ? (
        <>
          <div className="w-full h-[280px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="var(--radar-grid)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} />
                {renderableTeams.map((team, idx) => {
                  const color = TEAM_COLORS[idx] ?? TEAM_COLORS[1];
                  return (
                    <Radar
                      key={team.team_id}
                      name={team.team_name}
                      dataKey={team.team_name}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.2}
                      dot={{ fill: color, stroke: color, r: 3 }}
                    />
                  );
                })}
                <Tooltip
                  formatter={(value: number, teamName: string, item) => {
                    const axis = item.payload.axisKey as keyof RadarPercentiles;
                    const sourceTeam = renderableTeams.find((team) => team.team_name === teamName);
                    const raw = showRawValues ? rawAxisLabel(axis, sourceTeam?.raw) : null;
                    return [`${Number(value).toFixed(1)} percentile${raw ? ` — ${raw}` : ""}`, teamName];
                  }}
                  labelFormatter={(axisLabel) => String(axisLabel)}
                  contentStyle={{
                    borderRadius: "4px",
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-light)",
                    color: "var(--text-main)",
                  }}
                  cursor={{ stroke: "var(--border-light)" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {renderableTeams.map((team) => (
              <div key={team.team_id} className="flex items-center gap-2 text-[12px]">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: teamColorByName.get(team.team_name) ?? TEAM_COLORS[1] }}
                />
                <span>{team.team_name}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
