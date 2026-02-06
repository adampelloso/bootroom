"use client";

type Props = {
  scorelines: Array<[string, number]>;
  totalSimulations: number;
};

export function ScorelineBarChart({ scorelines, totalSimulations }: Props) {
  const maxPercent = Math.max(...scorelines.map(([, count]) => count / totalSimulations));

  return (
    <div className="space-y-2">
      {scorelines.map(([score, count], i) => {
        const percent = count / totalSimulations;
        const barWidth = (percent / maxPercent) * 200;
        const barColor = i < 3 ? "var(--color-bar-highlight)" : "var(--color-bar-muted)";
        return (
          <div key={score} className="flex items-center gap-3">
            <span className="text-mono text-[12px] text-tertiary w-12 shrink-0">{score}</span>
            <div className="flex-1 relative" style={{ maxWidth: 200 }}>
              <div
                className="h-6"
                style={{ width: `${barWidth}px`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-mono text-[12px] text-tertiary w-16 text-right shrink-0">
              {(percent * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
