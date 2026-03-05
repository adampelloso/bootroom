"use client";

import type { FeedMatch } from "@/lib/feed";
import type { DateRange } from "./DateSelector";
import { MatchCard } from "./MatchCard";

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .toUpperCase();
}

function groupByDate(matches: FeedMatch[]): Array<{ date: string; matches: FeedMatch[] }> {
  const groups: Map<string, FeedMatch[]> = new Map();
  for (const m of matches) {
    const date = m.kickoffUtc.slice(0, 10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(m);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, matches]) => ({ date, matches }));
}

function DateGroupHeader({ date }: { date: string }) {
  return (
    <div
      className="col-span-full font-mono text-[12px] uppercase font-bold tracking-wider"
      style={{
        color: "var(--color-amber)",
        paddingTop: "var(--space-md)",
        paddingBottom: "var(--space-xs)",
        marginBottom: "var(--space-sm)",
      }}
    >
      {formatDateHeader(date)}
    </div>
  );
}

export function FeedView({
  matches,
  currentRange,
}: {
  matches: FeedMatch[];
  currentRange: DateRange;
}) {
  const showDateHeaders = currentRange === "week";

  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-[var(--border-light)] pt-5 pb-8"
      style={{ gap: "var(--space-sm)" }}
    >
      {matches.length === 0 ? (
        <p className="text-[13px] text-secondary">No matches in the feed.</p>
      ) : showDateHeaders ? (
        groupByDate(matches).map((group) => (
          <div key={group.date} className="col-span-full">
            <DateGroupHeader date={group.date} />
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              style={{ gap: "var(--space-sm)" }}
            >
              {group.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))
      ) : (
        matches.map((match: FeedMatch) => (
          <MatchCard key={match.id} match={match} />
        ))
      )}
    </section>
  );
}
