"use client";

import type { FeedMarketRow } from "@/lib/feed";

type Props = {
  rows: FeedMarketRow[];
};

/**
 * Three stacked mini cards: BTTS, O2.5, Corners.
 * Format: Home (x/5) Away (x/5) Combined (x/10) [Avg: n.n]
 */
export function MarketSnapshot({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <section
      id="section-snapshot"
      className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)] space-y-3"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Market snapshot"
    >
      {rows.map((row, i) => {
        if (row.market === "BTTS") {
          return (
            <div
              key={`${row.market}-${i}`}
              className="rounded-xl border border-[var(--border-light)] p-3 bg-[var(--bg-body)]"
            >
              <p className="text-mono text-[11px] uppercase text-tertiary mb-2">BTTS</p>
              <div className="grid grid-cols-3 gap-2 text-mono text-[12px] text-[var(--text-sec)]">
                <span>Home {row.homeHits}/5</span>
                <span>Away {row.awayHits}/5</span>
                <span>Combined {row.combinedHits}/10</span>
              </div>
              {row.avgGoals != null && (
                <p className="text-mono text-[11px] text-tertiary mt-1">Avg goals: {row.avgGoals.toFixed(1)}</p>
              )}
            </div>
          );
        }
        if (row.market === "O2.5") {
          return (
            <div
              key={`${row.market}-${i}`}
              className="rounded-xl border border-[var(--border-light)] p-3 bg-[var(--bg-body)]"
            >
              <p className="text-mono text-[11px] uppercase text-tertiary mb-2">O2.5</p>
              <div className="grid grid-cols-3 gap-2 text-mono text-[12px] text-[var(--text-sec)]">
                <span>Home {row.homeHits}/5</span>
                <span>Away {row.awayHits}/5</span>
                <span>Combined {row.combinedHits}/10</span>
              </div>
              <p className="text-mono text-[11px] text-tertiary mt-1">Avg goals: {row.avgGoals.toFixed(1)}</p>
            </div>
          );
        }
        return (
          <div
            key={`${row.market}-${i}`}
            className="rounded-xl border border-[var(--border-light)] p-3 bg-[var(--bg-body)]"
          >
            <p className="text-mono text-[11px] uppercase text-tertiary mb-2">Corners</p>
            <div className="grid grid-cols-3 gap-2 text-mono text-[12px] text-[var(--text-sec)]">
              <span>Home avg {row.homeAvg.toFixed(1)}</span>
              <span>Away avg {row.awayAvg.toFixed(1)}</span>
              <span>Combined avg {row.combinedAvg.toFixed(1)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
