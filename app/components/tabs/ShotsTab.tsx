import type { TrendsByStat } from "@/lib/insights/trend-chart-data";
import type { RollingStats } from "@/lib/insights/team-stats";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { TREND_STAT_TITLES, TREND_STAT_INTEGER } from "@/lib/insights/trend-chart-data";
import { StatTrendChart } from "@/app/components/StatTrendChart";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeStats: RollingStats | null;
  awayStats: RollingStats | null;
  homeTrends: TrendsByStat | null;
  awayTrends: TrendsByStat | null;
  feedProbs?: FeedModelProbs | null;
};

export function ShotsTab({
  homeTeamName,
  awayTeamName,
  homeStats,
  awayStats,
  homeTrends,
  awayTrends,
  feedProbs,
}: Props) {
  return (
    <div className="space-y-0">
      {/* Shot summary */}
      {(homeStats || awayStats) && (
        <section
          className="px-5 py-4 panel-card"
          style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Shot summary</h2>
          <div className="grid grid-cols-2 gap-4">
            {homeStats && (
              <div>
                <p className="text-mono text-[12px] uppercase text-tertiary mb-2">
                  {homeTeamName.slice(0, 3).toUpperCase()} (L10 avg)
                </p>
                <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
                  <div>
                    <span className="text-tertiary block">Shots</span>
                    <span className="text-[var(--text-main)] font-semibold">{homeStats.shotsFor.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">SOT</span>
                    <span className="text-[var(--text-main)] font-semibold">{homeStats.sotFor.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">Shots ag.</span>
                    <span className="text-[var(--text-main)]">{homeStats.shotsAgainst.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">SOT ag.</span>
                    <span className="text-[var(--text-main)]">{homeStats.sotAgainst.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
            {awayStats && (
              <div>
                <p className="text-mono text-[12px] uppercase text-tertiary mb-2">
                  {awayTeamName.slice(0, 3).toUpperCase()} (L10 avg)
                </p>
                <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
                  <div>
                    <span className="text-tertiary block">Shots</span>
                    <span className="text-[var(--text-main)] font-semibold">{awayStats.shotsFor.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">SOT</span>
                    <span className="text-[var(--text-main)] font-semibold">{awayStats.sotFor.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">Shots ag.</span>
                    <span className="text-[var(--text-main)]">{awayStats.shotsAgainst.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block">SOT ag.</span>
                    <span className="text-[var(--text-main)]">{awayStats.sotAgainst.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="detail-grid">
        {/* Left: Home team shots charts */}
        <div className="space-y-0">
          {homeTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">{homeTeamName}</h3>
              </div>
              <StatTrendChart
                title={TREND_STAT_TITLES.shotsFor}
                data={homeTrends.shotsFor.data}
                average={homeTrends.shotsFor.average}
                integerValues={TREND_STAT_INTEGER.shotsFor}
                teamColor="home"
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.sotFor}
                data={homeTrends.sotFor.data}
                average={homeTrends.sotFor.average}
                teamColor="home"
              />
            </div>
          )}
        </div>

        {/* Right: Away team shots charts */}
        <div className="space-y-0">
          {awayTrends && (
            <div>
              <div className="px-5 pt-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">{awayTeamName}</h3>
              </div>
              <StatTrendChart
                title={TREND_STAT_TITLES.shotsFor}
                data={awayTrends.shotsFor.data}
                average={awayTrends.shotsFor.average}
                integerValues={TREND_STAT_INTEGER.shotsFor}
                teamColor="away"
              />
              <StatTrendChart
                title={TREND_STAT_TITLES.sotFor}
                data={awayTrends.sotFor.data}
                average={awayTrends.sotFor.average}
                teamColor="away"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
