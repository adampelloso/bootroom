"use client";

import { useMemo, useState } from "react";
import type { FeedPlayerSimEntry, FeedPredictedLineup } from "@/lib/feed";
import { percentColor } from "@/lib/percent-color";
import { useOddsFormat } from "@/app/hooks/useOddsFormat";
import { formatOddsDisplay } from "@/lib/modeling/odds-display";

type UnifiedPlayer = {
  playerId: number;
  name: string;
  scorerProb: number | null;
  assistProb: number | null;
  scorerBookProb: number | null;
  assistBookProb: number | null;
  scorerEdgePct: number | null;
  assistEdgePct: number | null;
  xSh: number | null;
  xSOT: number | null;
};

type SortKey =
  | "scorerProb"
  | "assistProb"
  | "scorerBookProb"
  | "assistBookProb"
  | "scorerEdgePct"
  | "assistEdgePct"
  | "xSh"
  | "xSOT";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: FeedPlayerSimEntry[];
  awayPlayers: FeedPlayerSimEntry[];
  homeLineup?: FeedPredictedLineup;
  awayLineup?: FeedPredictedLineup;
};

function mergePlayerData(
  simPlayers: FeedPlayerSimEntry[],
  lineup?: FeedPredictedLineup,
): UnifiedPlayer[] {
  const byId = new Map<number, UnifiedPlayer>();

  if (lineup) {
    for (const s of lineup.starters) {
      byId.set(s.playerId, {
        playerId: s.playerId,
        name: s.name,
        scorerProb: null,
        assistProb: null,
        scorerBookProb: null,
        assistBookProb: null,
        scorerEdgePct: null,
        assistEdgePct: null,
        xSh: null,
        xSOT: null,
      });
    }
  }

  for (const p of simPlayers) {
    const existing = byId.get(p.playerId);
    if (existing) {
      existing.scorerProb = p.anytimeScorerProb;
      existing.assistProb = p.anytimeAssistProb;
      existing.scorerBookProb = p.bookScorerProb ?? null;
      existing.assistBookProb = p.bookAssistProb ?? null;
      existing.scorerEdgePct = p.scorerEdgeProb != null ? p.scorerEdgeProb * 100 : null;
      existing.assistEdgePct = p.assistEdgeProb != null ? p.assistEdgeProb * 100 : null;
      existing.xSh = p.expectedShots;
      existing.xSOT = p.expectedSOT;
    } else {
      byId.set(p.playerId, {
        playerId: p.playerId,
        name: p.name,
        scorerProb: p.anytimeScorerProb,
        assistProb: p.anytimeAssistProb,
        scorerBookProb: p.bookScorerProb ?? null,
        assistBookProb: p.bookAssistProb ?? null,
        scorerEdgePct: p.scorerEdgeProb != null ? p.scorerEdgeProb * 100 : null,
        assistEdgePct: p.assistEdgeProb != null ? p.assistEdgeProb * 100 : null,
        xSh: p.expectedShots,
        xSOT: p.expectedSOT,
      });
    }
  }

  return Array.from(byId.values());
}

function sortRows(rows: UnifiedPlayer[], sortKey: SortKey, sortAsc: boolean): UnifiedPlayer[] {
  return [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -999;
    const bv = b[sortKey] ?? -999;
    return sortAsc ? av - bv : bv - av;
  });
}

function TeamPlayerTable({
  teamName,
  rows,
  sortKey,
  sortAsc,
  onSort,
}: {
  teamName: string;
  rows: UnifiedPlayer[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const oddsFormat = useOddsFormat();
  const arrow = (key: SortKey) => (sortKey === key ? (sortAsc ? " ↑" : " ↓") : "");

  return (
    <div className="border border-[var(--border-light)]">
      <div className="px-3 py-2 border-b border-[var(--border-light)]">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em]">{teamName}</h3>
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <table className="w-full text-[12px] font-mono" style={{ minWidth: "560px" }}>
          <thead>
            <tr className="text-tertiary uppercase border-b border-[var(--border-light)]">
              <th className="text-left py-2 px-3 font-normal sticky left-0 z-10" style={{ background: "var(--bg-panel)", minWidth: "132px" }}>Player</th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("scorerProb")}>
                Scorer Model{arrow("scorerProb")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("scorerBookProb")}>
                Scorer Book{arrow("scorerBookProb")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("assistProb")}>
                Assist Model{arrow("assistProb")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("assistBookProb")}>
                Assist Book{arrow("assistBookProb")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("scorerEdgePct")}>
                Scorer Edge{arrow("scorerEdgePct")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("assistEdgePct")}>
                Assist Edge{arrow("assistEdgePct")}
              </th>
              <th className="text-right py-2 px-2 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("xSh")}>
                xSh{arrow("xSh")}
              </th>
              <th className="text-right py-2 px-3 font-normal cursor-pointer hover:text-[var(--text-sec)]" onClick={() => onSort("xSOT")}>
                xSOT{arrow("xSOT")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => {
              const rowBg = idx % 2 === 1 ? "var(--bg-surface)" : "transparent";
              return (
                <tr key={p.playerId} className="border-t border-[var(--border-light)]" style={{ background: rowBg }}>
                  <td className="py-1.5 px-3 text-[var(--text-main)] truncate max-w-[132px] sticky left-0 z-10" style={{ background: idx % 2 === 1 ? "var(--bg-surface)" : "var(--bg-panel)", minWidth: "132px" }}>{p.name}</td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={p.scorerProb != null ? { color: percentColor(p.scorerProb * 100) } : { color: "var(--text-sec)" }}>
                    {p.scorerProb != null ? formatOddsDisplay(p.scorerProb, oddsFormat) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={{ color: "var(--text-sec)" }}>
                    {p.scorerBookProb != null ? formatOddsDisplay(p.scorerBookProb, oddsFormat) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={p.assistProb != null ? { color: percentColor(p.assistProb * 100) } : { color: "var(--text-sec)" }}>
                    {p.assistProb != null ? formatOddsDisplay(p.assistProb, oddsFormat) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={{ color: "var(--text-sec)" }}>
                    {p.assistBookProb != null ? formatOddsDisplay(p.assistBookProb, oddsFormat) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={p.scorerEdgePct != null ? { color: p.scorerEdgePct >= 0 ? "var(--color-positive)" : "var(--color-negative)" } : { color: "var(--text-sec)" }}>
                    {p.scorerEdgePct != null ? `${p.scorerEdgePct >= 0 ? "+" : ""}${p.scorerEdgePct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold" style={p.assistEdgePct != null ? { color: p.assistEdgePct >= 0 ? "var(--color-positive)" : "var(--color-negative)" } : { color: "var(--text-sec)" }}>
                    {p.assistEdgePct != null ? `${p.assistEdgePct >= 0 ? "+" : ""}${p.assistEdgePct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-sec)]">{p.xSh != null ? p.xSh.toFixed(1) : "—"}</td>
                  <td className="py-1.5 px-3 text-right text-[var(--text-sec)]">{p.xSOT != null ? p.xSOT.toFixed(1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-secondary-data text-tertiary p-3">No player data available.</p>}
    </div>
  );
}

export function UnifiedPlayerTable({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  homeLineup,
  awayLineup,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("scorerProb");
  const [sortAsc, setSortAsc] = useState(false);
  const [mobileTeam, setMobileTeam] = useState<"home" | "away">("home");

  const homeRows = useMemo(
    () => sortRows(mergePlayerData(homePlayers, homeLineup), sortKey, sortAsc),
    [homePlayers, homeLineup, sortKey, sortAsc],
  );
  const awayRows = useMemo(
    () => sortRows(mergePlayerData(awayPlayers, awayLineup), sortKey, sortAsc),
    [awayPlayers, awayLineup, sortKey, sortAsc],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  return (
    <section className="px-5 py-4 space-y-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Player projections</h2>

      <div className="flex md:hidden items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileTeam("home")}
          className="text-mono text-[12px] uppercase px-2 py-1 transition-colors"
          style={{
            background: mobileTeam === "home" ? "var(--bg-accent)" : "transparent",
            color: mobileTeam === "home" ? "var(--text-on-accent)" : "var(--text-tertiary)",
            border: mobileTeam === "home" ? "none" : "1px solid var(--border-light)",
          }}
        >
          {homeTeamName}
        </button>
        <button
          type="button"
          onClick={() => setMobileTeam("away")}
          className="text-mono text-[12px] uppercase px-2 py-1 transition-colors"
          style={{
            background: mobileTeam === "away" ? "var(--bg-accent)" : "transparent",
            color: mobileTeam === "away" ? "var(--text-on-accent)" : "var(--text-tertiary)",
            border: mobileTeam === "away" ? "none" : "1px solid var(--border-light)",
          }}
        >
          {awayTeamName}
        </button>
      </div>

      <div className="md:hidden">
        {mobileTeam === "home" ? (
          <TeamPlayerTable teamName={homeTeamName} rows={homeRows} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
        ) : (
          <TeamPlayerTable teamName={awayTeamName} rows={awayRows} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <TeamPlayerTable teamName={homeTeamName} rows={homeRows} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
        <TeamPlayerTable teamName={awayTeamName} rows={awayRows} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
      </div>
    </section>
  );
}
