"use client";

import { StatTrendChart } from "./StatTrendChart";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";

type ChartSet = {
  totalGoals: { data: ScreenshotChartPoint[]; average: number };
  btts: { data: ScreenshotChartPoint[]; average: number };
  totalCorners: { data: ScreenshotChartPoint[]; average: number };
  homeCornersFor: { data: ScreenshotChartPoint[]; average: number };
  awayCornersFor: { data: ScreenshotChartPoint[]; average: number };
};

type Props = {
  charts: ChartSet;
  homeTeamName: string;
  awayTeamName: string;
  /** If true, only render first 3 charts (Total Goals, BTTS, Total Corners). */
  threeOnly?: boolean;
};

/**
 * Screenshot Charts: Total Goals, BTTS, Total Corners (Last 10 combined), then Team Corners For home/away.
 */
export function ScreenshotCharts({ charts, homeTeamName, awayTeamName, threeOnly }: Props) {
  return (
    <section
      id="section-charts"
      className="px-5 py-4 space-y-4 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Screenshot charts"
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
        Last 10 (combined)
      </h2>
      <div id="chart-total-goals">
        <StatTrendChart
          title="Total Goals (Last 10 combined)"
          data={charts.totalGoals.data}
          average={charts.totalGoals.average}
          integerValues
        />
      </div>
      <div id="chart-btts">
        <StatTrendChart
          title="BTTS (Last 10 combined)"
          data={charts.btts.data}
          average={charts.btts.average}
          integerValues
        />
      </div>
      <div id="chart-total-corners">
        <StatTrendChart
          title="Total Corners (Last 10 combined)"
          data={charts.totalCorners.data}
          average={charts.totalCorners.average}
        />
      </div>
      {!threeOnly && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary mt-4">
            Team corners for
          </h2>
          <StatTrendChart
            title={`Team Corners For (${homeTeamName} last 10 home)`}
            data={charts.homeCornersFor.data}
            average={charts.homeCornersFor.average}
          />
          <StatTrendChart
            title={`Team Corners For (${awayTeamName} last 10 away)`}
            data={charts.awayCornersFor.data}
            average={charts.awayCornersFor.average}
          />
        </>
      )}
    </section>
  );
}
