import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import { StatTrendChart } from "@/app/components/StatTrendChart";
import { FormDisplay } from "@/app/components/FormDisplay";
import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { ScorelineBarChart } from "@/app/components/ScorelineBarChart";

type Props = {
  rows: FeedMarketRow[];
  totalGoalsChart: { data: ScreenshotChartPoint[]; average: number };
  displayHomeForm: Array<"W" | "D" | "L">;
  displayAwayForm: Array<"W" | "D" | "L">;
  homeTeamName: string;
  awayTeamName: string;
  sim: MatchSimulationResult | null;
  feedProbs: FeedModelProbs | null;
};

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function OverviewTab({
  rows,
  totalGoalsChart,
  displayHomeForm,
  displayAwayForm,
  homeTeamName,
  awayTeamName,
  sim,
  feedProbs,
}: Props) {
  const o25Row = rows.find((r) => r.market === "O2.5");
  const bttsRow = rows.find((r) => r.market === "BTTS");

  const sortedScorelines = sim
    ? Object.entries(sim.scorelines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : null;

  // Edge rows for quick overview
  type EdgeRow = { outcome: string; market: string; edge: number };
  const edgeRows: EdgeRow[] = [];
  if (feedProbs?.edges) {
    const e = feedProbs.edges;
    if (e.home > 0.03) edgeRows.push({ outcome: "HOME", market: "1X2", edge: e.home });
    if (e.draw > 0.03) edgeRows.push({ outcome: "DRAW", market: "1X2", edge: e.draw });
    if (e.away > 0.03) edgeRows.push({ outcome: "AWAY", market: "1X2", edge: e.away });
    if (e.over_2_5 != null && e.over_2_5 > 0.03) edgeRows.push({ outcome: "OVER", market: "O2.5", edge: e.over_2_5 });
    edgeRows.sort((a, b) => b.edge - a.edge);
  }

  return (
    <div className="detail-grid">
      {/* Left column: market snapshot + chart + form */}
      <div className="space-y-4">
        <section className="px-5 py-4 space-y-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Market snapshot</h2>
          {o25Row && (
            <div className="flex items-baseline justify-between">
              <span className="text-mono text-[11px] uppercase text-tertiary">O2.5</span>
              <span className="text-primary-data font-semibold">{o25Row.combinedHits}/10</span>
            </div>
          )}
          {o25Row && (
            <div className="flex items-baseline justify-between">
              <span className="text-mono text-[11px] uppercase text-tertiary">Avg goals</span>
              <span className="text-primary-data font-semibold">{o25Row.avgGoals.toFixed(1)}</span>
            </div>
          )}
          {bttsRow && (
            <div className="flex items-baseline justify-between">
              <span className="text-mono text-[11px] uppercase text-tertiary">BTTS</span>
              <span className="text-primary-data font-semibold">{bttsRow.combinedHits}/10</span>
            </div>
          )}
        </section>

        <StatTrendChart
          title="Total Goals (Last 10 combined)"
          data={totalGoalsChart.data}
          average={totalGoalsChart.average}
          integerValues
        />

        {(displayHomeForm.length > 0 || displayAwayForm.length > 0) && (
          <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Form</h2>
            <div className="space-y-2">
              {displayHomeForm.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-mono text-[11px] uppercase text-tertiary w-16 shrink-0">{homeTeamName.slice(0, 3).toUpperCase()}</span>
                  <FormDisplay form={displayHomeForm} label="Home form" />
                </div>
              )}
              {displayAwayForm.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-mono text-[11px] uppercase text-tertiary w-16 shrink-0">{awayTeamName.slice(0, 3).toUpperCase()}</span>
                  <FormDisplay form={displayAwayForm} label="Away form" />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Right column: sim highlights (only if sim data exists) */}
      {sim && feedProbs && (
        <div className="space-y-4">
          {edgeRows.length > 0 && (
            <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Model edges</h2>
              <div className="space-y-1.5">
                {edgeRows.map((row) => (
                  <div key={`${row.market}-${row.outcome}`} className="flex items-center gap-3 text-[12px] font-mono">
                    <span className="w-14 uppercase text-[var(--text-main)]">{row.outcome}</span>
                    <span className="w-10 uppercase text-tertiary">{row.market}</span>
                    <span className="text-[var(--text-main)]">
                      +{(row.edge * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sortedScorelines && sortedScorelines.length > 0 && (
            <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top scorelines</h2>
              <ScorelineBarChart scorelines={sortedScorelines} totalSimulations={sim.totalSimulations} />
            </section>
          )}

          <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">Expected goals</h2>
            <div className="text-primary-data">
              <p>
                Home: <span className="font-bold">{sim.expectedHomeGoals.toFixed(2)}</span>
                {" vs "}
                Away: <span className="font-bold">{sim.expectedAwayGoals.toFixed(2)}</span>
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
