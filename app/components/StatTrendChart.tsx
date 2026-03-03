"use client";

import { useState } from "react";

function abbrev(name: string) { return name.slice(0, 3).toUpperCase(); }

/**
 * Bar chart for one stat over the last 10 games, with average line.
 * X-axis shows opponent (abbreviated); hover tooltip shows full name + value.
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
  /** League average (optional); shown as label and reference line */
  leagueAvg?: number;
  /** Team color differentiation: home = blue, away = gray */
  teamColor?: "home" | "away";
};

function getTop3Indices(data: StatTrendPoint[]): Set<number> {
  const indexed = data.map((d, i) => ({ value: d.value, index: i }));
  indexed.sort((a, b) => b.value - a.value);
  return new Set(indexed.slice(0, 3).map((d) => d.index));
}

export function StatTrendChart({ title, data, average, integerValues, leagueAvg, teamColor }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="overflow-hidden"
        style={{
          borderBottom: "1px solid var(--border-light)",
          padding: "var(--space-sm) var(--space-md)",
        }}
      >
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary mb-3">
          {title}
        </h3>
        <p className="text-[13px] text-tertiary">No data (last 10).</p>
      </div>
    );
  }

  const safeValues = data.map((d) => typeof d.value === "number" && !Number.isNaN(d.value) ? d.value : 0);
  const safeAvg = typeof average === "number" && !Number.isNaN(average) ? average : 0;
  const safeLeagueAvg = leagueAvg != null && !Number.isNaN(leagueAvg) ? leagueAvg : null;
  const maxVal = Math.max(...safeValues, safeAvg, safeLeagueAvg ?? 0, 0.5);
  const top3 = getTop3Indices(data);

  return (
    <div
      className="overflow-hidden"
      style={{
        borderBottom: "1px solid var(--border-light)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary mb-3">
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {/* Average + league avg labels */}
        <div className="flex items-center justify-end gap-3 text-[10px] text-tertiary font-mono">
          <span>avg {safeAvg % 1 === 0 ? String(Math.round(safeAvg)) : safeAvg.toFixed(1)}</span>
          {safeLeagueAvg != null ? (
            <span>League avg {safeLeagueAvg % 1 === 0 ? String(Math.round(safeLeagueAvg)) : safeLeagueAvg.toFixed(1)}</span>
          ) : null}
        </div>
        {/* Chart area */}
        <div
          className="relative flex gap-1"
          style={{ height: "96px" }}
          aria-label={`${title}: last ${data.length} games with average ${safeAvg}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Average line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed opacity-70 z-10 pointer-events-none"
            style={{
              borderColor: "var(--text-tertiary)",
              bottom: maxVal > 0 ? `${(safeAvg / maxVal) * 96}px` : 0,
            }}
          />
          {safeLeagueAvg != null && maxVal > 0 ? (
            <div
              className="absolute left-0 right-0 border-t border-dashed z-10 pointer-events-none"
              style={{
                borderColor: "var(--text-tertiary)",
                opacity: 0.5,
                bottom: `${(safeLeagueAvg / maxVal) * 96}px`,
              }}
            />
          ) : null}

          {/* Hover tooltip */}
          {hoveredIndex != null && data[hoveredIndex] && (
            <div
              className="absolute z-30 pointer-events-none font-mono text-[10px] whitespace-nowrap px-2 py-1"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-light)",
                color: "var(--text-main)",
                bottom: "100%",
                left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
                transform: "translateX(-50%)",
                marginBottom: "4px",
              }}
            >
              vs {data[hoveredIndex].opponentName} · {Math.round(data[hoveredIndex].value)}
            </div>
          )}

          {data.map((point, i) => {
            const num = typeof point.value === "number" && !Number.isNaN(point.value) ? point.value : 0;
            const pct = maxVal > 0 ? (num / maxVal) * 100 : 0;
            const barHeightPx = Math.max((pct / 100) * 96, num === 0 ? 2 : 0);
            const displayVal = String(Math.round(num));
            const minBarH = num > 0 ? 18 : 2;
            const h = Math.max(barHeightPx, minBarH);
            const defaultHighlight = teamColor === "away" ? "var(--color-away)" : "var(--color-bar-highlight)";
            const defaultMuted = teamColor === "away" ? "var(--color-away-muted)" : teamColor === "home" ? "var(--color-home-muted)" : "var(--color-bar-muted)";
            const barColor = top3.has(i) ? defaultHighlight : defaultMuted;
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end min-w-0 gap-0.5 cursor-pointer"
                style={{ height: "96px" }}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                <div
                  className="w-full flex-shrink-0 transition-all relative flex items-center justify-center"
                  style={{
                    height: `${h}px`,
                    minHeight: num === 0 ? "2px" : "18px",
                    backgroundColor: barColor,
                    opacity: isHovered ? 1 : undefined,
                    outline: isHovered ? "1px solid var(--text-sec)" : "none",
                    outlineOffset: "-1px",
                  }}
                >
                  {h >= 14 ? (
                    <span
                      className="font-mono font-medium text-[10px] select-none"
                      style={{ color: "var(--text-main)" }}
                    >
                      {displayVal}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {/* Opponent labels below chart */}
        <div className="flex gap-1 mt-1">
          {data.map((point, i) => (
            <div
              key={i}
              className="flex-1 min-w-0 text-center"
            >
              <span className="text-[9px] font-mono text-tertiary truncate block w-full leading-tight">
                {abbrev(point.opponentName)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
