"use client";

import Link from "next/link";
import type { FeedMatch, FeedInsight, FormResult } from "@/lib/feed";

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

function venueTag(h: FeedInsight): string {
  const period = h.period ?? "L10";
  if (h.venueContext === "Combined") return period.startsWith("Combined") ? period : `Combined ${period}`;
  return `${h.venueContext} ${period}`;
}

const CONFIDENCE_STYLE: Record<FeedInsight["confidence"], string> = {
  Soft: "bg-[var(--bg-muted)] text-tertiary",
  Medium: "bg-[var(--bg-accent)]/20 text-[var(--text-main)]",
  Strong: "bg-[var(--bg-accent)] text-[var(--text-on-accent)]",
};

function HighlightRow({ h, index }: { h: FeedInsight; index: number }) {
  const isAccent = index === 0;
  const onAccent = isAccent ? "text-[var(--text-on-accent)]" : "";
  const onAccentMuted = isAccent ? "text-[var(--text-on-accent)]/70" : "text-tertiary";
  const confidenceClass = isAccent
    ? "bg-[var(--text-on-accent)]/20 text-[var(--text-on-accent)]"
    : CONFIDENCE_STYLE[h.confidence];
  return (
    <div
      className={`flex flex-col gap-1.5 ${isAccent ? "bg-[var(--bg-accent)] text-[var(--text-on-accent)]" : ""}`}
      style={{
        padding: "var(--space-sm) var(--space-md)",
        background: isAccent ? undefined : "var(--bg-surface)",
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`px-1.5 py-0.5 rounded text-mono uppercase ${isAccent ? "bg-[var(--text-on-accent)]/20" : "bg-[var(--bg-muted)] text-tertiary"}`}
        >
          {h.market}
        </span>
        <span className={onAccentMuted}>{h.direction}</span>
        <span className={`px-1.5 py-0.5 rounded text-mono uppercase ${confidenceClass}`} style={{ fontSize: "10px" }}>
          {h.confidence}
        </span>
        <span className={onAccentMuted}>
          {venueTag(h)}
        </span>
      </div>
      <p className={`font-medium flex-1 min-w-0 ${onAccent}`} style={{ fontSize: "13px", lineHeight: 1.5 }}>
        {h.headline}
      </p>
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

      {(match.primaryAngle ?? match.secondaryAngle ?? match.volatility) ? (
        <div
          className="text-mono text-[11px] uppercase text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1"
          style={{ marginTop: "var(--space-xs)" }}
        >
          {match.primaryAngle ? (
            <span>
              <span className="text-tertiary/80">Primary:</span> {match.primaryAngle}
            </span>
          ) : null}
          {match.secondaryAngle ? (
            <span>
              <span className="text-tertiary/80">Secondary:</span> {match.secondaryAngle}
            </span>
          ) : null}
          {match.volatility ? (
            <span>
              <span className="text-tertiary/80">Volatility:</span> {match.volatility}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        {match.highlights.map((h, index) => (
          <HighlightRow key={h.id} h={h} index={index} />
        ))}
      </div>
    </div>
  );
}
