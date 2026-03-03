"use client";

import { useState } from "react";
import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
import type { TeamMatchRow } from "@/lib/insights/team-stats";
import { TREND_STAT_TITLES, TREND_STAT_INTEGER } from "@/lib/insights/trend-chart-data";
import { TotalGoalsSection } from "@/app/components/TotalGoalsSection";
import { TeamTotalsSection } from "@/app/components/TeamTotalsSection";
import { StatTrendChart } from "@/app/components/StatTrendChart";

type ChartSet = {
  totalGoals: { data: ScreenshotChartPoint[]; average: number };
  btts: { data: ScreenshotChartPoint[]; average: number };
  totalCorners: { data: ScreenshotChartPoint[]; average: number };
  homeCornersFor: { data: ScreenshotChartPoint[]; average: number };
  awayCornersFor: { data: ScreenshotChartPoint[]; average: number };
};

type Props = {
  rows: FeedMarketRow[];
  charts: ChartSet;
  homeTeamName: string;
  awayTeamName: string;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  homeMatchCount: number;
  awayMatchCount: number;
  homeTrends: TrendsByStat | null;
  awayTrends: TrendsByStat | null;
  homeLast10?: TeamMatchRow[];
  awayLast10?: TeamMatchRow[];
};

export function GoalsTab({
  rows,
  charts,
  homeTeamName,
  awayTeamName,
  homeGoalsFor,
  homeGoalsAgainst,
  awayGoalsFor,
  awayGoalsAgainst,
  homeMatchCount,
  awayMatchCount,
  homeTrends,
  awayTrends,
  homeLast10,
  awayLast10,
}: Props) {
  const [period, setPeriod] = useState<"ft" | "1h">("ft");

  const o25Row = rows.find((r) => r.market === "O2.5");
  const bttsRow = rows.find((r) => r.market === "BTTS");

  // Compute HT stats from last10 data
  const homeHtRows = (homeLast10 ?? []).filter((r) => r.htGoalsFor != null);
  const awayHtRows = (awayLast10 ?? []).filter((r) => r.htGoalsFor != null);
  const hasHtData = homeHtRows.length > 0 || awayHtRows.length > 0;

  // FT summary stats
  const avgCombinedGoals = o25Row && o25Row.market === "O2.5" ? o25Row.avgGoals : 0;
  const o25Pct = o25Row ? o25Row.combinedHits * 10 : 0;
  const bttsPct = bttsRow ? bttsRow.combinedHits * 10 : 0;
  const homeCleanSheetPct = homeLast10 && homeLast10.length > 0
    ? Math.round((homeLast10.filter((r) => r.cleanSheet).length / homeLast10.length) * 100)
    : 0;
  const awayCleanSheetPct = awayLast10 && awayLast10.length > 0
    ? Math.round((awayLast10.filter((r) => r.cleanSheet).length / awayLast10.length) * 100)
    : 0;

  // HT summary stats
  const homeHtAvgGF = homeHtRows.length > 0
    ? homeHtRows.reduce((a, r) => a + r.htGoalsFor!, 0) / homeHtRows.length
    : 0;
  const homeHtAvgGA = homeHtRows.length > 0
    ? homeHtRows.reduce((a, r) => a + r.htGoalsAgainst!, 0) / homeHtRows.length
    : 0;
  const awayHtAvgGF = awayHtRows.length > 0
    ? awayHtRows.reduce((a, r) => a + r.htGoalsFor!, 0) / awayHtRows.length
    : 0;
  const awayHtAvgGA = awayHtRows.length > 0
    ? awayHtRows.reduce((a, r) => a + r.htGoalsAgainst!, 0) / awayHtRows.length
    : 0;

  const showHt = period === "1h" && hasHtData;

  return (
    <div className="space-y-0">
      {/* Goals summary panel */}
      <section
        className="px-5 py-4 panel-card"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Goals summary</h2>
          {hasHtData && (
            <div className="flex gap-1">
              {(["ft", "1h"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className="text-mono text-[10px] uppercase px-2 py-1 transition-colors"
                  style={{
                    background: period === p ? "var(--bg-accent)" : "transparent",
                    color: period === p ? "var(--text-on-accent)" : "var(--text-tertiary)",
                    border: period === p ? "none" : "1px solid var(--border-light)",
                  }}
                >
                  {p === "ft" ? "Full time" : "1st half"}
                </button>
              ))}
            </div>
          )}
        </div>

        {!showHt ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Avg goals</span>
              <span className="text-hero-metric">{avgCombinedGoals.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">O2.5</span>
              <span className="text-hero-metric">{o25Pct}%</span>
              <div className="pct-bar mt-1"><div className="pct-bar-fill" style={{ width: `${o25Pct}%` }} /></div>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">BTTS</span>
              <span className="text-hero-metric">{bttsPct}%</span>
              <div className="pct-bar mt-1"><div className="pct-bar-fill" style={{ width: `${bttsPct}%` }} /></div>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Clean sheets</span>
              <div className="flex gap-3 items-baseline">
                <span className="text-sans text-[14px] font-semibold" style={{ color: "var(--color-home)" }}>
                  {homeTeamName.slice(0, 3).toUpperCase()} {homeCleanSheetPct}%
                </span>
                <span className="text-sans text-[14px] font-semibold" style={{ color: "var(--color-away)" }}>
                  {awayTeamName.slice(0, 3).toUpperCase()} {awayCleanSheetPct}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">
                {homeTeamName.slice(0, 3).toUpperCase()} 1H avg
              </span>
              <span className="text-primary-data font-semibold">{homeHtAvgGF.toFixed(1)} GF / {homeHtAvgGA.toFixed(1)} GA</span>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">
                {awayTeamName.slice(0, 3).toUpperCase()} 1H avg
              </span>
              <span className="text-primary-data font-semibold">{awayHtAvgGF.toFixed(1)} GF / {awayHtAvgGA.toFixed(1)} GA</span>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">1H combined avg</span>
              <span className="text-primary-data font-semibold">
                {((homeHtAvgGF + homeHtAvgGA + awayHtAvgGF + awayHtAvgGA) / 2).toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">1H O0.5 rate</span>
              <span className="text-primary-data font-semibold">
                {homeHtRows.length + awayHtRows.length > 0
                  ? Math.round(
                      ([...homeHtRows, ...awayHtRows].filter(
                        (r) => r.htGoalsFor! + r.htGoalsAgainst! >= 1
                      ).length /
                        (homeHtRows.length + awayHtRows.length)) *
                        100
                    )
                  : 0}%
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="detail-grid">
        {/* Left: Total goals + BTTS */}
        <div className="space-y-0">
          <TotalGoalsSection
            rows={rows.filter((r) => r.market !== "Corners")}
            totalGoalsChart={charts.totalGoals}
          />
          {charts.btts.data.length > 0 && (
            <StatTrendChart
              title="BTTS (Last 10 combined)"
              data={charts.btts.data}
              average={charts.btts.average}
              integerValues
            />
          )}
        </div>

        {/* Right: Team totals + GF/GA trend charts */}
        <div className="space-y-0">
          {(homeMatchCount > 0 || awayMatchCount > 0) && (
            <TeamTotalsSection
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeGoalsFor={homeGoalsFor}
              homeGoalsAgainst={homeGoalsAgainst}
              awayGoalsFor={awayGoalsFor}
              awayGoalsAgainst={awayGoalsAgainst}
              homeMatchCount={homeMatchCount}
              awayMatchCount={awayMatchCount}
            />
          )}
          {homeTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">{homeTeamName} - Goals</h3>
              </div>
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsFor}
                data={homeTrends.goalsFor.data}
                average={homeTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
                teamColor="home"
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsAgainst}
                data={homeTrends.goalsAgainst.data}
                average={homeTrends.goalsAgainst.average}
                integerValues={TREND_STAT_INTEGER.goalsAgainst}
                teamColor="home"
              />
            </div>
          )}
          {awayTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">{awayTeamName} - Goals</h3>
              </div>
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsFor}
                data={awayTrends.goalsFor.data}
                average={awayTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
                teamColor="away"
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.goalsAgainst}
                data={awayTrends.goalsAgainst.data}
                average={awayTrends.goalsAgainst.average}
                integerValues={TREND_STAT_INTEGER.goalsAgainst}
                teamColor="away"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
