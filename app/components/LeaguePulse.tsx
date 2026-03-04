"use client";

import Link from "next/link";
import type { MatchEdges } from "@/lib/edge-engine";
import { getLeagueColor, getLeagueStrength } from "@/lib/leagues";

type LeagueData = {
  leagueId: number;
  name: string;
  matches: number;
  topEdge: MatchEdges | null;
};

type Props = {
  leagues: LeagueData[];
};

export function LeaguePulse({ leagues }: Props) {
  const sorted = [...leagues].sort(
    (a, b) => getLeagueStrength(b.leagueId) - getLeagueStrength(a.leagueId)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: "var(--space-sm)" }}>
      {sorted.map((league) => {
        const color = getLeagueColor(league.leagueId);
        return (
          <Link
            key={league.leagueId}
            href={`/feed?league=${league.leagueId}`}
            className="block cursor-pointer transition-colors hover:bg-[var(--bg-card)]"
            style={{
              borderLeft: `3px solid ${color}`,
              background: "var(--bg-panel)",
              padding: "var(--space-sm)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-semibold text-[13px] uppercase"
                style={{ color: "var(--text-main)" }}
              >
                {league.name}
              </span>
              <span
                className="font-mono text-[11px] uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                {league.matches} match{league.matches !== 1 ? "es" : ""}
              </span>
            </div>

            {league.topEdge && (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="font-mono text-[12px] uppercase"
                  style={{ color: "var(--text-sec)" }}
                >
                  Top: {league.topEdge.bestMarket}
                </span>
                <span
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "var(--color-edge-strong)" }}
                >
                  +{(league.topEdge.bestEdge * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {!league.topEdge && (
              <p
                className="font-mono text-[11px] uppercase mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                No edges
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
