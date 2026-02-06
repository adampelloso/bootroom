"use client";

import Link from "next/link";
import type { FeedMatch } from "@/lib/feed";
import { EVBadge } from "./EVBadge";
import { FormDisplay } from "./FormDisplay";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function H2HTeaser({ summary }: { summary: { homeWins: number; draws: number; awayWins: number; lastWinner?: string } }) {
  const { homeWins, draws, awayWins, lastWinner } = summary;
  const text = lastWinner
    ? `Last 5 H2H: ${homeWins}-${draws}-${awayWins} (${lastWinner})`
    : `Last 5 H2H: ${homeWins}-${draws}-${awayWins}`;
  return (
    <span className="text-mono text-[11px] uppercase text-tertiary">
      {text}
    </span>
  );
}

export function MatchCard({ match }: { match: FeedMatch }) {
  const isFinished = match.homeGoals != null && match.awayGoals != null;
  const hasEvFlags = match.modelProbs?.evFlags && match.modelProbs.evFlags.length > 0;
  const mp = match.modelProbs;
  const hasMcData = mp?.expectedHomeGoals != null && mp?.expectedAwayGoals != null;

  // Fallback: historical stats line (only when no MC data)
  let statParts: string[] = [];
  if (!hasMcData) {
    const o25Row = match.marketRows.find((r) => r.market === "O2.5");
    const bttsRow = match.marketRows.find((r) => r.market === "BTTS");
    const cornersRow = match.marketRows.find((r) => r.market === "Corners");
    if (o25Row && o25Row.market === "O2.5") {
      statParts.push(`O2.5 ${o25Row.combinedHits}/10`);
    }
    if (bttsRow && bttsRow.market === "BTTS") {
      statParts.push(`BTTS ${bttsRow.combinedHits}/10`);
    }
    if (o25Row && o25Row.market === "O2.5") {
      statParts.push(`AVG ${o25Row.avgGoals.toFixed(1)}`);
    }
    if (cornersRow && cornersRow.market === "Corners") {
      statParts.push(`CORNERS ${cornersRow.combinedAvg.toFixed(1)}`);
    }
  }

  return (
    <Link
      href={`/match/${match.providerFixtureId}`}
      className="flex flex-col gap-3 pb-5 border-b last:border-b-0 cursor-pointer transition-colors"
      style={{
        gap: "var(--space-sm)",
        paddingBottom: "var(--space-md)",
        borderBottomColor: "var(--border-light)",
        marginLeft: "calc(-1 * var(--space-md))",
        marginRight: "calc(-1 * var(--space-md))",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
        borderLeft: hasEvFlags ? "2px solid var(--color-accent)" : "2px solid transparent",
      }}
      aria-label={`${match.homeTeamName} v ${match.awayTeamName} – match detail`}
    >
      <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary">
        <div className="flex items-center gap-2">
          {match.leagueName ? (
            <span
              className="font-semibold uppercase"
              style={{
                color: "var(--text-sec)",
                fontSize: "10px",
              }}
              aria-label={`Competition: ${match.leagueName}`}
            >
              {match.leagueName}
            </span>
          ) : null}
          <span>{formatKickoffTime(match.kickoffUtc)} GMT</span>
        </div>
        <div className="flex items-center gap-2">
          {hasEvFlags && (
            <div className="flex items-center gap-1">
              {match.modelProbs!.evFlags!.slice(0, 2).map((flag) => (
                <EVBadge key={flag} edge={0.05} market={flag} size="small" />
              ))}
            </div>
          )}
          <Link
            href={`/match/${match.providerFixtureId}/sim`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center px-2 py-0.5 border text-mono text-[10px] uppercase font-medium transition-colors"
            style={{
              borderColor: "var(--text-tertiary)",
              color: "var(--text-tertiary)",
            }}
            aria-label="Open Monte Carlo simulation view"
          >
            SIM
          </Link>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3" style={{ gap: "var(--space-sm)" }}>
              <img
                src={match.homeTeamLogo}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
                width={24}
                height={24}
              />
              <span
                className="font-semibold uppercase truncate block text-headline"
                style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {match.homeTeamCode ?? match.homeTeamName}
              </span>
            </div>
            <div className="flex items-center gap-3" style={{ gap: "var(--space-sm)" }}>
              <img
                src={match.awayTeamLogo}
                alt=""
                className="w-6 h-6 object-contain shrink-0"
                width={24}
                height={24}
              />
              <span
                className="font-semibold uppercase truncate block text-headline"
                style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {match.awayTeamCode ?? match.awayTeamName}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {match.homeForm && match.homeForm.length > 0 && <FormDisplay form={match.homeForm} label="Home form" />}
          {match.awayForm && match.awayForm.length > 0 && <FormDisplay form={match.awayForm} label="Away form" />}
          {isFinished && (
            <span className="text-mono stat-value font-medium text-primary-data">
              {match.homeGoals} – {match.awayGoals}
            </span>
          )}
        </div>
      </div>

      {match.h2hSummary && (
        <div className="mt-1">
          <H2HTeaser summary={match.h2hSummary} />
        </div>
      )}

      {/* MC model stats or historical fallback */}
      {hasMcData ? (
        <div className="mt-1 flex flex-col gap-0.5">
          <p className="text-secondary-data text-tertiary">
            {`xG ${mp!.expectedHomeGoals!.toFixed(1)} – ${mp!.expectedAwayGoals!.toFixed(1)}`}
            {mp!.expectedHomeCorners != null && mp!.expectedAwayCorners != null
              ? ` · CORNERS ${(mp!.expectedHomeCorners + mp!.expectedAwayCorners).toFixed(1)}`
              : ""}
          </p>
          {mp!.topScorelines && mp!.topScorelines.length > 0 && (
            <p className="text-mono text-[12px] text-tertiary">
              {mp!.topScorelines
                .map((s) => `${s.score} (${Math.round(s.prob * 100)}%)`)
                .join(" · ")}
            </p>
          )}
        </div>
      ) : statParts.length > 0 ? (
        <p className="text-secondary-data text-tertiary mt-1">
          {statParts.join(" · ")}
        </p>
      ) : null}
    </Link>
  );
}
