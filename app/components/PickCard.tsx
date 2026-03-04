"use client";

import Link from "next/link";
import type { FeedMatch } from "@/lib/feed";
import type { MatchEdges } from "@/lib/edge-engine";
import { EdgeBadge } from "@/app/components/EdgeBadge";
import { getLeagueColor } from "@/lib/leagues";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function tierColor(tier: string): string {
  if (tier === "HIGH") return "var(--color-edge-strong)";
  if (tier === "MEDIUM") return "var(--color-amber)";
  return "var(--color-edge-negative)";
}

type Props = {
  match: FeedMatch;
  edges: MatchEdges;
};

export function PickCard({ match, edges }: Props) {
  const leagueColor = match.leagueId ? getLeagueColor(match.leagueId) : "var(--border-light)";
  const narrative = match.narrative
    ? match.narrative.length > 100
      ? match.narrative.slice(0, 97) + "..."
      : match.narrative
    : null;

  return (
    <Link
      href={`/match/${match.providerFixtureId}?tab=value`}
      className="block cursor-pointer transition-colors hover:bg-[var(--bg-card)]"
      style={{
        borderLeft: `3px solid ${leagueColor}`,
        background: "var(--bg-panel)",
        padding: "var(--space-sm)",
      }}
    >
      {/* League + kickoff */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[12px] uppercase font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          {match.leagueName ?? ""}
        </span>
        <span
          className="font-mono text-[12px] uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          {formatKickoffTime(match.kickoffUtc)}
        </span>
      </div>

      {/* Match name */}
      <p
        className="font-bold uppercase"
        style={{
          fontSize: "16px",
          letterSpacing: "-0.02em",
          lineHeight: 1.3,
          color: "var(--text-main)",
        }}
      >
        {match.homeTeamCode ?? match.homeTeamName} v{" "}
        {match.awayTeamCode ?? match.awayTeamName}
      </p>

      {/* Best market */}
      <p
        className="font-mono text-[14px] uppercase font-semibold mt-2"
        style={{ color: "var(--text-sec)" }}
      >
        {edges.bestMarket}
      </p>

      {/* Edge badge + tier */}
      <div className="flex items-center gap-2 mt-2">
        <EdgeBadge
          edge={edges.bestEdge}
          market={edges.bestMarket}
          variant="badge"
        />
        <span
          className="font-mono text-[11px] uppercase font-semibold px-1.5 py-0.5 rounded"
          style={{
            color: tierColor(edges.bestTier),
            background: `color-mix(in srgb, ${tierColor(edges.bestTier)} 12%, transparent)`,
          }}
        >
          {edges.bestTier}
        </span>
      </div>

      {/* Narrative */}
      {narrative && (
        <p
          className="text-[13px] mt-2"
          style={{ color: "var(--text-sec)", lineHeight: 1.4 }}
        >
          {narrative}
        </p>
      )}

      {/* CTA */}
      <p
        className="font-mono text-[11px] uppercase mt-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        See Full Analysis &rarr;
      </p>
    </Link>
  );
}
