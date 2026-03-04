"use client";

import { useState } from "react";

export type ParlayLeg = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;
  modelProb: number;
  bookProb: number;
  edge: number;
  tier: "HIGH" | "MEDIUM" | "SPECULATIVE";
};

export type ParlayProfile = {
  name: string;
  description: string;
  legIds: string[];
  combinedProb: number;
};

function tierColor(tier: string): string {
  if (tier === "HIGH") return "var(--color-edge-strong)";
  if (tier === "MEDIUM") return "var(--color-amber)";
  return "var(--color-edge-negative)";
}

export function ParlayBuilderClient({
  candidates,
  profiles,
}: {
  candidates: ParlayLeg[];
  profiles: ParlayProfile[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleLeg(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 12) {
        next.add(id);
      }
      return next;
    });
  }

  // Group candidates by match
  const grouped = new Map<string, ParlayLeg[]>();
  for (const leg of candidates) {
    const key = leg.matchId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(leg);
  }

  // Compute projection panel stats
  const selectedLegs = candidates.filter((l) => selectedIds.has(l.id));
  const combinedProb = selectedLegs.reduce((acc, l) => acc * l.modelProb, 1);
  const tierCounts = { HIGH: 0, MEDIUM: 0, SPECULATIVE: 0 };
  for (const l of selectedLegs) tierCounts[l.tier]++;
  const matchIds = selectedLegs.map((l) => l.matchId);
  const hasCorrelation = matchIds.length !== new Set(matchIds).size;

  if (candidates.length === 0) {
    return (
      <p
        className="font-mono text-[12px] text-center py-12"
        style={{ color: "var(--text-sec)" }}
      >
        No legs with published lines available.
      </p>
    );
  }

  return (
    <div style={{ paddingBottom: "120px" }}>
      {/* Profile strip */}
      <div className="flex gap-2 mb-4">
        {profiles.map((p) => (
          <button
            key={p.name}
            onClick={() => setSelectedIds(new Set(p.legIds))}
            className="font-mono text-[12px] uppercase px-3 py-1.5 rounded cursor-pointer transition-colors"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-main)",
              border: "none",
            }}
          >
            {p.name}
            <span className="ml-1" style={{ color: "var(--text-sec)" }}>
              ({p.legIds.length})
            </span>
          </button>
        ))}
      </div>

      {/* Leg browser */}
      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([matchId, legs]) => {
          const first = legs[0];
          return (
            <div key={matchId}>
              <p
                className="font-semibold text-[13px] mb-1.5"
                style={{ color: "var(--text-main)" }}
              >
                {first.homeTeam} v {first.awayTeam}
                <span
                  className="font-mono text-[11px] ml-2"
                  style={{ color: "var(--text-sec)" }}
                >
                  {first.league}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {legs.map((leg) => {
                  const isSelected = selectedIds.has(leg.id);
                  return (
                    <button
                      key={leg.id}
                      onClick={() => toggleLeg(leg.id)}
                      className="font-mono text-[12px] px-2 py-1 rounded transition-colors cursor-pointer"
                      style={{
                        background: isSelected
                          ? "var(--color-accent)"
                          : "var(--bg-surface)",
                        color: isSelected ? "#fff" : "var(--text-main)",
                        border: "none",
                        opacity:
                          !isSelected && selectedIds.size >= 12 ? 0.5 : 1,
                      }}
                      disabled={!isSelected && selectedIds.size >= 12}
                    >
                      {leg.market} {(leg.modelProb * 100).toFixed(0)}%
                      <span
                        style={{
                          color: isSelected
                            ? "rgba(255,255,255,0.7)"
                            : tierColor(leg.tier),
                          marginLeft: "4px",
                        }}
                      >
                        +{(leg.edge * 100).toFixed(0)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection panel — sticky bottom */}
      <div
        className="sticky bottom-0 bg-[var(--bg-panel)] border-t border-[var(--border-light)] px-5 py-3"
        style={{
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
          marginLeft: "calc(-1 * var(--space-md))",
          marginRight: "calc(-1 * var(--space-md))",
        }}
      >
        {selectedLegs.length === 0 ? (
          <p className="text-[12px] font-mono text-center" style={{ color: "var(--text-sec)" }}>
            Select legs to build a projection
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-main)" }}
              >
                {selectedLegs.length} leg
                {selectedLegs.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[11px] font-mono" style={{ color: "var(--text-sec)" }}>
                {tierCounts.HIGH > 0 ? `${tierCounts.HIGH} high ` : ""}
                {tierCounts.MEDIUM > 0 ? `${tierCounts.MEDIUM} med ` : ""}
                {tierCounts.SPECULATIVE > 0
                  ? `${tierCounts.SPECULATIVE} spec`
                  : ""}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[16px] font-bold font-mono"
                style={{ color: "var(--text-main)" }}
              >
                {(combinedProb * 100).toFixed(2)}%
              </p>
              <p className="text-[11px] font-mono" style={{ color: "var(--text-sec)" }}>
                Combined probability
              </p>
            </div>
          </div>
        )}
        {hasCorrelation && selectedLegs.length > 0 && (
          <p
            className="text-[11px] font-mono mt-1"
            style={{ color: "var(--color-amber)" }}
          >
            Legs from the same match may be correlated
          </p>
        )}
      </div>
    </div>
  );
}
