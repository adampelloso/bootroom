"use client";

import Link from "next/link";
import type { FeedMatch } from "@/lib/feed";
import { percentPill } from "@/lib/percent-color";
import { EdgeBadge, getBestEdge } from "@/app/components/EdgeBadge";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function getBttsPercent(match: FeedMatch): number | null {
  // Prefer calibrated BTTS, fall back to raw MC
  if (match.modelProbs?.btts != null) return match.modelProbs.btts;
  if (match.modelProbs?.mcBtts != null) return match.modelProbs.mcBtts;
  // Fall back to combined hit rate from market rows (hits out of 10 combined matches)
  const bttsRow = match.marketRows.find((r) => r.market === "BTTS");
  if (bttsRow && bttsRow.market === "BTTS") return bttsRow.combinedHits / 10;
  return null;
}

function getOver25Percent(match: FeedMatch): number | null {
  if (match.modelProbs?.mcOver25 != null) return match.modelProbs.mcOver25;
  if (match.modelProbs?.over_2_5 != null) return match.modelProbs.over_2_5;
  const o25Row = match.marketRows.find((r) => r.market === "O2.5");
  if (o25Row) return o25Row.combinedHits / 10;
  return null;
}

export function MatchCard({ match }: { match: FeedMatch }) {
  const mp = match.modelProbs;
  const hasMcData = mp?.expectedHomeGoals != null && mp?.expectedAwayGoals != null;
  const totalXg = hasMcData ? mp!.expectedHomeGoals! + mp!.expectedAwayGoals! : null;

  // Fallback xG-like stats from market rows when no MC data
  const o25Row = match.marketRows.find((r) => r.market === "O2.5");
  const hasAvgGoals = !hasMcData && o25Row;
  const homeAvg = match.homeAvgGoalsFor;
  const awayAvg = match.awayAvgGoalsFor;
  const totalAvg = hasAvgGoals ? o25Row.avgGoals : null;

  const over25Display = getOver25Percent(match);
  const bttsDisplay = getBttsPercent(match);
  const bestEdge = getBestEdge(match.modelProbs);

  return (
    <Link
      href={`/match/${match.providerFixtureId}`}
      className="block cursor-pointer transition-colors hover:bg-[var(--bg-card)]"
      style={{
        borderLeft: "3px solid var(--border-light)",
        background: "var(--bg-panel)",
        padding: "var(--space-sm)",
      }}
      aria-label={`${match.homeTeamName} v ${match.awayTeamName} – match detail`}
    >
      {/* Header row: league left, edge + time right */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-mono text-[12px] uppercase" style={{ color: "var(--text-tertiary)" }}>
          {match.leagueName && (
            <span className="font-semibold">
              {match.leagueName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bestEdge && (
            <EdgeBadge edge={bestEdge.edge} market={bestEdge.market} variant="badge" />
          )}
          <span className="text-mono text-[12px] uppercase" style={{ color: "var(--text-tertiary)" }}>
            {formatKickoffTime(match.kickoffUtc)}
          </span>
        </div>
      </div>

      {/* Teams row: home — H2H — away */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src={match.homeTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
          <span
            className="font-bold uppercase truncate text-headline"
            style={{ fontSize: "18px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {match.homeTeamCode ?? match.homeTeamName}
          </span>
        </div>
        {match.h2hSummary && (
          <span className="text-mono text-[12px] uppercase shrink-0 px-2" style={{ color: "var(--text-tertiary)" }}>
            {match.h2hSummary.homeWins}-{match.h2hSummary.draws}-{match.h2hSummary.awayWins}
          </span>
        )}
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span
            className="font-bold uppercase truncate text-headline"
            style={{ fontSize: "18px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {match.awayTeamCode ?? match.awayTeamName}
          </span>
          <img src={match.awayTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
        </div>
      </div>

      {/* Stats table — always the same layout, rows hidden when data unavailable */}
      <table className="w-full text-mono" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--bg-surface)" }}>
            <th className="text-left text-table-header py-1.5 px-1.5" style={{ color: "var(--text-tertiary)", width: "40%" }}>
              Stat
            </th>
            <th className="text-center text-table-header py-1.5 px-1.5" style={{ color: "var(--text-tertiary)", width: "20%" }}>
              Home
            </th>
            <th className="text-center text-table-header py-1.5 px-1.5" style={{ color: "var(--text-tertiary)", width: "20%" }}>
              Away
            </th>
            <th className="text-right text-table-header py-1.5 px-1.5" style={{ color: "var(--text-tertiary)", width: "20%" }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {/* xG row (from MC) or Avg Goals row (from market rows) */}
          {hasMcData ? (
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td className="py-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>xG</td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{mp!.expectedHomeGoals!.toFixed(1)}</td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{mp!.expectedAwayGoals!.toFixed(1)}</td>
              <td className="py-1.5 text-right text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{totalXg!.toFixed(1)}</td>
            </tr>
          ) : (homeAvg != null || totalAvg != null) ? (
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td className="py-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>Avg</td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{homeAvg != null ? homeAvg.toFixed(1) : "–"}</td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{awayAvg != null ? awayAvg.toFixed(1) : "–"}</td>
              <td className="py-1.5 text-right text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{totalAvg != null ? totalAvg.toFixed(1) : "–"}</td>
            </tr>
          ) : null}

          {/* O2.5 + BTTS pills row */}
          {(over25Display != null || bttsDisplay != null) && (
            <tr>
              <td colSpan={4} className="py-1.5">
                <div className="flex items-center">
                  <span className="w-1/2 flex items-center gap-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>
                    {over25Display != null && (<>
                      o2.5
                      <span className="inline-block px-2 py-0.5 rounded text-[12px] font-bold" style={{ background: percentPill(Math.round(over25Display * 100)).bg, color: percentPill(Math.round(over25Display * 100)).text }}>{Math.round(over25Display * 100)}%</span>
                    </>)}
                  </span>
                  <span className="w-1/2 flex items-center justify-end gap-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>
                    {bttsDisplay != null && (<>
                      BTTS
                      <span className="inline-block px-2 py-0.5 rounded text-[12px] font-bold" style={{ background: percentPill(Math.round(bttsDisplay * 100)).bg, color: percentPill(Math.round(bttsDisplay * 100)).text }}>{Math.round(bttsDisplay * 100)}%</span>
                    </>)}
                  </span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Top scorelines (only when MC data available) */}
      {hasMcData && mp!.topScorelines && mp!.topScorelines.length > 0 && (
        <div className="flex items-stretch gap-2 pt-2 text-mono uppercase">
          {mp!.topScorelines.map((s) => (
            <div
              key={s.score}
              className="flex-1 flex flex-col items-center justify-center py-2"
              style={{ background: "var(--bg-surface)" }}
            >
              <span className="text-[15px] font-bold" style={{ color: "var(--text-main)" }}>{s.score}</span>
              <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{Math.round(s.prob * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
