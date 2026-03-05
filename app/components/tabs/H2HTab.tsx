"use client";

import type { H2HSummary, H2HMatchRow } from "@/lib/feed";
import { percentColor } from "@/lib/percent-color";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number;
  awayTeamId: number;
  h2hSummary?: H2HSummary;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function computeAvg(rows: H2HMatchRow[]): { avgGoals: number; bttsRate: number } {
  const totalGoals = rows.reduce((s, r) => s + r.homeGoals + r.awayGoals, 0);
  const bttsCount = rows.filter((r) => r.homeGoals > 0 && r.awayGoals > 0).length;
  return { avgGoals: totalGoals / rows.length, bttsRate: bttsCount / rows.length };
}

export function H2HTab({ homeTeamName, awayTeamName, homeTeamId, awayTeamId, h2hSummary }: Props) {
  if (!h2hSummary || h2hSummary.homeWins + h2hSummary.draws + h2hSummary.awayWins === 0) {
    return (
      <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <p className="text-[13px] text-tertiary font-mono">No H2H data available.</p>
      </section>
    );
  }

  const total = h2hSummary.homeWins + h2hSummary.draws + h2hSummary.awayWins;
  const hPct = (h2hSummary.homeWins / total) * 100;
  const dPct = (h2hSummary.draws / total) * 100;
  const aPct = (h2hSummary.awayWins / total) * 100;

  const sortedRows = h2hSummary.meetingRows
    ? [...h2hSummary.meetingRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Trend tiles: last 5 vs all-time
  const showTrends = sortedRows.length >= 6;
  let last5Stats: { avgGoals: number; bttsRate: number } | null = null;
  let allTimeStats: { avgGoals: number; bttsRate: number } | null = null;
  if (showTrends) {
    last5Stats = computeAvg(sortedRows.slice(0, 5));
    allTimeStats = computeAvg(sortedRows);
  }

  return (
    <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      {/* 1. Aggregate W/D/L bar */}
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Head to head</h2>
      <div className="flex items-center justify-between text-[12px] font-mono mb-2">
        <span>{homeTeamName.slice(0, 3).toUpperCase()} {h2hSummary.homeWins}W</span>
        <span className="text-tertiary">{h2hSummary.draws}D</span>
        <span>{h2hSummary.awayWins}W {awayTeamName.slice(0, 3).toUpperCase()}</span>
      </div>
      <div className="flex h-3" style={{ gap: "2px" }}>
        <div style={{ width: `${hPct}%`, backgroundColor: "var(--color-home)", minWidth: hPct > 0 ? "4px" : "0" }} />
        <div style={{ width: `${dPct}%`, backgroundColor: "var(--text-tertiary)", minWidth: dPct > 0 ? "4px" : "0" }} />
        <div style={{ width: `${aPct}%`, backgroundColor: "var(--color-away)", minWidth: aPct > 0 ? "4px" : "0" }} />
      </div>
      <p className="text-mono text-[12px] text-tertiary mt-2">
        Last {h2hSummary.meetingsCount ?? total} meetings
      </p>

      {/* 2. Mini-tiles */}
      {(h2hSummary.avgGoals != null || h2hSummary.bttsRate != null) && (
        <div className="flex gap-3 mt-3">
          {h2hSummary.avgGoals != null && (
            <div className="flex-1 py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">Avg Goals</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: "var(--text-main)" }}>
                {h2hSummary.avgGoals.toFixed(1)}
              </p>
            </div>
          )}
          {h2hSummary.bttsRate != null && (
            <div className="flex-1 py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">BTTS Rate</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: percentColor(Math.round(h2hSummary.bttsRate * 100)) }}>
                {Math.round(h2hSummary.bttsRate * 100)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Match log table */}
      {sortedRows.length > 0 && (
        <div className="mt-5 border-t border-[var(--border-light)] pt-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Match log</h3>
          <table className="w-full font-mono text-[12px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                <th className="text-left py-2 px-2 text-tertiary uppercase font-medium" style={{ fontSize: "11px" }}>Date</th>
                <th className="text-center py-2 px-2 text-tertiary uppercase font-medium" style={{ fontSize: "11px" }}>Score</th>
                <th className="text-right py-2 px-2 text-tertiary uppercase font-medium" style={{ fontSize: "11px" }}>Comp</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => {
                const reversed = row.homeTeamId !== homeTeamId;
                const displayHome = reversed ? row.awayGoals : row.homeGoals;
                const displayAway = reversed ? row.homeGoals : row.awayGoals;
                return (
                  <tr
                    key={i}
                    className="border-t border-[var(--border-light)]"
                  >
                    <td className="py-2 px-2 text-left" style={{ color: "var(--text-sec)" }}>
                      {formatDate(row.date)}
                    </td>
                    <td className="py-2 px-2 text-center" style={{ color: "var(--text-main)" }}>
                      {displayHome} - {displayAway}
                      {reversed && (
                        <span className="text-tertiary ml-1" title="Teams reversed (away fixture)" style={{ fontSize: "10px" }}>R</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-tertiary truncate" style={{ maxWidth: "100px" }}>
                      {row.competition ?? "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Trend tiles: last 5 vs all-time */}
      {showTrends && last5Stats && allTimeStats && (
        <div className="mt-5 border-t border-[var(--border-light)] pt-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Recent vs all-time</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">Last 5 Avg Goals</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: "var(--text-main)" }}>
                {last5Stats.avgGoals.toFixed(1)}
              </p>
            </div>
            <div className="py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">All-time Avg Goals</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: "var(--text-main)" }}>
                {allTimeStats.avgGoals.toFixed(1)}
              </p>
            </div>
            <div className="py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">Last 5 BTTS</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: percentColor(Math.round(last5Stats.bttsRate * 100)) }}>
                {Math.round(last5Stats.bttsRate * 100)}%
              </p>
            </div>
            <div className="py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[11px] uppercase text-tertiary font-mono mb-1">All-time BTTS</p>
              <p className="text-[14px] font-semibold font-mono" style={{ color: percentColor(Math.round(allTimeStats.bttsRate * 100)) }}>
                {Math.round(allTimeStats.bttsRate * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
