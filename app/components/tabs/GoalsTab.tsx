"use client";

import { useState } from "react";
import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
import type { TeamMatchRow } from "@/lib/insights/team-stats";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { TREND_STAT_TITLES, TREND_STAT_INTEGER } from "@/lib/insights/trend-chart-data";
import { TotalGoalsSection } from "@/app/components/TotalGoalsSection";
import { TeamTotalsSection } from "@/app/components/TeamTotalsSection";
import { StatTrendChart } from "@/app/components/StatTrendChart";
import { EdgeBadge } from "@/app/components/EdgeBadge";

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
  feedProbs?: FeedModelProbs | null;
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
  feedProbs,
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
                  className="text-mono text-[12px] uppercase px-2 py-1 transition-colors"
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
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">Avg goals</span>
              <span className="text-hero-metric">{avgCombinedGoals.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">O2.5</span>
              <span className="text-hero-metric">{o25Pct}%</span>
              <div className="pct-bar mt-1"><div className="pct-bar-fill" style={{ width: `${o25Pct}%` }} /></div>
              {feedProbs?.edges?.over_2_5 != null && (
                <div className="mt-1.5">
                  <EdgeBadge edge={feedProbs.edges.over_2_5} market="O2.5" bookProb={feedProbs.marketProbs?.over_2_5} variant="inline" />
                </div>
              )}
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">BTTS</span>
              <span className="text-hero-metric">{bttsPct}%</span>
              <div className="pct-bar mt-1"><div className="pct-bar-fill" style={{ width: `${bttsPct}%` }} /></div>
              {feedProbs?.edges?.btts != null && (
                <div className="mt-1.5">
                  <EdgeBadge edge={feedProbs.edges.btts} market="BTTS" bookProb={feedProbs.marketProbs?.btts} variant="inline" />
                </div>
              )}
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">Clean sheets</span>
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
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">
                {homeTeamName.slice(0, 3).toUpperCase()} 1H avg
              </span>
              <span className="text-primary-data font-semibold">{homeHtAvgGF.toFixed(1)} GF / {homeHtAvgGA.toFixed(1)} GA</span>
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">
                {awayTeamName.slice(0, 3).toUpperCase()} 1H avg
              </span>
              <span className="text-primary-data font-semibold">{awayHtAvgGF.toFixed(1)} GF / {awayHtAvgGA.toFixed(1)} GA</span>
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">1H combined avg</span>
              <span className="text-primary-data font-semibold">
                {((homeHtAvgGF + homeHtAvgGA + awayHtAvgGF + awayHtAvgGA) / 2).toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">1H O0.5 rate</span>
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
          {/* Attacking Matchup: Home GF vs Away GA */}
          {homeTrends && awayTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">
                  Attacking matchup
                </h3>
                <p className="text-[12px] text-tertiary font-mono mt-0.5">
                  {homeTeamName.slice(0, 3).toUpperCase()} scoring vs {awayTeamName.slice(0, 3).toUpperCase()} conceding
                </p>
              </div>
              <GroupedTrendChart
                homeData={homeTrends.goalsFor.data}
                homeAvg={homeTrends.goalsFor.average}
                awayData={awayTrends.goalsAgainst.data}
                awayAvg={awayTrends.goalsAgainst.average}
                homeLabel={`${homeTeamName.slice(0, 3).toUpperCase()} GF`}
                awayLabel={`${awayTeamName.slice(0, 3).toUpperCase()} GA`}
              />
            </div>
          )}
          {/* Defensive Matchup: Away GF vs Home GA */}
          {homeTrends && awayTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">
                  Defensive matchup
                </h3>
                <p className="text-[12px] text-tertiary font-mono mt-0.5">
                  {awayTeamName.slice(0, 3).toUpperCase()} scoring vs {homeTeamName.slice(0, 3).toUpperCase()} conceding
                </p>
              </div>
              <GroupedTrendChart
                homeData={awayTrends.goalsFor.data}
                homeAvg={awayTrends.goalsFor.average}
                awayData={homeTrends.goalsAgainst.data}
                awayAvg={homeTrends.goalsAgainst.average}
                homeLabel={`${awayTeamName.slice(0, 3).toUpperCase()} GF`}
                awayLabel={`${homeTeamName.slice(0, 3).toUpperCase()} GA`}
              />
            </div>
          )}
          {/* Fallback: show individual charts if only one team has trend data */}
          {homeTrends && !awayTrends && (
            <div>
              <StatTrendChart
                title={`${homeTeamName} - ${TREND_STAT_TITLES.goalsFor}`}
                data={homeTrends.goalsFor.data}
                average={homeTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
                teamColor="home"
              />
              <StatTrendChart
                title={`${homeTeamName} - ${TREND_STAT_TITLES.goalsAgainst}`}
                data={homeTrends.goalsAgainst.data}
                average={homeTrends.goalsAgainst.average}
                integerValues={TREND_STAT_INTEGER.goalsAgainst}
                teamColor="home"
              />
            </div>
          )}
          {!homeTrends && awayTrends && (
            <div>
              <StatTrendChart
                title={`${awayTeamName} - ${TREND_STAT_TITLES.goalsFor}`}
                data={awayTrends.goalsFor.data}
                average={awayTrends.goalsFor.average}
                integerValues={TREND_STAT_INTEGER.goalsFor}
                teamColor="away"
              />
              <StatTrendChart
                title={`${awayTeamName} - ${TREND_STAT_TITLES.goalsAgainst}`}
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

/** Grouped bar chart showing two stats side-by-side (e.g. attack vs defence) */
function GroupedTrendChart({
  homeData,
  homeAvg,
  awayData,
  awayAvg,
  homeLabel,
  awayLabel,
}: {
  homeData: { value: number; opponentName: string }[];
  homeAvg: number;
  awayData: { value: number; opponentName: string }[];
  awayAvg: number;
  homeLabel: string;
  awayLabel: string;
}) {
  const maxLen = Math.max(homeData.length, awayData.length);
  const pairs = Array.from({ length: maxLen }, (_, i) => ({
    home: homeData[i] ?? null,
    away: awayData[i] ?? null,
  }));

  const allVals = [...homeData.map((d) => d.value), ...awayData.map((d) => d.value), homeAvg, awayAvg];
  const maxVal = Math.max(...allVals, 0.5);

  return (
    <div
      className="overflow-hidden"
      style={{
        borderBottom: "1px solid var(--border-light)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 text-[12px] font-mono text-tertiary">
        <span className="flex items-center gap-1">
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--color-bar-primary)" }} />
          {homeLabel}
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--color-bar-secondary)" }} />
          {awayLabel}
        </span>
        <span className="ml-auto">
          avg {homeAvg.toFixed(1)} / {awayAvg.toFixed(1)}
        </span>
      </div>
      {/* Bars */}
      <div className="flex items-end" style={{ height: "96px", gap: "6px" }}>
        {pairs.map((pair, i) => {
          const hv = pair.home?.value ?? 0;
          const av = pair.away?.value ?? 0;
          const hPct = maxVal > 0 ? Math.max((hv / maxVal) * 96, hv > 0 ? 4 : 2) : 2;
          const aPct = maxVal > 0 ? Math.max((av / maxVal) * 96, av > 0 ? 4 : 2) : 2;
          return (
            <div key={i} className="flex-1 flex items-end gap-[1px] min-w-0" style={{ height: "96px" }}>
              <div
                className="flex-1"
                style={{
                  height: `${hPct}px`,
                  background: "var(--color-bar-primary)",
                  opacity: 0.85,
                }}
                title={pair.home ? `${homeLabel}: ${Math.round(hv)} vs ${pair.home.opponentName}` : undefined}
              />
              <div
                className="flex-1"
                style={{
                  height: `${aPct}px`,
                  background: "var(--color-bar-secondary)",
                  opacity: 0.85,
                }}
                title={pair.away ? `${awayLabel}: ${Math.round(av)} vs ${pair.away.opponentName}` : undefined}
              />
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex mt-1" style={{ gap: "6px" }}>
        {pairs.map((pair, i) => (
          <div key={i} className="flex-1 min-w-0 text-center">
            <span className="text-[12px] font-mono text-tertiary truncate block w-full leading-tight">
              {pair.home ? pair.home.opponentName.slice(0, 3).toUpperCase() : pair.away ? pair.away.opponentName.slice(0, 3).toUpperCase() : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
