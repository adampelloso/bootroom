"use client";

import type { FeedMarketRow } from "@/lib/feed";
import { StatTrendChart } from "./StatTrendChart";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";

type Props = {
  rows: FeedMarketRow[];
  totalGoalsChart: { data: ScreenshotChartPoint[]; average: number };
};

/**
 * Total goals block: O2.5 hit rate + avg, BTTS as small line, total goals chart (last 10).
 */
export function TotalGoalsSection({ rows, totalGoalsChart }: Props) {
  const o25Row = rows.find((r) => r.market === "O2.5");
  const bttsRow = rows.find((r) => r.market === "BTTS");

  return (
    <section
      id="section-total-goals"
      className="px-5 py-4 border-t border-[var(--border-light)] space-y-4"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Total goals"
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Total goals</h2>

      {o25Row && o25Row.market === "O2.5" && (
        <div className="border-b border-[var(--border-light)] pb-3">
          <p className="text-mono text-[12px] uppercase text-tertiary mb-2">O2.5 (last 10)</p>
          <div className="flex items-baseline justify-between gap-4">
            <div className="grid grid-cols-2 gap-2 text-secondary-data text-tertiary">
              <span>Home {o25Row.homeHits * 20}%</span>
              <span>Away {o25Row.awayHits * 20}%</span>
            </div>
            <span
              className="text-mono stat-value font-bold shrink-0 text-right"
              style={{
                fontSize: "18px",
                color: "var(--text-main)",
              }}
            >
              {o25Row.combinedHits * 10}%
            </span>
          </div>
          <div className="pct-bar mt-2"><div className="pct-bar-fill" style={{ width: `${o25Row.combinedHits * 10}%` }} /></div>
          <p className="text-primary-data text-tertiary mt-2">Avg goals: {o25Row.avgGoals.toFixed(1)}</p>
        </div>
      )}

      {bttsRow && bttsRow.market === "BTTS" && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-mono text-[12px] text-tertiary">BTTS</span>
            <span className="text-mono text-[12px] text-[var(--text-main)]">{bttsRow.combinedHits * 10}%</span>
          </div>
          <div className="pct-bar mt-1"><div className="pct-bar-fill" style={{ width: `${bttsRow.combinedHits * 10}%` }} /></div>
        </div>
      )}

      <StatTrendChart
        title="Total Goals (Last 10 combined)"
        data={totalGoalsChart.data}
        average={totalGoalsChart.average}
        integerValues
      />
    </section>
  );
}
