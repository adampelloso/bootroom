import type { FeedMarketRow } from "@/lib/feed";
import type { ScreenshotChartPoint } from "@/lib/insights/feed-market-stats";
import type { TeamMatchRow } from "@/lib/insights/team-stats";
import type { H2HSummary } from "@/lib/feed";
import { StatTrendChart } from "@/app/components/StatTrendChart";
import { FormTable } from "@/app/components/FormTable";
import { MatchPulse } from "@/app/components/MatchPulse";
import { EdgeBadge } from "@/app/components/EdgeBadge";
import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { ScorelineBarChart } from "@/app/components/ScorelineBarChart";
import { percentColor } from "@/lib/percent-color";

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
  type EdgeRow = { outcome: string; market: string; edge: number; bookProb?: number };
  const edgeRows: EdgeRow[] = [];
  if (feedProbs?.edges) {
    const e = feedProbs.edges;
    const mp = feedProbs.marketProbs;
    if (e.home > 0.03) edgeRows.push({ outcome: "HOME", market: "1X2", edge: e.home, bookProb: mp?.home });
    if (e.draw > 0.03) edgeRows.push({ outcome: "DRAW", market: "1X2", edge: e.draw, bookProb: mp?.draw });
    if (e.away > 0.03) edgeRows.push({ outcome: "AWAY", market: "1X2", edge: e.away, bookProb: mp?.away });
    if (e.over_2_5 != null && e.over_2_5 > 0.03) edgeRows.push({ outcome: "OVER", market: "o2.5", edge: e.over_2_5, bookProb: mp?.over_2_5 });
    if (e.btts != null && e.btts > 0.03) edgeRows.push({ outcome: "YES", market: "BTTS", edge: e.btts, bookProb: mp?.btts });
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
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em]">Form snapshot <span className="text-tertiary font-normal normal-case tracking-normal">(L10)</span></h2>
            {o25Row && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-mono text-[12px] uppercase text-tertiary"><span className="normal-case">o2.5</span></span>
                  <span className="font-semibold" style={{ color: percentColor(o25Row.combinedHits * 10) }}>{o25Row.combinedHits * 10}%</span>
                </div>
                <div className="pct-bar"><div className="pct-bar-fill" style={{ width: `${o25Row.combinedHits * 10}%`, background: percentColor(o25Row.combinedHits * 10) }} /></div>
              </div>
            )}
            {o25Row && (
              <div className="flex items-baseline justify-between">
                <span className="text-mono text-[12px] uppercase text-tertiary">Avg goals</span>
                <span className="text-primary-data font-semibold">{o25Row.avgGoals.toFixed(1)}</span>
              </div>
            )}
            {bttsRow && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-mono text-[12px] uppercase text-tertiary">BTTS</span>
                  <span className="font-semibold" style={{ color: percentColor(bttsRow.combinedHits * 10) }}>{bttsRow.combinedHits * 10}%</span>
                </div>
                <div className="pct-bar"><div className="pct-bar-fill" style={{ width: `${bttsRow.combinedHits * 10}%`, background: percentColor(bttsRow.combinedHits * 10) }} /></div>
              </div>
            )}
          </section>

          {/* xG diverging bar */}
          {sim && (
            <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Expected goals</h2>
              <div className="flex items-center gap-2">
                <span className="text-mono text-[12px] text-tertiary w-10 text-right shrink-0">{sim.expectedHomeGoals.toFixed(2)}</span>
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
                <span className="text-mono text-[12px] text-tertiary w-10 shrink-0">{sim.expectedAwayGoals.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-mono text-[12px] uppercase text-tertiary mt-1">
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
                    <p className="text-mono text-[12px] uppercase text-tertiary mb-2">{homeTeamName.slice(0, 3).toUpperCase()}</p>
                    <FormTable rows={homeLast10} limit={5} />
                  </div>
                )}
                {awayLast10 && awayLast10.length > 0 && (
                  <div>
                    <p className="text-mono text-[12px] uppercase text-tertiary mb-2">{awayTeamName.slice(0, 3).toUpperCase()}</p>
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

        {/* Right column: edge summary + narrative + scorelines + H2H */}
        <div className="space-y-4">
          {/* Edge Summary Cards */}
          {edgeRows.length > 0 && (
            <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top projections</h2>
              <div className="space-y-2">
                {edgeRows.slice(0, 3).map((row) => (
                  <div key={`${row.market}-${row.outcome}`} className="flex items-center justify-between py-2 px-3" style={{ background: "var(--bg-surface)" }}>
                    <div>
                      <span className="text-[13px] font-bold uppercase" style={{ color: "var(--text-main)" }}>{row.outcome}</span>
                      <span className="text-[12px] text-tertiary uppercase ml-2">{row.market}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] font-mono">
                      <span className="text-tertiary">Book {row.bookProb != null ? `${Math.round(row.bookProb * 100)}%` : '\u2014'}</span>
                      <EdgeBadge edge={row.edge} market={row.market} variant="badge" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sim && feedProbs && sortedScorelines && sortedScorelines.length > 0 && (
            <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top scorelines</h2>
              <ScorelineBarChart scorelines={sortedScorelines} totalSimulations={sim.totalSimulations} />
            </section>
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
                    <p className="text-mono text-[12px] text-tertiary mt-2">
                      Last {h2hSummary.meetingsCount ?? total} meetings
                    </p>
                    {/* H2H mini-tiles */}
                    {(h2hSummary.avgGoals != null || h2hSummary.bttsRate != null) && (
                      <div className="flex gap-3 mt-3">
                        {h2hSummary.avgGoals != null && (
                          <div className="flex-1 py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
                            <p className="text-[11px] uppercase text-tertiary font-mono mb-1">Avg Goals</p>
                            <p className="text-[14px] font-semibold font-mono" style={{ color: "var(--text-main)" }}>
                              {h2hSummary.avgGoals.toFixed(1)}
                            </p>
                          </div>
                        )}
                        {h2hSummary.bttsRate != null && (
                          <div className="flex-1 py-2 px-3 text-center" style={{ background: "var(--bg-surface)" }}>
                            <p className="text-[11px] uppercase text-tertiary font-mono mb-1">BTTS Rate</p>
                            <p className="text-[14px] font-semibold font-mono" style={{ color: percentColor(Math.round(h2hSummary.bttsRate * 100)) }}>
                              {Math.round(h2hSummary.bttsRate * 100)}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
