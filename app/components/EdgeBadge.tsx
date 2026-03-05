"use client";

type Props = {
  edge: number;
  market: string;
  bookProb?: number;
  variant?: "inline" | "badge";
};

/** Lowercase the "O" prefix on over/under markets for display. */
function formatMarket(m: string): string {
  return m.replace(/^O(\d)/, "o$1").replace(/^U(\d)/, "u$1");
}

function edgeColor(edge: number): string {
  if (edge > 0.10) return "var(--color-edge-strong)";
  if (edge > 0.05) return "var(--color-edge-mild)";
  if (edge > -0.05) return "var(--color-edge-neutral)";
  return "var(--color-edge-negative)";
}

export function EdgeBadge({ edge, market, bookProb, variant = "badge" }: Props) {
  const color = edgeColor(edge);
  const sign = edge > 0 ? "+" : "";
  const edgePct = `${sign}${(edge * 100).toFixed(0)}%`;

  if (variant === "inline") {
    return (
      <span
        className="flex items-center gap-1.5 font-mono text-[12px] uppercase"
        style={{ color }}
      >
        {bookProb != null && (
          <span style={{ color: "var(--text-tertiary)" }}>
            BOOK {(bookProb * 100).toFixed(0)}%
          </span>
        )}
        {bookProb != null && <span style={{ color: "var(--text-tertiary)" }}>|</span>}
        <span>{edgePct} EDGE</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 font-mono font-semibold text-[12px] uppercase px-1.5 py-0.5"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className="normal-case">{formatMarket(market)}</span> {edgePct}
    </span>
  );
}

/** Find the best positive edge across all markets. */
export function getBestEdge(
  modelProbs: { edges?: { home: number; draw: number; away: number; over_2_5?: number; btts?: number } } | null | undefined
): { market: string; edge: number } | null {
  if (!modelProbs?.edges) return null;
  const e = modelProbs.edges;
  const candidates: { market: string; edge: number }[] = [
    { market: "HOME", edge: e.home },
    { market: "DRAW", edge: e.draw },
    { market: "AWAY", edge: e.away },
  ];
  if (e.over_2_5 != null) candidates.push({ market: "o2.5", edge: e.over_2_5 });
  if (e.btts != null) candidates.push({ market: "BTTS", edge: e.btts });

  const best = candidates.reduce((a, b) => (b.edge > a.edge ? b : a), candidates[0]);
  return best.edge > 0.03 ? best : null;
}
