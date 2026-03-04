"use client";

function abbrev(name: string) { return name.slice(0, 3).toUpperCase(); }

type CornersData = {
  homeCornersFor: number;
  homeCornersAgainst: number;
  homeTotalCorners: number;
  awayCornersFor: number;
  awayCornersAgainst: number;
  awayTotalCorners: number;
  combinedTotal: number;
  homeEdge: number;
  awayEdge: number;
};

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  data: CornersData;
};

/**
 * Dedicated corners card — flat table layout with hr dividers.
 */
export function CornersCard({ homeTeamName, awayTeamName, data }: Props) {
  const {
    homeCornersFor,
    homeCornersAgainst,
    homeTotalCorners,
    awayCornersFor,
    awayCornersAgainst,
    awayTotalCorners,
    combinedTotal,
    homeEdge,
    awayEdge,
  } = data;

  return (
    <section
      className="px-5 py-4 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Corners breakdown"
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Corners</h2>

      {/* Home team */}
      <div className="pb-3 border-b border-[var(--border-light)]">
        <p className="text-mono text-[12px] uppercase text-tertiary mb-3">
          {abbrev(homeTeamName)} (last 5 home)
        </p>
        <div className="grid grid-cols-3 gap-3 text-secondary-data">
          <div>
            <span className="text-tertiary block mb-1">For</span>
            <span className="text-primary-data font-semibold">{homeCornersFor.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-tertiary block mb-1">Against</span>
            <span className="text-primary-data font-semibold">{homeCornersAgainst.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-tertiary block mb-1">Total</span>
            <span
              className="text-mono font-bold"
              style={{ fontSize: "18px", color: "var(--text-main)" }}
            >
              {homeTotalCorners.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Away team */}
      <div className="py-3 border-b border-[var(--border-light)]">
        <p className="text-mono text-[12px] uppercase text-tertiary mb-3">
          {abbrev(awayTeamName)} (last 5 away)
        </p>
        <div className="grid grid-cols-3 gap-3 text-secondary-data">
          <div>
            <span className="text-tertiary block mb-1">For</span>
            <span className="text-primary-data font-semibold">{awayCornersFor.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-tertiary block mb-1">Against</span>
            <span className="text-primary-data font-semibold">{awayCornersAgainst.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-tertiary block mb-1">Total</span>
            <span
              className="text-mono font-bold"
              style={{ fontSize: "18px", color: "var(--text-main)" }}
            >
              {awayTotalCorners.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Combined & Edge */}
      <div className="pt-3">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-mono text-[12px] uppercase text-tertiary">Combined expected</p>
          <span
            className="text-mono font-bold"
            style={{ fontSize: "18px", color: "var(--text-main)" }}
          >
            {combinedTotal.toFixed(1)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-light)] text-secondary-data">
          <div>
            <span className="text-tertiary block mb-1 text-[12px] uppercase">
              {abbrev(homeTeamName)} edge
            </span>
            <span className="text-primary-data font-semibold" style={{ color: "var(--text-main)" }}>
              {homeEdge > 0 ? "+" : ""}
              {homeEdge.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-tertiary block mb-1 text-[12px] uppercase">
              {abbrev(awayTeamName)} edge
            </span>
            <span className="text-primary-data font-semibold" style={{ color: "var(--text-main)" }}>
              {awayEdge > 0 ? "+" : ""}
              {awayEdge.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
