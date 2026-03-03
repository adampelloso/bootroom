"use client";

type Props = {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeTeamName: string;
  awayTeamName: string;
};

export function WinProbBar({ homeWin, draw, awayWin, homeTeamName, awayTeamName }: Props) {
  const hPct = (homeWin * 100).toFixed(0);
  const dPct = (draw * 100).toFixed(0);
  const aPct = (awayWin * 100).toFixed(0);

  return (
    <section className="px-5 py-5 panel-card" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Win probability</h2>

      {/* Large percentage blocks */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div>
          <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">
            {homeTeamName.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-hero-metric" style={{ color: "var(--color-home)" }}>{hPct}%</span>
        </div>
        <div>
          <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Draw</span>
          <span className="text-hero-metric" style={{ color: "var(--text-tertiary)" }}>{dPct}%</span>
        </div>
        <div>
          <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">
            {awayTeamName.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-hero-metric" style={{ color: "var(--color-away)" }}>{aPct}%</span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-4" style={{ gap: "2px" }}>
        <div
          style={{
            width: `${hPct}%`,
            backgroundColor: "var(--color-home)",
            minWidth: homeWin > 0 ? "4px" : "0",
          }}
        />
        <div
          style={{
            width: `${dPct}%`,
            backgroundColor: "var(--text-tertiary)",
            minWidth: draw > 0 ? "4px" : "0",
          }}
        />
        <div
          style={{
            width: `${aPct}%`,
            backgroundColor: "var(--color-away)",
            minWidth: awayWin > 0 ? "4px" : "0",
          }}
        />
      </div>
    </section>
  );
}
