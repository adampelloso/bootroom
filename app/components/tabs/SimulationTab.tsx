"use client";

import { ScorelineBarChart } from "@/app/components/ScorelineBarChart";
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
};

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function SimulationTab({ sim, feedProbs, inputs }: Props) {
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
      const marketOver = feedProbs.over_2_5 - edges.over_2_5;
      const modelUnder = 1 - feedProbs.over_2_5;
      const marketUnder = 1 - marketOver;
      edgeRows.push({ outcome: "OVER", market: "O2.5", modelProb: feedProbs.over_2_5, marketProb: marketOver, edge: edges.over_2_5 });
      edgeRows.push({ outcome: "UNDER", market: "O2.5", modelProb: modelUnder, marketProb: marketUnder, edge: modelUnder - marketUnder });
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

  const { goalLambdas, cornerLambdas, components } = inputs ?? { goalLambdas: null, cornerLambdas: null, components: null };

  return (
    <div className="space-y-0">
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
            {edgeRows.map((row) => {
              const evLabel = row.edge > 0.10 ? "++EV" : row.edge > 0.05 ? "+EV" : "";
              return (
                <div key={`${row.market}-${row.outcome}`} className="flex items-center gap-3 text-[12px] font-mono">
                  <span className="w-10 text-[11px] font-semibold" style={{ color: evLabel ? "var(--text-main)" : "var(--text-tertiary)" }}>
                    {evLabel || "\u2014"}
                  </span>
                  <span className="w-14 uppercase text-[var(--text-main)]">{row.outcome}</span>
                  <span className="w-10 uppercase text-tertiary">{row.market}</span>
                  <span className="text-[var(--text-main)]">
                    {row.edge > 0 ? "+" : ""}{(row.edge * 100).toFixed(1)}% edge
                  </span>
                  <span className="text-tertiary ml-auto">
                    (model {formatPercent(row.modelProb)} vs market {formatPercent(row.marketProb)})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="detail-grid border-t border-[var(--border-light)]">
        {/* Left: Goals markets + expected */}
        <div className="space-y-0">
          <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">Goals markets</h2>
            <div className="text-primary-data space-y-1">
              <p>BTTS: {formatPercent(sim.pBTTS)}</p>
              <p>O2.5: {formatPercent(sim.pO25)}</p>
              <p>O3.5: {formatPercent(sim.pO35)}</p>
            </div>
          </section>

          <section className="px-5 py-3 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">Expected goals</h2>
            <div className="text-primary-data">
              <p>
                Home: <span className="font-bold">{sim.expectedHomeGoals.toFixed(2)}</span> vs Away: <span className="font-bold">{sim.expectedAwayGoals.toFixed(2)}</span>
                {" · "}
                <span className="font-bold" style={{ color: "var(--text-main)" }}>
                  {sim.expectedHomeGoals > sim.expectedAwayGoals ? "+" : ""}{(sim.expectedHomeGoals - sim.expectedAwayGoals).toFixed(2)} home edge
                </span>
              </p>
            </div>
            {sim.expectedHomeCorners != null && sim.expectedAwayCorners != null && (
              <div className="text-primary-data mt-2">
                <p>
                  Corners: Home <span className="font-bold">{sim.expectedHomeCorners.toFixed(1)}</span> vs Away <span className="font-bold">{sim.expectedAwayCorners.toFixed(1)}</span>
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: Scoreline bar chart */}
        <div>
          <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top scorelines</h2>
            <ScorelineBarChart scorelines={sortedScorelines} totalSimulations={sim.totalSimulations} />
          </section>
        </div>
      </div>

      {/* Collapsible: model inputs */}
      {inputs && goalLambdas && (
        <section className="px-5 py-3 border-t border-[var(--border-light)] text-secondary-data text-tertiary" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
          <button
            type="button"
            onClick={() => setShowInputs((o) => !o)}
            className="w-full flex items-center justify-between py-2 text-left text-mono text-[11px] uppercase text-tertiary hover:text-[var(--text-sec)]"
          >
            Model inputs
            <span aria-hidden>{showInputs ? "\u2212" : "+"}</span>
          </button>
          {showInputs && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-secondary-data uppercase mb-1">Goals {"\u03BB"}</p>
                <p>Home {"\u03BB"}: {goalLambdas.lambdaHomeGoals.toFixed(2)}</p>
                <p>Away {"\u03BB"}: {goalLambdas.lambdaAwayGoals.toFixed(2)}</p>
              </div>
              {components && (
                <div>
                  <p className="text-secondary-data uppercase mb-1">Components</p>
                  <p>League H/A: {components.leagueHomeGoals.toFixed(2)} / {components.leagueAwayGoals.toFixed(2)}</p>
                  <p>Home atk/def: {components.homeAttackMultiplier.toFixed(2)} / {components.homeDefenceMultiplier.toFixed(2)}</p>
                  <p>Away atk/def: {components.awayAttackMultiplier.toFixed(2)} / {components.awayDefenceMultiplier.toFixed(2)}</p>
                </div>
              )}
              {cornerLambdas && (
                <div>
                  <p className="text-secondary-data uppercase mb-1">Corners {"\u03BB"}</p>
                  <p>Home {"\u03BB"}: {cornerLambdas.lambdaHomeCorners.toFixed(2)}</p>
                  <p>Away {"\u03BB"}: {cornerLambdas.lambdaAwayCorners.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-secondary-data uppercase mb-1">Total goals distribution</p>
                {Object.entries(totalGoalBuckets).map(([bucket, weight]) => (
                  <p key={bucket}>
                    {bucket}: {formatPercent(weight / sim.totalSimulations)}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-secondary-data uppercase mb-1">Goal difference</p>
                {Object.entries(goalDiffBuckets).map(([bucket, weight]) => (
                  <p key={bucket}>
                    {bucket}: {formatPercent(weight / sim.totalSimulations)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
