"use client";

import { ScorelineBarChart } from "@/app/components/ScorelineBarChart";
import { ScorelineHeatmap } from "@/app/components/ScorelineHeatmap";
import { WinProbBar } from "@/app/components/WinProbBar";
import { EdgeBadge } from "@/app/components/EdgeBadge";
import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import type { MatchGoalLambdas, MatchCornerLambdas, GoalLambdaComponents } from "@/lib/modeling/baseline-params";
import { useState } from "react";

type SimInputs = {
  goalLambdas: MatchGoalLambdas;
  cornerLambdas: MatchCornerLambdas | null;
  components: GoalLambdaComponents | null;
  hasMarketProbs: boolean;
};

type EdgeRow = {
  outcome: string;
  market: string;
  modelProb: number;
  marketProb: number;
  edge: number;
};

type Props = {
  sim: MatchSimulationResult | null;
  feedProbs: FeedModelProbs | null;
  inputs: SimInputs | null;
  homeTeamName?: string;
  awayTeamName?: string;
};

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function SimulationTab({ sim, feedProbs, inputs, homeTeamName, awayTeamName }: Props) {
  const [showInputs, setShowInputs] = useState(false);

  if (!sim || !feedProbs) {
    return (
      <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <p className="text-secondary-data text-tertiary">
          No simulation data available for this fixture. Run the simulation pipeline to generate data.
        </p>
      </section>
    );
  }

  // Build edge rows
  const edgeRows: EdgeRow[] = [];
  if (feedProbs.edges) {
    const edges = feedProbs.edges;
    const marketHome = feedProbs.home - edges.home;
    const marketDraw = feedProbs.draw - edges.draw;
    const marketAway = feedProbs.away - edges.away;

    edgeRows.push({ outcome: "HOME", market: "1X2", modelProb: feedProbs.home, marketProb: marketHome, edge: edges.home });
    edgeRows.push({ outcome: "DRAW", market: "1X2", modelProb: feedProbs.draw, marketProb: marketDraw, edge: edges.draw });
    edgeRows.push({ outcome: "AWAY", market: "1X2", modelProb: feedProbs.away, marketProb: marketAway, edge: edges.away });
    if (edges.over_2_5 != null && feedProbs.over_2_5 != null) {
      const marketOver = feedProbs.marketProbs?.over_2_5 ?? (feedProbs.over_2_5 - edges.over_2_5);
      const modelUnder = 1 - feedProbs.over_2_5;
      const marketUnder = 1 - marketOver;
      edgeRows.push({ outcome: "OVER", market: "O2.5", modelProb: feedProbs.over_2_5, marketProb: marketOver, edge: edges.over_2_5 });
      edgeRows.push({ outcome: "UNDER", market: "O2.5", modelProb: modelUnder, marketProb: marketUnder, edge: modelUnder - marketUnder });
    }
    if (edges.btts != null && feedProbs.btts != null) {
      const marketBtts = feedProbs.marketProbs?.btts ?? (feedProbs.btts - edges.btts);
      const modelBttsNo = 1 - feedProbs.btts;
      const marketBttsNo = 1 - marketBtts;
      edgeRows.push({ outcome: "YES", market: "BTTS", modelProb: feedProbs.btts, marketProb: marketBtts, edge: edges.btts });
      edgeRows.push({ outcome: "NO", market: "BTTS", modelProb: modelBttsNo, marketProb: marketBttsNo, edge: modelBttsNo - marketBttsNo });
    }
  }
  edgeRows.sort((a, b) => b.edge - a.edge);

  const sortedScorelines = Object.entries(sim.scorelines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const totalGoalBuckets: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0 };
  const goalDiffBuckets: Record<string, number> = { "Home+2": 0, "Home+1": 0, Draw: 0, "Away+1": 0, "Away+2": 0 };

  for (const [score, count] of Object.entries(sim.scorelines)) {
    const [hs, as] = score.split("-").map((x) => parseInt(x, 10));
    if (Number.isNaN(hs) || Number.isNaN(as)) continue;
    const total = hs + as;
    const diff = hs - as;

    if (total === 0) totalGoalBuckets["0"] += count;
    else if (total === 1) totalGoalBuckets["1"] += count;
    else if (total === 2) totalGoalBuckets["2"] += count;
    else if (total === 3) totalGoalBuckets["3"] += count;
    else totalGoalBuckets["4+"] += count;

    if (diff >= 2) goalDiffBuckets["Home+2"] += count;
    else if (diff === 1) goalDiffBuckets["Home+1"] += count;
    else if (diff === 0) goalDiffBuckets["Draw"] += count;
    else if (diff === -1) goalDiffBuckets["Away+1"] += count;
    else goalDiffBuckets["Away+2"] += count;
  }

  // Derive expanded markets from scorelines
  type MarketRow = { label: string; prob: number };

  const deriveFromScorelines = () => {
    let pO05 = 0, pO15 = 0, pO45 = 0, pO55 = 0;
    let pHomeO05 = 0, pHomeO15 = 0, pHomeO25 = 0, pHomeO35 = 0;
    let pAwayO05 = 0, pAwayO15 = 0, pAwayO25 = 0, pAwayO35 = 0;

    for (const [score, count] of Object.entries(sim.scorelines)) {
      const [hs, as] = score.split("-").map((x) => parseInt(x, 10));
      if (Number.isNaN(hs) || Number.isNaN(as)) continue;
      const prob = count / sim.totalSimulations;
      const total = hs + as;

      if (total >= 1) pO05 += prob;
      if (total >= 2) pO15 += prob;
      if (total >= 5) pO45 += prob;
      if (total >= 6) pO55 += prob;

      if (hs >= 1) pHomeO05 += prob;
      if (hs >= 2) pHomeO15 += prob;
      if (hs >= 3) pHomeO25 += prob;
      if (hs >= 4) pHomeO35 += prob;

      if (as >= 1) pAwayO05 += prob;
      if (as >= 2) pAwayO15 += prob;
      if (as >= 3) pAwayO25 += prob;
      if (as >= 4) pAwayO35 += prob;
    }

    const totalGoals: MarketRow[] = [
      { label: "O0.5", prob: pO05 },
      { label: "O1.5", prob: pO15 },
      { label: "O2.5", prob: sim.pO25 },
      { label: "O3.5", prob: sim.pO35 },
      { label: "O4.5", prob: pO45 },
      { label: "O5.5", prob: pO55 },
    ];

    const homeGoals: MarketRow[] = [
      { label: "Home O0.5", prob: pHomeO05 },
      { label: "Home O1.5", prob: pHomeO15 },
      { label: "Home O2.5", prob: pHomeO25 },
      { label: "Home O3.5", prob: pHomeO35 },
    ];

    const awayGoals: MarketRow[] = [
      { label: "Away O0.5", prob: pAwayO05 },
      { label: "Away O1.5", prob: pAwayO15 },
      { label: "Away O2.5", prob: pAwayO25 },
      { label: "Away O3.5", prob: pAwayO35 },
    ];

    const doubleChance: MarketRow[] = [
      { label: "1X (Home or Draw)", prob: sim.pHomeWin + sim.pDraw },
      { label: "X2 (Draw or Away)", prob: sim.pDraw + sim.pAwayWin },
      { label: "12 (Home or Away)", prob: sim.pHomeWin + sim.pAwayWin },
    ];

    const drawNoBet: MarketRow[] = [
      { label: "DNB Home", prob: sim.pDraw > 0 ? sim.pHomeWin / (sim.pHomeWin + sim.pAwayWin) : sim.pHomeWin },
      { label: "DNB Away", prob: sim.pDraw > 0 ? sim.pAwayWin / (sim.pHomeWin + sim.pAwayWin) : sim.pAwayWin },
    ];

    return { totalGoals, homeGoals, awayGoals, doubleChance, drawNoBet };
  };

  const expandedMarkets = deriveFromScorelines();
  const { goalLambdas, cornerLambdas, components } = inputs ?? { goalLambdas: null, cornerLambdas: null, components: null };

  return (
    <div className="space-y-0">
      {/* W/D/L probability bar */}
      <WinProbBar
        homeWin={sim.pHomeWin}
        draw={sim.pDraw}
        awayWin={sim.pAwayWin}
        homeTeamName={homeTeamName ?? "Home"}
        awayTeamName={awayTeamName ?? "Away"}
        marketHomeWin={feedProbs.marketProbs?.home}
        marketDraw={feedProbs.marketProbs?.draw}
        marketAwayWin={feedProbs.marketProbs?.away}
      />

      <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <p className="text-secondary-data text-tertiary">
          Monte Carlo snapshot · {sim.totalSimulations.toLocaleString()} runs
        </p>
      </section>

      {/* Model vs Market - full width */}
      {edgeRows.length > 0 && (
        <section className="px-5 py-4 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Model vs market</h2>
          <div className="space-y-1.5">
            {edgeRows.map((row) => (
              <div key={`${row.market}-${row.outcome}`} className="flex items-center gap-3 text-[12px] font-mono">
                <span className="w-14 uppercase text-[var(--text-main)]">{row.outcome}</span>
                <span className="w-10 uppercase text-tertiary">{row.market}</span>
                <EdgeBadge edge={row.edge} market={row.market} bookProb={row.marketProb} variant="inline" />
                <span className="text-tertiary ml-auto text-[12px]">
                  model {formatPercent(row.modelProb)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market probability panels */}
      <section className="px-5 py-4 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Markets</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Goals Markets panel */}
          <MarketPanel
            title="Goals markets"
            rows={expandedMarkets.totalGoals}
            bookProbs={feedProbs?.marketProbs?.over_2_5 != null ? { "O2.5": feedProbs.marketProbs.over_2_5 } : {}}
            edges={feedProbs?.edges?.over_2_5 != null ? { "O2.5": feedProbs.edges.over_2_5 } : {}}
          />

          {/* Team Goals panel */}
          <MarketPanel
            title="Team goals"
            rows={[...expandedMarkets.homeGoals, ...expandedMarkets.awayGoals]}
          />

          {/* Result Markets panel */}
          <MarketPanel
            title="Result markets"
            rows={[
              { label: "Home", prob: sim.pHomeWin },
              { label: "Draw", prob: sim.pDraw },
              { label: "Away", prob: sim.pAwayWin },
              ...expandedMarkets.doubleChance,
              ...expandedMarkets.drawNoBet,
            ]}
            bookProbs={{
              ...(feedProbs?.marketProbs?.home != null ? { Home: feedProbs.marketProbs.home } : {}),
              ...(feedProbs?.marketProbs?.draw != null ? { Draw: feedProbs.marketProbs.draw } : {}),
              ...(feedProbs?.marketProbs?.away != null ? { Away: feedProbs.marketProbs.away } : {}),
            }}
            edges={{
              ...(feedProbs?.edges?.home != null ? { Home: feedProbs.edges.home } : {}),
              ...(feedProbs?.edges?.draw != null ? { Draw: feedProbs.edges.draw } : {}),
              ...(feedProbs?.edges?.away != null ? { Away: feedProbs.edges.away } : {}),
            }}
          />

          {/* BTTS panel */}
          <MarketPanel
            title="BTTS"
            rows={[
              { label: "BTTS Yes", prob: sim.pBTTS },
              { label: "BTTS No", prob: 1 - sim.pBTTS },
            ]}
            bookProbs={feedProbs?.marketProbs?.btts != null ? { "BTTS Yes": feedProbs.marketProbs.btts, "BTTS No": 1 - feedProbs.marketProbs.btts } : {}}
            edges={feedProbs?.edges?.btts != null ? { "BTTS Yes": feedProbs.edges.btts, "BTTS No": -(feedProbs.edges.btts) } : {}}
          />
        </div>
      </section>

      {/* Expected goals section */}
      <section className="px-5 py-3 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">Expected values</h2>
        <div className="grid grid-cols-2 gap-4 text-primary-data">
          <div>
            <span className="text-tertiary text-[12px] block mb-1">Home xG</span>
            <span className="font-bold">{sim.expectedHomeGoals.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-tertiary text-[12px] block mb-1">Away xG</span>
            <span className="font-bold">{sim.expectedAwayGoals.toFixed(2)}</span>
          </div>
          {sim.expectedHomeCorners != null && (
            <div>
              <span className="text-tertiary text-[12px] block mb-1">Home corners</span>
              <span className="font-bold">{sim.expectedHomeCorners.toFixed(1)}</span>
            </div>
          )}
          {sim.expectedAwayCorners != null && (
            <div>
              <span className="text-tertiary text-[12px] block mb-1">Away corners</span>
              <span className="font-bold">{sim.expectedAwayCorners.toFixed(1)}</span>
            </div>
          )}
        </div>
      </section>

      <div className="detail-grid border-t border-[var(--border-light)]">
        <div /> {/* empty left */}

        {/* Right: Scoreline heatmap + bar chart */}
        <div className="space-y-0">
          <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Scoreline heatmap</h2>
            <ScorelineHeatmap scorelines={sim.scorelines} totalSimulations={sim.totalSimulations} />
          </section>
          <section className="px-5 py-3 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top scorelines</h2>
            <ScorelineBarChart scorelines={sortedScorelines.slice(0, 5)} totalSimulations={sim.totalSimulations} />
          </section>
        </div>
      </div>

      {/* Collapsible: model transparency */}
      {inputs && goalLambdas && (
        <section className="px-5 py-3 border-t border-[var(--border-light)] text-secondary-data text-tertiary" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          <button
            type="button"
            onClick={() => setShowInputs((o) => !o)}
            className="w-full flex items-center justify-between py-2 text-left text-mono text-[12px] uppercase text-tertiary hover:text-[var(--text-sec)]"
          >
            Model transparency
            <span aria-hidden>{showInputs ? "\u2212" : "+"}</span>
          </button>
          {showInputs && (
            <div className="mt-3 space-y-4">
              {/* Model overview */}
              <div className="grid grid-cols-3 gap-3 text-[12px] font-mono p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <div>
                  <span className="text-tertiary block text-[12px] uppercase">Simulations</span>
                  <span className="text-[var(--text-main)]">{sim.totalSimulations.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-tertiary block text-[12px] uppercase">Market data</span>
                  <span className="text-[var(--text-main)]">{inputs.hasMarketProbs ? "Blended" : "Model only"}</span>
                </div>
                <div>
                  <span className="text-tertiary block text-[12px] uppercase">Method</span>
                  <span className="text-[var(--text-main)]">Poisson MC</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] uppercase font-semibold mb-1">Goal rate parameters (λ)</p>
                  <p>Home λ: {goalLambdas.lambdaHomeGoals.toFixed(3)}</p>
                  <p>Away λ: {goalLambdas.lambdaAwayGoals.toFixed(3)}</p>
                </div>
                {components && (
                  <div>
                    <p className="text-[12px] uppercase font-semibold mb-1">Lambda components</p>
                    <p>League baseline H/A: {components.leagueHomeGoals.toFixed(2)} / {components.leagueAwayGoals.toFixed(2)}</p>
                    <p>Home attack × {components.homeAttackMultiplier.toFixed(2)} · defence × {components.homeDefenceMultiplier.toFixed(2)}</p>
                    <p>Away attack × {components.awayAttackMultiplier.toFixed(2)} · defence × {components.awayDefenceMultiplier.toFixed(2)}</p>
                  </div>
                )}
                {cornerLambdas && (
                  <div>
                    <p className="text-[12px] uppercase font-semibold mb-1">Corner parameters (λ)</p>
                    <p>Home λ: {cornerLambdas.lambdaHomeCorners.toFixed(2)}</p>
                    <p>Away λ: {cornerLambdas.lambdaAwayCorners.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[12px] uppercase font-semibold mb-1">Total goals distribution</p>
                  {Object.entries(totalGoalBuckets).map(([bucket, weight]) => (
                    <p key={bucket}>
                      {bucket} goals: {formatPercent(weight / sim.totalSimulations)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[12px] uppercase font-semibold mb-1">Goal difference</p>
                  {Object.entries(goalDiffBuckets).map(([bucket, weight]) => (
                    <p key={bucket}>
                      {bucket}: {formatPercent(weight / sim.totalSimulations)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Focused market panel with horizontal probability bars + book marker ticks */
function MarketPanel({
  title,
  rows,
  bookProbs = {},
  edges = {},
}: {
  title: string;
  rows: { label: string; prob: number }[];
  bookProbs?: Record<string, number>;
  edges?: Record<string, number>;
}) {
  return (
    <div className="panel-card p-4" style={{ background: "var(--bg-panel)" }}>
      <p className="text-mono text-[12px] uppercase text-tertiary mb-3 font-semibold tracking-[0.1em]">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => {
          const bookProb = bookProbs[row.label];
          const edge = edges[row.label];
          const pct = Math.min(row.prob * 100, 100);
          const bookPct = bookProb != null ? Math.min(bookProb * 100, 100) : null;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[12px] font-mono mb-0.5">
                <span className="text-[var(--text-sec)]">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-main)] font-semibold">{formatPercent(row.prob)}</span>
                  {edge != null && Math.abs(edge) > 0.01 && (
                    <span
                      className="text-[12px] font-mono"
                      style={{
                        color: edge > 0.05 ? "var(--color-edge-strong)" : edge > 0 ? "var(--color-edge-mild)" : "var(--color-edge-negative)",
                      }}
                    >
                      {edge > 0 ? "+" : ""}{(edge * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              {/* Probability bar with book marker */}
              <div className="relative h-[6px] w-full" style={{ background: "var(--bg-elevated)", borderRadius: "3px" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "var(--color-bar-primary)",
                    borderRadius: "3px",
                    transition: "width 0.3s ease",
                  }}
                />
                {bookPct != null && (
                  <div
                    className="absolute top-[-2px]"
                    style={{
                      left: `${bookPct}%`,
                      width: "2px",
                      height: "10px",
                      background: "var(--color-amber)",
                      transform: "translateX(-1px)",
                    }}
                    title={`Book: ${bookPct.toFixed(1)}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {Object.keys(bookProbs).length > 0 && (
        <div className="flex items-center gap-3 mt-3 text-[12px] font-mono text-tertiary">
          <span className="flex items-center gap-1">
            <span style={{ display: "inline-block", width: "8px", height: "4px", background: "var(--color-bar-primary)", borderRadius: "2px" }} />
            Model
          </span>
          <span className="flex items-center gap-1">
            <span style={{ display: "inline-block", width: "2px", height: "8px", background: "var(--color-amber)" }} />
            Book
          </span>
        </div>
      )}
    </div>
  );
}
