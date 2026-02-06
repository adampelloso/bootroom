"use client";

import { useState } from "react";
import { StatTrendChart } from "./StatTrendChart";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
import type { MatchStatsResult } from "@/lib/insights/team-stats";
import { TREND_STAT_TITLES, TREND_STAT_INTEGER } from "@/lib/insights/trend-chart-data";

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
  homeTrends: TrendsByStat | null;
  awayTrends: TrendsByStat | null;
  rollingStats: MatchStatsResult | null;
};

/**
 * Collapsible "More stats": BTTS chart, Total Corners chart, Deep stats (Goals For/Against, Shots, SOT).
 * De-emphasized so the five trust markets stay primary.
 */
export function MoreStatsReveal({
  charts,
  homeTeamName,
  awayTeamName,
  homeTrends,
  awayTrends,
  rollingStats,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasCharts = charts.totalGoals.data.length > 0 || charts.btts.data.length > 0 || charts.totalCorners.data.length > 0;
  const hasDeep = (homeTrends?.goalsFor.data.length ?? 0) > 0 || (awayTrends?.goalsFor.data.length ?? 0) > 0;

  if (!hasCharts && !hasDeep) return null;

  return (
    <section
      className="px-5 py-3 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2 text-left text-mono text-[11px] uppercase text-tertiary hover:text-[var(--text-sec)]"
      >
        More stats (BTTS chart, corners chart, deep stats)
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pt-3 space-y-4 border-t border-[var(--border-light)]">
          {hasCharts && (
            <div className="space-y-4">
              <StatTrendChart
                title="BTTS (Last 10 combined)"
                data={charts.btts.data}
                average={charts.btts.average}
                integerValues
              />
              <StatTrendChart
                title="Total Corners (Last 10 combined)"
                data={charts.totalCorners.data}
                average={charts.totalCorners.average}
              />
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
            </div>
          )}
          {hasDeep && homeTrends && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2 text-tertiary">{homeTeamName} – Goals</h3>
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsFor}
                data={homeTrends.goalsFor.data}
                average={homeTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsAgainst}
                data={homeTrends.goalsAgainst.data}
                average={homeTrends.goalsAgainst.average}
                integerValues={TREND_STAT_INTEGER.goalsAgainst}
              />
            </div>
          )}
          {hasDeep && awayTrends && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2 text-tertiary">{awayTeamName} – Goals</h3>
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsFor}
                data={awayTrends.goalsFor.data}
                average={awayTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsAgainst}
                data={awayTrends.goalsAgainst.data}
                average={awayTrends.goalsAgainst.average}
                integerValues={TREND_STAT_INTEGER.goalsAgainst}
              />
            </div>
          )}
          {rollingStats && (homeTrends?.shotsFor?.data?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2 text-tertiary">Shots / SOT</h3>
              <p className="text-[12px] text-tertiary">
                Home L10: {rollingStats.home.l10.shotsFor.toFixed(1)} shots, {rollingStats.home.l10.sotFor.toFixed(1)} SOT · Away L10: {rollingStats.away.l10.shotsFor.toFixed(1)} shots, {rollingStats.away.l10.sotFor.toFixed(1)} SOT
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
