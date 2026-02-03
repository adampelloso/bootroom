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
  const isFinished = match.homeGoals != null && match.awayGoals != null;
  const toAbbr = (name: string) =>
    name
      .replace(/[^A-Za-z\s]/g, "")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);

  return (
    <Link
      href={`/match/${match.providerFixtureId}`}
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
        <span className="text-right">{match.venueName ?? "Venue TBD"}</span>
      </div>
      <div
        className="flex items-center gap-3"
        style={{ gap: "var(--space-sm)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-semibold uppercase truncate block"
              style={{ fontSize: "28px", letterSpacing: "-0.8px", lineHeight: 1.05 }}
            >
              {match.homeTeamName}
            </span>
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
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isFinished ? (
            <span
              className="text-mono stat-value font-medium"
              style={{ fontSize: "15px" }}
            >
              {match.homeGoals} – {match.awayGoals}
            </span>
          ) : null}
          <Link
            href={`/match/${match.providerFixtureId}`}
            aria-label="Open match detail"
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-light)] bg-[var(--bg-body)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transform: "rotate(-90deg)" }}
            >
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </Link>
        </div>
      </div>

      {match.highlights.map((h, index) => (
        <div
          key={h.id}
          className={`flex items-start gap-3 rounded-xl py-3 px-5 mt-1 ${
            index === 0 ? "bg-black text-white" : ""
          }`}
          style={{
            background: index === 0 ? undefined : "var(--bg-surface)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: 12,
            gap: "var(--space-sm)",
            marginTop: 4,
          }}
        >
          <div>
            {index === 0 ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                Key Insight
              </span>
            ) : null}
            <p
              className={`font-medium ${index === 0 ? "mt-2" : ""}`}
              style={{ fontSize: "13px", lineHeight: 1.5 }}
            >
              {h.headline}
            </p>
            <p
              className={`text-mono text-[11px] mt-1 ${
                index === 0 ? "text-white/70" : "text-secondary"
              }`}
            >
              {h.supportLabel}: {h.supportValue}
            </p>
          </div>
        </div>
      ))}
    </Link>
  );
}
