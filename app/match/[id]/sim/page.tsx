import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/build-feed";
import { getPrecomputedSim } from "@/lib/modeling/sim-reader";
import { ScorelineBarChart } from "@/app/components/ScorelineBarChart";
import { ThemeToggle } from "@/app/components/ThemeToggle";

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

async function getMatch(id: string) {
  return getMatchDetail(id);
}

type EdgeRow = {
  outcome: string;
  market: string;
  modelProb: number;
  marketProb: number;
  edge: number;
};

export default async function MatchSimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const precomputed = getPrecomputedSim(match.providerFixtureId, match.kickoffUtc);

  if (!precomputed) {
    return (
      <main className="min-h-screen flex flex-col bg-[var(--bg-body)]">
        <header
          className="flex justify-between items-center px-5 pt-8 pb-3"
          style={{
            paddingTop: "var(--space-lg)",
            paddingLeft: "var(--space-md)",
            paddingRight: "var(--space-md)",
            paddingBottom: "var(--space-sm)",
          }}
        >
          <Link
            href={`/match/${match.providerFixtureId}`}
            className="font-bold uppercase text-[var(--text-main)] hover:text-[var(--text-sec)] transition-colors"
            style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            ← Back to match
          </Link>
          <ThemeToggle />
        </header>
        <section
          className="px-5 py-4 text-mono text-[12px] text-tertiary"
          style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        >
          <p>No simulation data available for this fixture. Run the simulation pipeline to generate data.</p>
        </section>
      </main>
    );
  }

  const { sim, feedProbs, inputs } = precomputed;
  const { goalLambdas, cornerLambdas, components } = inputs;

  // Build edge rows from feedProbs
  const edgeRows: EdgeRow[] = [];
  if (feedProbs.edges) {
    const edges = feedProbs.edges;
    // To show model vs market, we need to derive market probs from blended - edge
    const marketHome = feedProbs.home - edges.home;
    const marketDraw = feedProbs.draw - edges.draw;
    const marketAway = feedProbs.away - edges.away;

    edgeRows.push({
      outcome: "HOME",
      market: "1X2",
      modelProb: feedProbs.home,
      marketProb: marketHome,
      edge: edges.home,
    });
    edgeRows.push({
      outcome: "DRAW",
      market: "1X2",
      modelProb: feedProbs.draw,
      marketProb: marketDraw,
      edge: edges.draw,
    });
    edgeRows.push({
      outcome: "AWAY",
      market: "1X2",
      modelProb: feedProbs.away,
      marketProb: marketAway,
      edge: edges.away,
    });
    if (edges.over_2_5 != null && feedProbs.over_2_5 != null) {
      const marketOver = feedProbs.over_2_5 - edges.over_2_5;
      const modelUnder = 1 - feedProbs.over_2_5;
      const marketUnder = 1 - marketOver;
      edgeRows.push({
        outcome: "OVER",
        market: "O2.5",
        modelProb: feedProbs.over_2_5,
        marketProb: marketOver,
        edge: edges.over_2_5,
      });
      edgeRows.push({
        outcome: "UNDER",
        market: "O2.5",
        modelProb: modelUnder,
        marketProb: marketUnder,
        edge: modelUnder - marketUnder,
      });
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
    const weight = count;

    if (total === 0) totalGoalBuckets["0"] += weight;
    else if (total === 1) totalGoalBuckets["1"] += weight;
    else if (total === 2) totalGoalBuckets["2"] += weight;
    else if (total === 3) totalGoalBuckets["3"] += weight;
    else totalGoalBuckets["4+"] += weight;

    if (diff >= 2) goalDiffBuckets["Home+2"] += weight;
    else if (diff === 1) goalDiffBuckets["Home+1"] += weight;
    else if (diff === 0) goalDiffBuckets["Draw"] += weight;
    else if (diff === -1) goalDiffBuckets["Away+1"] += weight;
    else goalDiffBuckets["Away+2"] += weight;
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg-body)]">
      <header
        className="flex justify-between items-center px-5 pt-8 pb-3"
        style={{
          paddingTop: "var(--space-lg)",
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
          paddingBottom: "var(--space-sm)",
        }}
      >
        <Link
          href={`/match/${match.providerFixtureId}`}
          className="font-bold uppercase text-[var(--text-main)] hover:text-[var(--text-sec)] transition-colors"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          ← Back to match
        </Link>
        <ThemeToggle />
      </header>

      <section
        className="px-5 pb-3"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <h1
          className="font-bold uppercase text-[var(--text-main)] truncate text-headline"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {match.homeTeamCode ?? match.homeTeamName} v {match.awayTeamCode ?? match.awayTeamName}
        </h1>
        <p className="text-secondary-data text-tertiary mt-1">
          Monte Carlo snapshot · {sim.totalSimulations.toLocaleString()} runs
        </p>
      </section>

      {/* Model vs Market - EDGE-FIRST LIST */}
      {edgeRows.length > 0 && (
        <section
          className="px-5 py-4 border-t border-[var(--border-light)]"
          style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Model vs market</h2>
          <div className="space-y-1.5">
            {edgeRows.map((row) => {
              const evLabel = row.edge > 0.10 ? "++EV" : row.edge > 0.05 ? "+EV" : "";
              return (
                <div key={`${row.market}-${row.outcome}`} className="flex items-center gap-3 text-[12px] font-mono">
                  <span className="w-10 text-[11px] font-semibold" style={{ color: evLabel ? "var(--text-main)" : "var(--text-tertiary)" }}>
                    {evLabel || "—"}
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

      {/* Goals Markets */}
      <section
        className="px-5 py-3 border-t border-[var(--border-light)]"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-2">Goals markets</h2>
        <div className="text-primary-data space-y-1">
          <p>BTTS: {formatPercent(sim.pBTTS)}</p>
          <p>O2.5: {formatPercent(sim.pO25)}</p>
          <p>O3.5: {formatPercent(sim.pO35)}</p>
        </div>
      </section>

      {/* Top Scorelines with Bar Chart */}
      <section
        className="px-5 py-3 border-t border-[var(--border-light)]"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Top scorelines</h2>
        <ScorelineBarChart scorelines={sortedScorelines} totalSimulations={sim.totalSimulations} />
      </section>

      {/* Expected Goals */}
      <section
        className="px-5 py-3 border-t border-[var(--border-light)]"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
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

      {/* Supporting Data - Collapsible */}
      <details className="px-5 py-3 border-t border-[var(--border-light)] text-secondary-data text-tertiary" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <summary className="cursor-pointer text-[13px] font-semibold uppercase tracking-[0.08em] mb-2 list-none">
          <span className="text-tertiary">Show model inputs</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-secondary-data uppercase mb-1">Goals λ</p>
            <p>Home λ: {goalLambdas.lambdaHomeGoals.toFixed(2)}</p>
            <p>Away λ: {goalLambdas.lambdaAwayGoals.toFixed(2)}</p>
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
              <p className="text-secondary-data uppercase mb-1">Corners λ</p>
              <p>Home λ: {cornerLambdas.lambdaHomeCorners.toFixed(2)}</p>
              <p>Away λ: {cornerLambdas.lambdaAwayCorners.toFixed(2)}</p>
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
      </details>
    </main>
  );
}
