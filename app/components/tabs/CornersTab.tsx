import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { CornersCard } from "@/app/components/CornersCard";
import { StatTrendChart } from "@/app/components/StatTrendChart";
import { ThresholdHitRates } from "@/app/components/ThresholdHitRates";
import type { ThresholdRow } from "@/app/components/ThresholdHitRates";

type CornersData = {
  homeCornersFor: number;
  homeCornersAgainst: number;
  homeTotalCorners: number;
  awayCornersFor: number;
  awayCornersAgainst: number;
  awayTotalCorners: number;
  combinedTotal: number;
  homeEdge: number;
  awayEdge: number;
};

type ChartSet = {
  totalCorners: { data: ScreenshotChartPoint[]; average: number };
  homeCornersFor: { data: ScreenshotChartPoint[]; average: number };
  awayCornersFor: { data: ScreenshotChartPoint[]; average: number };
};

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  cornersData: CornersData | null;
  charts: ChartSet;
  cornerThresholds?: ThresholdRow[];
  feedProbs?: FeedModelProbs | null;
};

export function CornersTab({ homeTeamName, awayTeamName, cornersData, charts, cornerThresholds, feedProbs }: Props) {
  if (!cornersData && charts.totalCorners.data.length === 0) {
    return (
      <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <p className="text-secondary-data text-tertiary">No corners data available.</p>
      </section>
    );
  }

  return (
    <div className="detail-grid">
      {/* Left: Corners card + thresholds */}
      <div className="space-y-0">
        {cornersData && (
          <CornersCard
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            data={cornersData}
          />
        )}
        {cornerThresholds && cornerThresholds.length > 0 && (
          <ThresholdHitRates title="Corner thresholds" thresholds={cornerThresholds} />
        )}
      </div>

      {/* Right: Corners trend charts */}
      <div className="space-y-0">
        {charts.totalCorners.data.length > 0 && (
          <StatTrendChart
            title="Total Corners (Last 10 combined)"
            data={charts.totalCorners.data}
            average={charts.totalCorners.average}
          />
        )}
        {charts.homeCornersFor.data.length > 0 && (
          <StatTrendChart
            title={`Team Corners For (${homeTeamName} last 10 home)`}
            data={charts.homeCornersFor.data}
            average={charts.homeCornersFor.average}
          />
        )}
        {charts.awayCornersFor.data.length > 0 && (
          <StatTrendChart
            title={`Team Corners For (${awayTeamName} last 10 away)`}
            data={charts.awayCornersFor.data}
            average={charts.awayCornersFor.average}
          />
        )}
      </div>
    </div>
  );
}
