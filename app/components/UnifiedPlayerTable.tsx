"use client";

import { useState } from "react";
import type { FeedPlayerSimEntry, FeedPredictedLineup } from "@/lib/feed";

type UnifiedPlayer = {
  playerId: number;
  name: string;
  teamName: string;
  position: string | null;
  startPct: number | null;
  scorerPct: number | null;
  xG: number | null;
  xSh: number | null;
  xSOT: number | null;
  xA: number | null;
};

type SortKey = "startPct" | "scorerPct" | "xG" | "xSh" | "xSOT" | "xA";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: FeedPlayerSimEntry[];
  awayPlayers: FeedPlayerSimEntry[];
  homeLineup?: FeedPredictedLineup;
  awayLineup?: FeedPredictedLineup;
};

function mergePlayerData(
  teamName: string,
  simPlayers: FeedPlayerSimEntry[],
  lineup?: FeedPredictedLineup,
): UnifiedPlayer[] {
  const byId = new Map<number, UnifiedPlayer>();

  if (lineup) {
    for (const s of lineup.starters) {
      byId.set(s.playerId, {
        playerId: s.playerId,
        name: s.name,
        teamName,
        position: s.position,
        startPct: s.startRate * 100,
        scorerPct: null,
        xG: null,
        xSh: null,
        xSOT: null,
        xA: null,
      });
    }
  }

  for (const p of simPlayers) {
    const existing = byId.get(p.playerId);
    if (existing) {
      existing.scorerPct = p.anytimeScorerProb * 100;
      existing.xG = p.expectedGoals;
      existing.xSh = p.expectedShots;
      existing.xSOT = p.expectedSOT;
      existing.xA = p.expectedAssists;
      if (!existing.position) existing.position = p.position;
    } else {
      byId.set(p.playerId, {
        playerId: p.playerId,
        name: p.name,
        teamName,
        position: p.position,
        startPct: null,
        scorerPct: p.anytimeScorerProb * 100,
        xG: p.expectedGoals,
        xSh: p.expectedShots,
        xSOT: p.expectedSOT,
        xA: p.expectedAssists,
      });
    }
  }

  return Array.from(byId.values());
}

export function UnifiedPlayerTable({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  homeLineup,
  awayLineup,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("scorerPct");
  const [sortAsc, setSortAsc] = useState(false);
  const [startersOnly, setStartersOnly] = useState(false);

  const allPlayers = [
    ...mergePlayerData(homeTeamName, homePlayers, homeLineup),
    ...mergePlayerData(awayTeamName, awayPlayers, awayLineup),
  ];

  const filtered = startersOnly
    ? allPlayers.filter((p) => p.startPct != null && p.startPct >= 50)
    : allPlayers;

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Player projections</h2>
        <button
          type="button"
          onClick={() => setStartersOnly(!startersOnly)}
          className="text-mono text-[12px] uppercase px-2 py-1 transition-colors"
          style={{
            background: startersOnly ? "var(--bg-accent)" : "transparent",
            color: startersOnly ? "var(--text-on-accent)" : "var(--text-tertiary)",
            border: startersOnly ? "none" : "1px solid var(--border-light)",
          }}
        >
          {startersOnly ? "Starters" : "All"}
        </button>
      </div>

      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <table className="w-full text-[12px] font-mono" style={{ minWidth: "500px" }}>
          <thead>
            <tr className="text-tertiary uppercase text-[12px] border-b border-[var(--border-light)]">
              <th className="text-left py-2 font-normal sticky left-0 z-10" style={{ background: "var(--bg-panel)", minWidth: "120px" }}>Player</th>
              <th className="text-left py-2 font-normal">Team</th>
              <th className="text-left py-2 font-normal">Pos</th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("startPct")}>
                Start%{arrow("startPct")}
              </th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("scorerPct")}>
                Scorer%{arrow("scorerPct")}
              </th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("xG")}>
                xG{arrow("xG")}
              </th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("xSh")}>
                xSh{arrow("xSh")}
              </th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("xSOT")}>
                xSOT{arrow("xSOT")}
              </th>
              <th className="text-right py-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => handleSort("xA")}>
                xA{arrow("xA")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const isHighScorer = p.scorerPct != null && p.scorerPct >= 25;
              const isHighXg = p.xG != null && p.xG >= 0.3;
              const rowBg = idx % 2 === 1 ? "var(--bg-surface)" : "transparent";
              return (
                <tr key={`${p.playerId}-${p.teamName}`} className="border-t border-[var(--border-light)]" style={{ background: rowBg }}>
                  <td className="py-1.5 text-[var(--text-main)] truncate max-w-[120px] sticky left-0 z-10" style={{ background: idx % 2 === 1 ? "var(--bg-surface)" : "var(--bg-panel)", minWidth: "120px" }}>{p.name}</td>
                  <td className="py-1.5 text-tertiary">{p.teamName.slice(0, 3).toUpperCase()}</td>
                  <td className="py-1.5 text-tertiary">{p.position ?? "—"}</td>
                  <td className="py-1.5 text-right text-[var(--text-sec)]">{p.startPct != null ? `${p.startPct.toFixed(0)}%` : "—"}</td>
                  <td
                    className="py-1.5 text-right text-[var(--text-main)] font-semibold"
                    style={isHighScorer ? { background: "rgba(212,255,0,0.08)" } : undefined}
                  >
                    {p.scorerPct != null ? `${p.scorerPct.toFixed(0)}%` : "—"}
                  </td>
                  <td
                    className="py-1.5 text-right text-[var(--text-sec)]"
                    style={isHighXg ? { background: "rgba(212,255,0,0.08)" } : undefined}
                  >
                    {p.xG != null ? p.xG.toFixed(2) : "—"}
                  </td>
                  <td className="py-1.5 text-right text-[var(--text-sec)]">{p.xSh != null ? p.xSh.toFixed(1) : "—"}</td>
                  <td className="py-1.5 text-right text-[var(--text-sec)]">{p.xSOT != null ? p.xSOT.toFixed(1) : "—"}</td>
                  <td className="py-1.5 text-right text-[var(--text-sec)]">{p.xA != null ? p.xA.toFixed(2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <p className="text-secondary-data text-tertiary mt-2">No player data available.</p>
      )}
    </section>
  );
}
