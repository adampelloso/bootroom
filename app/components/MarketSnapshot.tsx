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
      className="px-5 py-3 border-t border-[var(--border-light)] space-y-3"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Market snapshot"
    >
      {rows.map((row, i) => {
        if (row.market === "BTTS") {
          return (
            <div
              key={`${row.market}-${i}`}
              className="border-b border-[var(--border-light)] pb-3"
            >
              <p className="text-mono text-[12px] uppercase text-tertiary mb-2">BTTS</p>
              <div className="flex items-baseline justify-between gap-4">
                <div className="grid grid-cols-2 gap-2 text-secondary-data text-tertiary">
                  <span>Home {row.homeHits}/5</span>
                  <span>Away {row.awayHits}/5</span>
                </div>
                <span
                  className="text-mono stat-value font-bold shrink-0 text-right"
                  style={{ fontSize: "18px", color: "var(--text-main)" }}
                >
                  {row.combinedHits}/10
                </span>
              </div>
              {row.avgGoals != null && (
                <p className="text-primary-data text-tertiary mt-2">Avg goals: {row.avgGoals.toFixed(1)}</p>
              )}
            </div>
          );
        }
        if (row.market === "O2.5") {
          return (
            <div
              key={`${row.market}-${i}`}
              className="border-b border-[var(--border-light)] pb-3"
            >
              <p className="text-mono text-[12px] uppercase text-tertiary mb-2"><span className="normal-case">o2.5</span></p>
              <div className="flex items-baseline justify-between gap-4">
                <div className="grid grid-cols-2 gap-2 text-secondary-data text-tertiary">
                  <span>Home {row.homeHits}/5</span>
                  <span>Away {row.awayHits}/5</span>
                </div>
                <span
                  className="text-mono stat-value font-bold shrink-0 text-right"
                  style={{ fontSize: "18px", color: "var(--text-main)" }}
                >
                  {row.combinedHits}/10
                </span>
              </div>
              <p className="text-primary-data text-tertiary mt-2">Avg goals: {row.avgGoals.toFixed(1)}</p>
            </div>
          );
        }
        // Skip corners - now handled by dedicated CornersCard component
        return null;
      })}
    </section>
  );
}
