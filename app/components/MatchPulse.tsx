"use client";

import type { MatchSimulationResult } from "@/lib/modeling/mc-engine";
import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { EdgeBadge } from "@/app/components/EdgeBadge";
import { percentColor } from "@/lib/percent-color";

type Props = {
  sim: MatchSimulationResult | null;
  feedProbs: FeedModelProbs | null;
};

function PctBar({ value }: { value: number }) {
  return (
    <div className="pct-bar mt-1" style={{ width: "100%", height: "6px" }}>
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

  const o25Edge = feedProbs?.edges?.over_2_5;
  const bttsEdge = feedProbs?.edges?.btts;
  const o25BookProb = feedProbs?.marketProbs?.over_2_5;
  const bttsBookProb = feedProbs?.marketProbs?.btts;

  return (
    <section
      className="px-5 py-5 panel-card"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)", background: "var(--bg-panel)" }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totalXg != null && (
          <div>
            <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">Total xG</span>
            <span className="text-hero-metric">{totalXg}</span>
          </div>
        )}
        {o25 != null && (
          <div>
            <span className="text-mono text-[12px] uppercase text-tertiary block mb-1"><span className="normal-case">o2.5</span> proj.</span>
            <span className="text-hero-metric" style={{ color: percentColor(o25 * 100) }}>{(o25 * 100).toFixed(0)}%</span>
            <PctBar value={o25} />
            {o25Edge != null && (
              <div className="mt-1.5">
                <EdgeBadge edge={o25Edge} market="o2.5" bookProb={o25BookProb} variant="inline" />
              </div>
            )}
          </div>
        )}
        {btts != null && (
          <div>
            <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">BTTS proj.</span>
            <span className="text-hero-metric" style={{ color: percentColor(btts * 100) }}>{(btts * 100).toFixed(0)}%</span>
            <PctBar value={btts} />
            {bttsEdge != null && (
              <div className="mt-1.5">
                <EdgeBadge edge={bttsEdge} market="BTTS" bookProb={bttsBookProb} variant="inline" />
              </div>
            )}
          </div>
        )}
        {topScoreline && (
          <div>
            <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">Top scoreline</span>
            <span className="text-hero-metric">{topScoreline.score}</span>
            <span className="text-mono text-[12px] text-tertiary block mt-1">
              {(topScoreline.prob * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
