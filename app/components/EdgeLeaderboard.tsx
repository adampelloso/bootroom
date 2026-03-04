"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchEdges } from "@/lib/edge-engine";
import { EdgeBadge } from "@/app/components/EdgeBadge";

type SortKey = "edge" | "kickoff" | "league" | "market";

function formatTime(iso: string): string {
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

function sortEdges(edges: MatchEdges[], key: SortKey): MatchEdges[] {
  const sorted = [...edges];
  switch (key) {
    case "edge":
      return sorted.sort((a, b) => b.bestEdge - a.bestEdge);
    case "kickoff":
      return sorted.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
    case "league":
      return sorted.sort((a, b) => (a.leagueName ?? "").localeCompare(b.leagueName ?? ""));
    case "market":
      return sorted.sort((a, b) => a.bestMarket.localeCompare(b.bestMarket));
    default:
      return sorted;
  }
}

type Props = {
  edges: MatchEdges[];
};

export function EdgeLeaderboard({ edges }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("edge");
  const sorted = sortEdges(edges, sortBy);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "edge", label: "Edge" },
    { key: "kickoff", label: "Kickoff" },
    { key: "league", label: "League" },
    { key: "market", label: "Market" },
  ];

  return (
    <div>
      {/* Sort toggles */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="font-mono text-[11px] uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Sort:
        </span>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className="font-mono text-[11px] uppercase px-2 py-0.5 rounded cursor-pointer transition-colors"
            style={{
              background: sortBy === opt.key ? "var(--bg-surface)" : "transparent",
              color: sortBy === opt.key ? "var(--text-main)" : "var(--text-tertiary)",
              border: "none",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="w-full text-[12px] font-mono" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr
              className="text-[11px] uppercase tracking-[0.08em]"
              style={{ background: "var(--bg-surface)", color: "var(--text-tertiary)" }}
            >
              <th className="text-left py-2 px-3 font-semibold">Match</th>
              <th className="text-left py-2 px-3 font-semibold">Best Market</th>
              <th className="text-right py-2 px-3 font-semibold">Edge</th>
              <th className="text-right py-2 px-3 font-semibold">Tier</th>
              <th className="text-right py-2 px-3 font-semibold">Kickoff</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const matchUrl = `/match/${e.matchId.replace("match-", "")}`;
              const edgePct = `+${(e.bestEdge * 100).toFixed(1)}%`;
              return (
                <tr
                  key={e.matchId}
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                >
                  <td className="py-2 px-3">
                    <Link
                      href={matchUrl}
                      className="uppercase font-semibold hover:underline"
                      style={{ color: "var(--text-main)" }}
                    >
                      {e.homeTeam} v {e.awayTeam}
                    </Link>
                  </td>
                  <td className="py-2 px-3 uppercase" style={{ color: "var(--text-sec)" }}>
                    <EdgeBadge edge={e.bestEdge} market={e.bestMarket} variant="badge" />
                  </td>
                  <td
                    className="py-2 px-3 text-right font-semibold"
                    style={{ color: tierColor(e.bestTier) }}
                  >
                    {edgePct}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: tierColor(e.bestTier) }}
                    >
                      {e.bestTier}
                    </span>
                  </td>
                  <td
                    className="py-2 px-3 text-right"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatTime(e.kickoffUtc)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p
          className="text-[12px] font-mono py-4 text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          No edges identified today.
        </p>
      )}
    </div>
  );
}
