"use client";

import Link from "next/link";
import type { FeedMatch, FeedMarketRow, FormResult } from "@/lib/feed";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

const FORM_COLOR: Record<FormResult, string> = {
  W: "#9EEC4B",
  D: "#4A4E51",
  L: "#FF4D4D",
};

export function FormSummary({ form }: { form: FormResult[] }) {
  if (!form.length) return null;
  return (
    <div
      className="ml-auto flex shrink-0"
      style={{ gap: 4 }}
      aria-label={`Last 10: ${form.join("-")}`}
      role="img"
    >
      {form.map((r, i) => (
        <span
          key={i}
          className="shrink-0"
          style={{
            width: 8,
            height: 8,
            background: FORM_COLOR[r],
          }}
        />
      ))}
    </div>
  );
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

function formatSeasonRate(r: { hits: number; total: number }): string {
  return r.total > 0 ? `Season ${r.hits}/${r.total}` : "";
}

/** One market row: Label | Home (x/5) Away (x/5) | Combined (x/10) [Avg] [Season] */
function MarketRow({ row }: { row: FeedMarketRow }) {
  if (row.market === "BTTS") {
    const season =
      row.seasonHome && row.seasonAway
        ? `${formatSeasonRate(row.seasonHome)} / ${formatSeasonRate(row.seasonAway)}`
        : row.seasonHome
          ? formatSeasonRate(row.seasonHome)
          : row.seasonAway
            ? formatSeasonRate(row.seasonAway)
            : null;
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-4 text-mono text-[11px] text-tertiary">
          <span className="shrink-0 w-16">{row.market}</span>
          <span className="shrink-0 w-24 text-right">Home ({row.homeHits}/5) Away ({row.awayHits}/5)</span>
          <span className="shrink-0 w-20 text-right">Combined ({row.combinedHits}/10)</span>
        </div>
        {season ? (
          <div className="text-mono text-[10px] text-tertiary/80 pl-0">Season: {season}</div>
        ) : null}
      </div>
    );
  }
  if (row.market === "O2.5") {
    const season =
      row.seasonHome && row.seasonAway
        ? `${formatSeasonRate(row.seasonHome)} / ${formatSeasonRate(row.seasonAway)}`
        : row.seasonHome
          ? formatSeasonRate(row.seasonHome)
          : row.seasonAway
            ? formatSeasonRate(row.seasonAway)
            : null;
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-4 text-mono text-[11px] text-tertiary">
          <span className="shrink-0 w-16">{row.market}</span>
          <span className="shrink-0 w-24 text-right">Home ({row.homeHits}/5) Away ({row.awayHits}/5)</span>
          <span className="shrink-0 w-20 text-right">Combined ({row.combinedHits}/10) Avg: {row.avgGoals.toFixed(1)}</span>
        </div>
        {season ? (
          <div className="text-mono text-[10px] text-tertiary/80 pl-0">Season: {season}</div>
        ) : null}
      </div>
    );
  }
  const season =
    row.seasonHomeAvg != null && row.seasonAwayAvg != null
      ? `H ${row.seasonHomeAvg.toFixed(1)} / A ${row.seasonAwayAvg.toFixed(1)}`
      : row.seasonHomeAvg != null
        ? row.seasonHomeAvg.toFixed(1)
        : row.seasonAwayAvg != null
          ? row.seasonAwayAvg.toFixed(1)
          : null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-4 text-mono text-[11px] text-tertiary">
        <span className="shrink-0 w-16">Corners</span>
        <span className="shrink-0 w-24 text-right">Home {row.homeAvg.toFixed(1)} Away {row.awayAvg.toFixed(1)}</span>
        <span className="shrink-0 w-20 text-right">Combined {row.combinedAvg.toFixed(1)}</span>
      </div>
      {season ? (
        <div className="text-mono text-[10px] text-tertiary/80 pl-0">Season avg: {season}</div>
      ) : null}
    </div>
  );
}

export function MatchCard({ match }: { match: FeedMatch }) {
  const isFinished = match.homeGoals != null && match.awayGoals != null;

  return (
    <div
      className="flex flex-col gap-3 pb-5 border-b last:border-b-0"
      style={{
        gap: "var(--space-sm)",
        paddingBottom: "var(--space-md)",
        borderBottomColor: "var(--border-light)",
        marginLeft: "calc(-1 * var(--space-md))",
        marginRight: "calc(-1 * var(--space-md))",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
      }}
    >
      <div className="flex items-center justify-between text-mono text-[11px] uppercase text-tertiary">
        <span>{formatKickoffTime(match.kickoffUtc)} GMT</span>
        <Link
          href={`/match/${match.providerFixtureId}`}
          className="text-tertiary hover:text-[var(--text-main)] transition-colors"
          aria-label="Open match detail"
        >
          DETAILS --&gt;
        </Link>
      </div>
      <div
        className="flex items-center gap-3"
        style={{ gap: "var(--space-sm)" }}
      >
        <Link
          href={`/match/${match.providerFixtureId}`}
          className="flex-1 min-w-0"
          aria-label={`${match.homeTeamName} v ${match.awayTeamName} – match detail`}
        >
          <div className="flex flex-col gap-0.5">
            <div
              className="flex items-center gap-3"
              style={{ gap: "var(--space-sm)" }}
            >
              <img
                src={match.homeTeamLogo}
                alt=""
                className="w-6 h-6 object-contain shrink-0 rounded-sm"
                width={24}
                height={24}
              />
              <span
                className="font-semibold uppercase truncate block"
                style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
              >
                {match.homeTeamCode ?? match.homeTeamName}
              </span>
              <FormSummary form={match.homeForm ?? []} />
            </div>
            <div
              className="flex items-center gap-3"
              style={{ gap: "var(--space-sm)" }}
            >
              <img
                src={match.awayTeamLogo}
                alt=""
                className="w-6 h-6 object-contain shrink-0 rounded-sm"
                width={24}
                height={24}
              />
              <span
                className="font-semibold uppercase truncate block"
                style={{
                  fontSize: "28px",
                  letterSpacing: "-0.8px",
                  lineHeight: 1.05,
                }}
              >
                {match.awayTeamCode ?? match.awayTeamName}
              </span>
              <FormSummary form={match.awayForm ?? []} />
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          {isFinished ? (
            <span
              className="text-mono stat-value font-medium"
              style={{ fontSize: "15px" }}
            >
              {match.homeGoals} – {match.awayGoals}
            </span>
          ) : null}
        </div>
      </div>

      {match.h2hSummary ? (
        <div className="mt-2">
          <H2HTeaser summary={match.h2hSummary} />
        </div>
      ) : null}

      {(match.homeAvgGoalsFor != null || match.awayAvgGoalsFor != null) ? (
        <div className="text-mono text-[11px] text-tertiary">
          Avg goals (L5):{" "}
          {match.homeAvgGoalsFor != null && match.homeAvgGoalsAgainst != null && (
            <span>Home {match.homeAvgGoalsFor.toFixed(1)} for / {match.homeAvgGoalsAgainst.toFixed(1)} against</span>
          )}
          {match.homeAvgGoalsFor != null && match.awayAvgGoalsFor != null && " · "}
          {match.awayAvgGoalsFor != null && match.awayAvgGoalsAgainst != null && (
            <span>Away {match.awayAvgGoalsFor.toFixed(1)} for / {match.awayAvgGoalsAgainst.toFixed(1)} against</span>
          )}
        </div>
      ) : null}

      {match.marketRows.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {match.marketRows.map((row, i) => (
            <MarketRow key={`${row.market}-${i}`} row={row} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
