"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ConfidenceTier } from "@/lib/edge-engine";
import { formatOddsDisplay } from "@/lib/modeling/odds-display";
import { useOddsFormat } from "@/app/hooks/useOddsFormat";

export type ValueFinderRow = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;
  modelProb: number;
  bookProb: number;
  edge: number;
  tier: ConfidenceTier;
};

type SortKey = "edge" | "kickoff" | "league";

function tierColor(tier: string): string {
  if (tier === "HIGH") return "var(--color-edge-strong)";
  if (tier === "MEDIUM") return "var(--color-amber)";
  return "var(--color-edge-negative)";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function sortRows(rows: ValueFinderRow[], key: SortKey): ValueFinderRow[] {
  const sorted = [...rows];
  switch (key) {
    case "edge":
      return sorted.sort((a, b) => b.edge - a.edge);
    case "kickoff":
      return sorted.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    case "league":
      return sorted.sort((a, b) => a.league.localeCompare(b.league));
    default:
      return sorted;
  }
}

type Props = {
  rows: ValueFinderRow[];
};

export function ValueFinderTable({ rows }: Props) {
  const oddsFormat = useOddsFormat();
  const [tierFilter, setTierFilter] = useState<"ALL" | ConfidenceTier>("ALL");
  const [marketFilter, setMarketFilter] = useState<string>("ALL");
  const [leagueFilter, setLeagueFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("edge");

  const uniqueMarkets = useMemo(() => [...new Set(rows.map((r) => r.market))].sort(), [rows]);
  const uniqueLeagues = useMemo(() => [...new Set(rows.map((r) => r.league))].sort(), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (tierFilter !== "ALL") result = result.filter((r) => r.tier === tierFilter);
    if (marketFilter !== "ALL") result = result.filter((r) => r.market === marketFilter);
    if (leagueFilter !== "ALL") result = result.filter((r) => r.league === leagueFilter);
    return sortRows(result, sortBy);
  }, [rows, tierFilter, marketFilter, leagueFilter, sortBy]);

  const tierOptions: ("ALL" | ConfidenceTier)[] = ["ALL", "HIGH", "MEDIUM", "SPECULATIVE"];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "edge", label: "Edge" },
    { key: "kickoff", label: "Kickoff" },
    { key: "league", label: "League" },
  ];

  return (
    <div className="pb-20">
      {/* Tier pills */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {tierOptions.map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className="font-mono text-[11px] uppercase px-2 py-0.5 rounded cursor-pointer transition-colors"
            style={{
              background: tierFilter === t ? "var(--bg-surface)" : "transparent",
              color: tierFilter === t ? "var(--text-main)" : "var(--text-tertiary)",
              border: "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Dropdowns + sort */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="font-mono text-[11px] uppercase px-2 py-1 rounded cursor-pointer"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            border: "1px solid var(--border-light)",
          }}
        >
          <option value="ALL">All Markets</option>
          {uniqueMarkets.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={leagueFilter}
          onChange={(e) => setLeagueFilter(e.target.value)}
          className="font-mono text-[11px] uppercase px-2 py-1 rounded cursor-pointer"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            border: "1px solid var(--border-light)",
          }}
        >
          <option value="ALL">All Leagues</option>
          {uniqueLeagues.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
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
              <th className="text-left py-2 px-3 font-semibold">League</th>
              <th className="text-left py-2 px-3 font-semibold">Market</th>
              <th className="text-right py-2 px-3 font-semibold">Model</th>
              <th className="text-right py-2 px-3 font-semibold">Book</th>
              <th className="text-right py-2 px-3 font-semibold">Edge</th>
              <th className="text-right py-2 px-3 font-semibold">Tier</th>
              <th className="text-right py-2 px-3 font-semibold">Kickoff</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const matchUrl = `/match/${r.matchId.replace("match-", "")}?tab=value`;
              return (
                <tr
                  key={`${r.matchId}-${r.market}-${i}`}
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                >
                  <td className="py-2 px-3">
                    <Link
                      href={matchUrl}
                      className="uppercase font-semibold hover:underline"
                      style={{ color: "var(--text-main)" }}
                    >
                      {r.homeTeam} v {r.awayTeam}
                    </Link>
                  </td>
                  <td className="py-2 px-3 uppercase" style={{ color: "var(--text-sec)" }}>
                    {r.league}
                  </td>
                  <td className="py-2 px-3 uppercase" style={{ color: "var(--text-sec)" }}>
                    {r.market}
                  </td>
                  <td className="py-2 px-3 text-right" style={{ color: "var(--text-main)" }}>
                    {formatOddsDisplay(r.modelProb, oddsFormat)}
                  </td>
                  <td className="py-2 px-3 text-right" style={{ color: "var(--text-sec)" }}>
                    {formatOddsDisplay(r.bookProb, oddsFormat)}
                  </td>
                  <td
                    className="py-2 px-3 text-right font-semibold"
                    style={{ color: tierColor(r.tier) }}
                  >
                    +{(r.edge * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: tierColor(r.tier) }}
                    >
                      {r.tier}
                    </span>
                  </td>
                  <td
                    className="py-2 px-3 text-right"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatTime(r.kickoff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
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
