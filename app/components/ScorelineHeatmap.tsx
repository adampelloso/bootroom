"use client";

type ScorelineDistribution = Record<string, number>;

type Props = {
  scorelines: ScorelineDistribution;
  totalSimulations: number;
};

export function ScorelineHeatmap({ scorelines, totalSimulations }: Props) {
  const MAX_GOALS = 5;

  // Build grid data
  const grid: number[][] = Array.from({ length: MAX_GOALS + 1 }, () =>
    Array(MAX_GOALS + 1).fill(0)
  );

  let maxProb = 0;
  let topScore = "";
  let topProb = 0;

  for (const [score, count] of Object.entries(scorelines)) {
    const [hs, as] = score.split("-").map((x) => parseInt(x, 10));
    if (Number.isNaN(hs) || Number.isNaN(as)) continue;
    const h = Math.min(hs, MAX_GOALS);
    const a = Math.min(as, MAX_GOALS);
    const prob = count / totalSimulations;
    grid[a][h] += prob;
    if (grid[a][h] > maxProb) maxProb = grid[a][h];
    if (prob > topProb) {
      topProb = prob;
      topScore = score;
    }
  }

  return (
    <div style={{ overflowX: "auto", minWidth: 0 }}>
    <div style={{ minWidth: "240px" }}>
      {/* Column headers (home goals) */}
      <div className="flex items-end mb-1">
        <div className="w-6 shrink-0" />
        {Array.from({ length: MAX_GOALS + 1 }, (_, i) => (
          <div key={i} className="flex-1 text-center text-[12px] font-mono text-tertiary">
            {i === MAX_GOALS ? `${i}+` : i}
          </div>
        ))}
      </div>

      {/* Grid rows (away goals) */}
      {Array.from({ length: MAX_GOALS + 1 }, (_, away) => (
        <div key={away} className="flex items-center" style={{ height: "28px" }}>
          <div className="w-6 shrink-0 text-[12px] font-mono text-tertiary text-right pr-1">
            {away === MAX_GOALS ? `${away}+` : away}
          </div>
          {Array.from({ length: MAX_GOALS + 1 }, (_, home) => {
            const prob = grid[away][home];
            const pct = (prob * 100).toFixed(1);
            const isTop = `${home}-${away}` === topScore;
            // Interpolated color: dim slate → lime green
            const intensity = maxProb > 0 ? prob / maxProb : 0;
            const r = Math.round(30 + (212 - 30) * intensity);
            const g = Math.round(41 + (255 - 41) * intensity);
            const b = Math.round(59 + (0 - 59) * intensity);
            const a = Math.max(0.08, intensity * 0.9);
            return (
              <div
                key={home}
                className="flex-1 flex items-center justify-center border border-[var(--bg-body)]"
                style={{
                  height: "28px",
                  backgroundColor: prob > 0 ? `rgba(${r}, ${g}, ${b}, ${a})` : "transparent",
                  outline: isTop ? "2px solid var(--color-amber)" : "none",
                  outlineOffset: "-2px",
                }}
                title={`${home}-${away}: ${pct}%`}
              >
                {prob >= 0.01 && (
                  <span className="text-[12px] font-mono font-medium" style={{ color: "var(--text-main)" }}>
                    {pct}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Axis labels */}
      <div className="flex justify-between text-[12px] font-mono text-tertiary mt-1 px-6">
        <span>← Home goals</span>
        <span>Away goals ↑</span>
      </div>
    </div>
    </div>
  );
}
