"use client";

import type { FeedModelProbs } from "@/lib/modeling/feed-model-probs";
import { ValueTable } from "@/app/components/ValueTable";

type Props = {
  feedProbs: FeedModelProbs | null;
  homeTeamName: string;
  awayTeamName: string;
};

export function ValueTab({ feedProbs, homeTeamName, awayTeamName }: Props) {
  if (!feedProbs) {
    return (
      <div className="px-5 py-8" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <p className="text-[13px] text-tertiary">
          No model projections available for this match yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-1">
          Value Analysis
        </h2>
        <p className="text-[12px] text-tertiary mb-4">
          {homeTeamName} vs {awayTeamName} — Model projection vs published lines
        </p>
        <ValueTable feedProbs={feedProbs} />
      </section>
    </div>
  );
}
