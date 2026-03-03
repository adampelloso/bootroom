import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TeamMatchRow } from "@/lib/insights/team-stats";
import type { H2HSummary } from "@/lib/feed";
import { StatTrendChart } from "@/app/components/StatTrendChart";
import { FormTable } from "@/app/components/FormTable";
import { MatchPulse } from "@/app/components/MatchPulse";
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
  homeLast10?: TeamMatchRow[];
  awayLast10?: TeamMatchRow[];
  h2hSummary?: H2HSummary | null;
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
  homeLast10,
  awayLast10,
  h2hSummary,
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
    <div className="space-y-0">
      {/* Match Pulse hero */}
      <MatchPulse sim={sim} feedProbs={feedProbs} />

      <div className="detail-grid">
        {/* Left column: market snapshot + chart + form */}
        <div className="space-y-4">
          <section className="px-5 py-4 space-y-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Market snapshot</h2>
            {o25Row && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-mono text-[11px] uppercase text-tertiary">O2.5</span>
                  <span className="text-primary-data font-semibold">{o25Row.combinedHits * 10}%</span>
                </div>
                <div className="pct-bar"><div className="pct-bar-fill" style={{ width: `${o25Row.combinedHits * 10}%` }} /></div>
              </div>
            )}
            {o25Row && (
              <div className="flex items-baseline justify-between">
                <span className="text-mono text-[11px] uppercase text-tertiary">Avg goals</span>
                <span className="text-primary-data font-semibold">{o25Row.avgGoals.toFixed(1)}</span>
              </div>
            )}
            {bttsRow && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-mono text-[11px] uppercase text-tertiary">BTTS</span>
                  <span className="text-primary-data font-semibold">{bttsRow.combinedHits * 10}%</span>
                </div>
                <div className="pct-bar"><div className="pct-bar-fill" style={{ width: `${bttsRow.combinedHits * 10}%` }} /></div>
              </div>
            )}
          </section>

          {/* xG diverging bar */}
          {sim && (
            <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Expected goals</h2>
              <div className="flex items-center gap-2">
                <span className="text-mono text-[11px] text-tertiary w-10 text-right shrink-0">{sim.expectedHomeGoals.toFixed(2)}</span>
                <div className="flex-1 flex h-6" style={{ gap: "2px" }}>
                  <div
                    className="h-full flex items-center justify-end pr-1"
                    style={{
                      width: `${(sim.expectedHomeGoals / (sim.expectedHomeGoals + sim.expectedAwayGoals)) * 100}%`,
                      backgroundColor: "var(--color-home)",
                      minWidth: "8px",
                    }}
                  />
                  <div
                    className="h-full flex items-center pl-1"
                    style={{
                      width: `${(sim.expectedAwayGoals / (sim.expectedHomeGoals + sim.expectedAwayGoals)) * 100}%`,
                      backgroundColor: "var(--color-away)",
                      minWidth: "8px",
                    }}
                  />
                </div>
                <span className="text-mono text-[11px] text-tertiary w-10 shrink-0">{sim.expectedAwayGoals.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-mono text-[9px] uppercase text-tertiary mt-1">
                <span>{homeTeamName.slice(0, 3).toUpperCase()}</span>
                <span>{awayTeamName.slice(0, 3).toUpperCase()}</span>
              </div>
            </section>
          )}

          <StatTrendChart
            title="Total Goals (Last 10 combined)"
            data={totalGoalsChart.data}
            average={totalGoalsChart.average}
            integerValues
          />

          {/* Form table (replaces dots) */}
          {(homeLast10 && homeLast10.length > 0 || awayLast10 && awayLast10.length > 0) ? (
            <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Form</h2>
              <div className="space-y-4">
                {homeLast10 && homeLast10.length > 0 && (
                  <div>
                    <p className="text-mono text-[10px] uppercase text-tertiary mb-2">{homeTeamName.slice(0, 3).toUpperCase()}</p>
                    <FormTable rows={homeLast10} limit={5} />
                  </div>
                )}
                {awayLast10 && awayLast10.length > 0 && (
                  <div>
                    <p className="text-mono text-[10px] uppercase text-tertiary mb-2">{awayTeamName.slice(0, 3).toUpperCase()}</p>
                    <FormTable rows={awayLast10} limit={5} />
                  </div>
                )}
              </div>
            </section>
          ) : (displayHomeForm.length > 0 || displayAwayForm.length > 0) ? (
            <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Form</h2>
              <div className="space-y-1 text-[12px] font-mono">
                {displayHomeForm.length > 0 && (
                  <p className="text-tertiary">{homeTeamName.slice(0, 3).toUpperCase()}: {displayHomeForm.join(" ")}</p>
                )}
                {displayAwayForm.length > 0 && (
                  <p className="text-tertiary">{awayTeamName.slice(0, 3).toUpperCase()}: {displayAwayForm.join(" ")}</p>
                )}
              </div>
            </section>
          ) : null}
        </div>

        {/* Right column: sim highlights + H2H */}
        <div className="space-y-4">
          {sim && feedProbs && (
            <>
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
            </>
          )}

          {/* H2H module */}
          {h2hSummary && (h2hSummary.homeWins + h2hSummary.draws + h2hSummary.awayWins > 0) && (
            <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Head to head</h2>
              {(() => {
                const total = h2hSummary.homeWins + h2hSummary.draws + h2hSummary.awayWins;
                const hPct = (h2hSummary.homeWins / total) * 100;
                const dPct = (h2hSummary.draws / total) * 100;
                const aPct = (h2hSummary.awayWins / total) * 100;
                return (
                  <div>
                    <div className="flex items-center justify-between text-[12px] font-mono mb-2">
                      <span>{homeTeamName.slice(0, 3).toUpperCase()} {h2hSummary.homeWins}W</span>
                      <span className="text-tertiary">{h2hSummary.draws}D</span>
                      <span>{h2hSummary.awayWins}W {awayTeamName.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div className="flex h-3" style={{ gap: "2px" }}>
                      <div style={{ width: `${hPct}%`, backgroundColor: "var(--color-home)", minWidth: hPct > 0 ? "4px" : "0" }} />
                      <div style={{ width: `${dPct}%`, backgroundColor: "var(--text-tertiary)", minWidth: dPct > 0 ? "4px" : "0" }} />
                      <div style={{ width: `${aPct}%`, backgroundColor: "var(--color-away)", minWidth: aPct > 0 ? "4px" : "0" }} />
                    </div>
                    <p className="text-mono text-[10px] text-tertiary mt-2">Last {total} meetings</p>
                  </div>
                );
              })()}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
