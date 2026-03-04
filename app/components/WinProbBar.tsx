"use client";

type Props = {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeTeamName: string;
  awayTeamName: string;
  marketHomeWin?: number;
  marketDraw?: number;
  marketAwayWin?: number;
};

function ProbBar({ home, draw, away, label }: { home: number; draw: number; away: number; label?: string }) {
  const hPct = (home * 100).toFixed(0);
  const dPct = (draw * 100).toFixed(0);
  const aPct = (away * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-mono text-[12px] uppercase text-tertiary w-10 shrink-0">{label}</span>
      )}
      <div className="flex h-4 flex-1" style={{ gap: "2px" }}>
        <div style={{ width: `${hPct}%`, backgroundColor: "var(--color-home)", minWidth: home > 0 ? "4px" : "0" }} />
        <div style={{ width: `${dPct}%`, backgroundColor: "var(--text-tertiary)", minWidth: draw > 0 ? "4px" : "0" }} />
        <div style={{ width: `${aPct}%`, backgroundColor: "var(--color-away)", minWidth: away > 0 ? "4px" : "0" }} />
      </div>
    </div>
  );
}

export function WinProbBar({ homeWin, draw, awayWin, homeTeamName, awayTeamName, marketHomeWin, marketDraw, marketAwayWin }: Props) {
  const hPct = (homeWin * 100).toFixed(0);
  const dPct = (draw * 100).toFixed(0);
  const aPct = (awayWin * 100).toFixed(0);
  const hasMarket = marketHomeWin != null && marketDraw != null && marketAwayWin != null;

  return (
    <section className="px-5 py-5 panel-card" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Win probability</h2>

      {/* Large percentage blocks */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div>
          <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">
            {homeTeamName.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-hero-metric" style={{ color: "var(--color-home)" }}>{hPct}%</span>
        </div>
        <div>
          <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">Draw</span>
          <span className="text-hero-metric" style={{ color: "var(--text-tertiary)" }}>{dPct}%</span>
        </div>
        <div>
          <span className="text-mono text-[12px] uppercase text-tertiary block mb-1">
            {awayTeamName.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-hero-metric" style={{ color: "var(--color-away)" }}>{aPct}%</span>
        </div>
      </div>

      {/* Dual bars: MODEL on top, BOOK beneath */}
      <div className="space-y-1.5">
        <ProbBar home={homeWin} draw={draw} away={awayWin} label={hasMarket ? "MODEL" : undefined} />
        {hasMarket && (
          <ProbBar home={marketHomeWin} draw={marketDraw} away={marketAwayWin} label="BOOK" />
        )}
      </div>
    </section>
  );
}
