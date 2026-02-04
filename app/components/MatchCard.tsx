"use client";

import Link from "next/link";
import type { FeedMatch, FormResult } from "@/lib/feed";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function FormSummary({ form }: { form: FormResult[] }) {
  if (!form.length) return null;
  return (
    <span
      className="ml-auto text-mono text-[11px] uppercase text-black whitespace-nowrap"
      aria-label={`Form: ${form.join("-")}`}
      style={{ letterSpacing: "0.3em" }}
    >
      {form.join(" ")}
    </span>
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

export function MatchCard({ match }: { match: FeedMatch }) {
  const isFinished = match.homeGoals != null && match.awayGoals != null;

  return (
    <div
      className="flex flex-col gap-3 pb-5 border-b last:border-b-0"
      style={{
        gap: "var(--space-sm)",
        paddingBottom: "var(--space-md)",
        borderBottomColor: "#000",
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
          aria-label="Open match detail"
        >
          <div className="flex flex-col gap-0.5">
            <div
              className="flex items-center gap-3"
              style={{ gap: "var(--space-sm)" }}
            >
              <span
                className="font-semibold uppercase truncate block"
                style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
              >
                {match.homeTeamName}
              </span>
              <FormSummary form={match.homeForm ?? []} />
            </div>
            <div
              className="flex items-center gap-3"
              style={{ gap: "var(--space-sm)" }}
            >
              <span
                className="font-semibold uppercase truncate block"
                style={{
                  fontSize: "28px",
                  letterSpacing: "-0.8px",
                  lineHeight: 1.05,
                }}
              >
                {match.awayTeamName}
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

      <div className="mt-3">
        {match.highlights.map((h, index) => (
          <div
            key={h.id}
            className={`flex items-start justify-between gap-3 ${
              index === 0 ? "bg-black text-white" : ""
            }`}
            style={{
              padding: "var(--space-sm) var(--space-md)",
              gap: "var(--space-sm)",
              background: index === 0 ? undefined : "#f0f0f0",
            }}
          >
            <p
              className="font-medium flex-1 min-w-0"
              style={{ fontSize: "13px", lineHeight: 1.5 }}
            >
              {h.headline}
            </p>
            {h.period ? (
              <span
                className={`text-mono text-[11px] uppercase shrink-0 ${
                  index === 0 ? "text-white/70" : "text-tertiary"
                }`}
              >
                {h.period}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
