import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
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
}: Props) {
  return (
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
            <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">{awayTeamName} - Goals</h3>
            </div>
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
      </div>
    </div>
  );
}
