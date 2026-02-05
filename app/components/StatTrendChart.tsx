"use client";

/**
 * Bar chart for one stat over the last 10 games, with average line.
 * X-axis shows opponent (abbreviated); tooltip has full name.
 */

export type StatTrendPoint = {
  value: number;
  opponentName: string;
};

type Props = {
  title: string;
  data: StatTrendPoint[];
  average: number;
  /** For integer stats (e.g. goals) show whole numbers */
  integerValues?: boolean;
};

function abbreviate(name: string, maxLen = 10): string {
  if (name.length <= maxLen) return name;
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return parts.map((p) => p.slice(0, 2)).join("").slice(0, maxLen);
  }
  return name.slice(0, maxLen);
}

export function StatTrendChart({ title, data, average, integerValues }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          padding: "var(--space-sm) var(--space-md)",
        }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary mb-3">
          {title}
        </h3>
        <p className="text-[13px] text-tertiary">No data (last 10).</p>
      </div>
    );
  }

  const safeValues = data.map((d) => typeof d.value === "number" && !Number.isNaN(d.value) ? d.value : 0);
  const safeAvg = typeof average === "number" && !Number.isNaN(average) ? average : 0;
  const maxVal = Math.max(...safeValues, safeAvg, 0.5);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary mb-3">
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {/* Average line label — averages can be decimals; show .0 only when needed */}
        <div className="flex items-center justify-end gap-2 text-[10px] text-tertiary font-mono">
          <span>avg</span>
          <span>
            {safeAvg % 1 === 0 ? String(Math.round(safeAvg)) : safeAvg.toFixed(1)}
          </span>
        </div>
        {/* Chart area: bars + average line. Use fixed pixel height so bar % has a defined containing block. */}
        <div
          className="relative flex gap-0.5"
          style={{ height: "96px" }}
          aria-label={`${title}: last ${data.length} games with average ${safeAvg}`}
        >
          {/* Average line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed opacity-70 z-10 pointer-events-none"
            style={{
              borderColor: "var(--text-tertiary)",
              bottom: maxVal > 0 ? `${(safeAvg / maxVal) * 96}px` : 0,
            }}
          />
          {data.map((point, i) => {
            const num = typeof point.value === "number" && !Number.isNaN(point.value) ? point.value : 0;
            const pct = maxVal > 0 ? (num / maxVal) * 100 : 0;
            const barHeightPx = Math.max((pct / 100) * 96, num === 0 ? 2 : 0);
            const displayVal = String(Math.round(num));
            const minBarH = num > 0 ? 18 : 2;
            const h = Math.max(barHeightPx, minBarH);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end min-w-0 gap-0.5"
                style={{ height: "96px" }}
                title={`${point.opponentName}: ${displayVal}`}
              >
                <div
                  className="w-full rounded-t flex-shrink-0 transition-all relative flex items-center justify-center"
                  style={{
                    height: `${h}px`,
                    minHeight: num === 0 ? "2px" : "18px",
                    backgroundColor: "var(--bg-accent)",
                  }}
                >
                  {h >= 14 ? (
                    <span
                      className="font-mono font-medium text-[10px] select-none"
                      style={{
                        color: "white",
                        textShadow: "0 0 1px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)",
                      }}
                    >
                      {displayVal}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {/* Opponent labels below chart so they don't affect bar height */}
        <div className="flex gap-0.5 mt-1">
          {data.map((point, i) => (
            <div
              key={i}
              className="flex-1 min-w-0 text-center"
              title={point.opponentName}
            >
              <span className="text-[9px] font-mono text-tertiary truncate block w-full leading-tight">
                {abbreviate(point.opponentName, 8)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
