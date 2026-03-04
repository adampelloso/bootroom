"use client";

function abbrev(name: string) { return name.slice(0, 3).toUpperCase(); }

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  homeMatchCount: number;
  awayMatchCount: number;
};

/**
 * Team totals block: Home and Away goals (L5/L10 avg) for team O/U context.
 */
export function TeamTotalsSection({
  homeTeamName,
  awayTeamName,
  homeGoalsFor,
  homeGoalsAgainst,
  awayGoalsFor,
  awayGoalsAgainst,
  homeMatchCount,
  awayMatchCount,
}: Props) {
  return (
    <section
      id="section-team-totals"
      className="px-5 py-4 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Team totals"
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Team totals</h2>
      <p className="text-mono text-[12px] uppercase text-tertiary mb-3">Goals (L5 home / L5 away)</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="border-b border-[var(--border-light)] pb-3">
          <p className="text-mono text-[12px] uppercase text-tertiary mb-2">
            {abbrev(homeTeamName)} (home)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-primary-data font-semibold">{homeGoalsFor.toFixed(1)}</span>
            <span className="text-tertiary text-[12px]">for</span>
            <span className="text-tertiary text-[12px]">/</span>
            <span className="text-primary-data font-semibold">{homeGoalsAgainst.toFixed(1)}</span>
            <span className="text-tertiary text-[12px]">against</span>
          </div>
          {homeMatchCount > 0 && (
            <p className="text-[12px] text-tertiary mt-1">{homeMatchCount} matches</p>
          )}
        </div>
        <div className="border-b border-[var(--border-light)] pb-3">
          <p className="text-mono text-[12px] uppercase text-tertiary mb-2">
            {abbrev(awayTeamName)} (away)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-primary-data font-semibold">{awayGoalsFor.toFixed(1)}</span>
            <span className="text-tertiary text-[12px]">for</span>
            <span className="text-tertiary text-[12px]">/</span>
            <span className="text-primary-data font-semibold">{awayGoalsAgainst.toFixed(1)}</span>
            <span className="text-tertiary text-[12px]">against</span>
          </div>
          {awayMatchCount > 0 && (
            <p className="text-[12px] text-tertiary mt-1">{awayMatchCount} matches</p>
          )}
        </div>
      </div>
    </section>
  );
}
