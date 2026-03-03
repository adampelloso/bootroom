"use client";

import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";

type Props = {
  sim: MatchSimulationResult | null;
  feedProbs: FeedModelProbs | null;
};

function PctBar({ value }: { value: number }) {
  return (
    <div className="pct-bar mt-1" style={{ width: "100%" }}>
      <div className="pct-bar-fill" style={{ width: `${Math.min(value * 100, 100)}%` }} />
    </div>
  );
}

export function MatchPulse({ sim, feedProbs }: Props) {
  if (!sim && !feedProbs) return null;

  const totalXg = sim
    ? (sim.expectedHomeGoals + sim.expectedAwayGoals).toFixed(2)
    : null;
  const o25 = feedProbs?.over_2_5 ?? (sim ? sim.pO25 : null);
  const btts = feedProbs?.btts ?? (sim ? sim.pBTTS : null);
  const topScoreline = feedProbs?.topScorelines?.[0] ?? (sim
    ? (() => {
        const sorted = Object.entries(sim.scorelines).sort((a, b) => b[1] - a[1]);
        return sorted[0] ? { score: sorted[0][0], prob: sorted[0][1] / sim.totalSimulations } : null;
      })()
    : null);

  return (
    <section
      className="px-5 py-5 panel-card"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totalXg != null && (
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Total xG</span>
            <span className="text-hero-metric">{totalXg}</span>
          </div>
        )}
        {o25 != null && (
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">O2.5 proj.</span>
            <span className="text-hero-metric">{(o25 * 100).toFixed(0)}%</span>
            <PctBar value={o25} />
          </div>
        )}
        {btts != null && (
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">BTTS proj.</span>
            <span className="text-hero-metric">{(btts * 100).toFixed(0)}%</span>
            <PctBar value={btts} />
          </div>
        )}
        {topScoreline && (
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Top scoreline</span>
            <span className="text-hero-metric">{topScoreline.score}</span>
            <span className="text-mono text-[11px] text-tertiary block mt-1">
              {(topScoreline.prob * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
