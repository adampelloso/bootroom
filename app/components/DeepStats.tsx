"use client";

import { useState, useEffect } from "react";
import { StatTrendChart } from "./StatTrendChart";
import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
import type { MatchStatsResult } from "@/lib/insights/team-stats";
import { TREND_STAT_TITLES, TREND_STAT_INTEGER } from "@/lib/insights/trend-chart-data";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeTrends: TrendsByStat | null;
  awayTrends: TrendsByStat | null;
  rollingStats: MatchStatsResult | null;
};

function isDeepStatsHash(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash === "#section-deep-stats";
}

/**
 * Deep stats accordion (collapsed by default). Goals For/Against, Shots, SOT - all collapsed.
 * Opens when hash is #section-deep-stats (e.g. from SHOTS tab).
 */
export function DeepStats({ homeTeamName, awayTeamName, homeTrends, awayTrends, rollingStats }: Props) {
  const [open, setOpen] = useState(false);
  const hasData = (homeTrends && homeTrends.goalsFor.data.length > 0) || (awayTrends && awayTrends.goalsFor.data.length > 0);

  useEffect(() => {
    if (!hasData) return;
    const check = () => setOpen((o) => (isDeepStatsHash() ? true : o));
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [hasData]);

  if (!hasData) return null;

  return (
    <section
      id="section-deep-stats"
      className="px-5 py-3 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2 text-left text-mono text-[11px] uppercase text-tertiary"
      >
        Deep stats: xG, shot maps, possession +
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pt-2 space-y-4 text-[12px] text-tertiary">
          {homeTrends && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">{homeTeamName} – Goals</h3>
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
          {awayTrends && (
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">{awayTeamName} – Goals</h3>
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
          {homeTrends && (
            <>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] mt-4">Shots</h3>
              <StatTrendChart
                title={TREND_STAT_TITLES.shotsFor}
                data={homeTrends.shotsFor.data}
                average={homeTrends.shotsFor.average}
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.sotFor}
                data={homeTrends.sotFor.data}
                average={homeTrends.sotFor.average}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}
