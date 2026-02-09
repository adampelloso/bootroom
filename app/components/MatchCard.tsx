"use client";

import Link from "next/link";
import type { FeedMatch } from "@/lib/feed";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function MatchCard({ match }: { match: FeedMatch }) {
  const mp = match.modelProbs;
  const hasMcData = mp?.expectedHomeGoals != null && mp?.expectedAwayGoals != null;

  // Fallback stats when no MC data
  let statParts: string[] = [];
  if (!hasMcData) {
    const o25Row = match.marketRows.find((r) => r.market === "O2.5");
    const bttsRow = match.marketRows.find((r) => r.market === "BTTS");
    const cornersRow = match.marketRows.find((r) => r.market === "Corners");
    if (o25Row) statParts.push(`O2.5 ${o25Row.combinedHits}/10`);
    if (bttsRow) statParts.push(`BTTS ${bttsRow.combinedHits}/10`);
    if (o25Row) statParts.push(`AVG ${o25Row.avgGoals.toFixed(1)}`);
    if (cornersRow) statParts.push(`CORNERS ${cornersRow.combinedAvg.toFixed(1)}`);
  }

  const totalXg = hasMcData ? mp!.expectedHomeGoals! + mp!.expectedAwayGoals! : null;
  const totalCorners =
    mp?.expectedHomeCorners != null && mp?.expectedAwayCorners != null
      ? mp.expectedHomeCorners + mp.expectedAwayCorners
      : null;

  return (
    <Link
      href={`/match/${match.providerFixtureId}`}
      className="block cursor-pointer transition-colors"
      style={{
        border: "2px solid var(--text-main)",
        padding: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
      }}
      aria-label={`${match.homeTeamName} v ${match.awayTeamName} – match detail`}
    >
      {/* Header row: league + kickoff left, SIM button right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-mono text-[11px] uppercase" style={{ color: "var(--text-tertiary)" }}>
          {match.leagueName && (
            <span className="font-semibold" style={{ color: "var(--text-sec)" }}>
              {match.leagueName}
            </span>
          )}
          <span>{formatKickoffTime(match.kickoffUtc)}</span>
        </div>
        <Link
          href={`/match/${match.providerFixtureId}/sim`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center px-3 py-1 text-mono text-[11px] uppercase font-bold tracking-wide transition-colors"
          style={{
            border: "2px solid var(--text-main)",
            color: "var(--text-main)",
            background: "transparent",
          }}
          aria-label="Open Monte Carlo simulation view"
        >
          SIM
        </Link>
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2">
          <img src={match.homeTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
          <span
            className="font-bold uppercase truncate text-headline"
            style={{ fontSize: "18px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {match.homeTeamCode ?? match.homeTeamName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <img src={match.awayTeamLogo} alt="" className="w-6 h-6 object-contain shrink-0" width={24} height={24} />
          <span
            className="font-bold uppercase truncate text-headline"
            style={{ fontSize: "18px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {match.awayTeamCode ?? match.awayTeamName}
          </span>
        </div>
      </div>

      {/* Stats table */}
      {hasMcData ? (
        <table
          className="w-full text-mono"
          style={{
            borderCollapse: "collapse",
            borderTop: "1px solid var(--text-main)",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--text-main)" }}>
              <th
                className="text-left uppercase font-bold py-1.5 text-[10px] tracking-wider"
                style={{ color: "var(--text-tertiary)", width: "40%" }}
              >
                Stat
              </th>
              <th
                className="text-center uppercase font-bold py-1.5 text-[10px] tracking-wider"
                style={{ color: "var(--text-tertiary)", width: "20%" }}
              >
                Home
              </th>
              <th
                className="text-center uppercase font-bold py-1.5 text-[10px] tracking-wider"
                style={{ color: "var(--text-tertiary)", width: "20%" }}
              >
                Away
              </th>
              <th
                className="text-right uppercase font-bold py-1.5 text-[10px] tracking-wider"
                style={{ color: "var(--text-tertiary)", width: "20%" }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td className="py-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>
                Exp. Goals
              </td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                {mp!.expectedHomeGoals!.toFixed(1)}
              </td>
              <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                {mp!.expectedAwayGoals!.toFixed(1)}
              </td>
              <td className="py-1.5 text-right text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                {totalXg!.toFixed(1)}
              </td>
            </tr>
            {totalCorners != null && (
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td className="py-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>
                  Exp. Corners
                </td>
                <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                  {mp!.expectedHomeCorners!.toFixed(1)}
                </td>
                <td className="py-1.5 text-center text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                  {mp!.expectedAwayCorners!.toFixed(1)}
                </td>
                <td className="py-1.5 text-right text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                  {totalCorners.toFixed(1)}
                </td>
              </tr>
            )}
            {mp!.over_2_5 != null && (
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td className="py-1.5 text-[12px] uppercase font-semibold" style={{ color: "var(--text-sec)" }}>
                  Over 2.5
                </td>
                <td colSpan={3} className="py-1.5 text-right text-[13px] font-bold" style={{ color: "var(--text-main)" }}>
                  {Math.round(mp!.over_2_5! * 100)}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : statParts.length > 0 ? (
        <div
          className="text-mono text-[12px] uppercase pt-2"
          style={{
            borderTop: "1px solid var(--text-main)",
            color: "var(--text-tertiary)",
          }}
        >
          {statParts.join(" · ")}
        </div>
      ) : null}

      {/* Top scorelines */}
      {hasMcData && mp!.topScorelines && mp!.topScorelines.length > 0 && (
        <div
          className="flex items-center gap-3 pt-2 mt-1 text-mono text-[11px] uppercase"
          style={{
            borderTop: "1px solid var(--border-light)",
            color: "var(--text-tertiary)",
          }}
        >
          <span className="font-semibold" style={{ color: "var(--text-sec)" }}>Likely</span>
          {mp!.topScorelines.map((s) => (
            <span key={s.score}>
              {s.score}{" "}
              <span style={{ color: "var(--text-main)" }}>{Math.round(s.prob * 100)}%</span>
            </span>
          ))}
        </div>
      )}

      {/* H2H teaser */}
      {match.h2hSummary && (
        <div
          className="pt-2 mt-1 text-mono text-[11px] uppercase"
          style={{
            borderTop: "1px solid var(--border-light)",
            color: "var(--text-tertiary)",
          }}
        >
          H2H: {match.h2hSummary.homeWins}-{match.h2hSummary.draws}-{match.h2hSummary.awayWins}
          {match.h2hSummary.lastWinner ? ` (${match.h2hSummary.lastWinner})` : ""}
        </div>
      )}
    </Link>
  );
}
