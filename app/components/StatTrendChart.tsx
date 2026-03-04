"use client";

import { useState, useEffect } from "react";

function abbrev(name: string) { return name.slice(0, 3).toUpperCase(); }

/**
 * Bar chart for one stat over the last N games, with average line.
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
  /** Threshold for hit/miss binary coloring (e.g. 2.5 for O2.5). If set, bars above = blue, below = gray. */
  hitThreshold?: number;
};

export function StatTrendChart({ title, data, average, integerValues, leagueAvg, teamColor, hitThreshold }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      setMounted(true);
    } else {
      requestAnimationFrame(() => setMounted(true));
    }
  }, []);

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

  // Mobile: show last 5 by default with "Show all" toggle
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const displayData = (!showAll && isMobile && data.length > 5) ? data.slice(-5) : data;

  const safeValues = displayData.map((d) => typeof d.value === "number" && !Number.isNaN(d.value) ? d.value : 0);
  const safeAvg = typeof average === "number" && !Number.isNaN(average) ? average : 0;
  const safeLeagueAvg = leagueAvg != null && !Number.isNaN(leagueAvg) ? leagueAvg : null;
  const maxVal = Math.max(...safeValues, safeAvg, safeLeagueAvg ?? 0, 0.5);

  return (
    <div
      className="overflow-hidden"
      style={{
        borderBottom: "1px solid var(--border-light)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary">
          {title}
        </h3>
        {isMobile && data.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[12px] font-mono text-tertiary hover:text-[var(--text-sec)]"
          >
            {showAll ? "Last 5" : "Show all"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {/* Average + league avg labels */}
        <div className="flex items-center justify-end gap-3 text-[12px] text-tertiary font-mono">
          <span>avg {safeAvg % 1 === 0 ? String(Math.round(safeAvg)) : safeAvg.toFixed(1)}</span>
          {safeLeagueAvg != null ? (
            <span>League avg {safeLeagueAvg % 1 === 0 ? String(Math.round(safeLeagueAvg)) : safeLeagueAvg.toFixed(1)}</span>
          ) : null}
        </div>
        {/* Chart area */}
        <div
          className="relative flex items-end"
          style={{ height: "96px", gap: "4px" }}
          aria-label={`${title}: last ${displayData.length} games with average ${safeAvg}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Average line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed z-10 pointer-events-none"
            style={{
              borderColor: "var(--color-amber)",
              opacity: 0.5,
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
          {hoveredIndex != null && displayData[hoveredIndex] && (
            <div
              className="absolute z-30 pointer-events-none font-mono text-[12px] whitespace-nowrap px-2 py-1"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                bottom: "100%",
                left: `${((hoveredIndex + 0.5) / displayData.length) * 100}%`,
                transform: "translateX(-50%)",
                marginBottom: "4px",
              }}
            >
              vs {displayData[hoveredIndex].opponentName} · {Math.round(displayData[hoveredIndex].value)}
            </div>
          )}

          {displayData.map((point, i) => {
            const num = typeof point.value === "number" && !Number.isNaN(point.value) ? point.value : 0;
            const pct = maxVal > 0 ? (num / maxVal) * 100 : 0;
            const barHeightPx = Math.max((pct / 100) * 96, num === 0 ? 2 : 0);
            const displayVal = String(Math.round(num));
            const minBarH = num > 0 ? 18 : 2;
            const h = Math.max(barHeightPx, minBarH);

            // Binary hit/miss coloring
            let barColor: string;
            if (hitThreshold != null) {
              barColor = num > hitThreshold ? "var(--color-bar-primary)" : "var(--color-bar-secondary)";
            } else if (teamColor === "away") {
              barColor = "var(--color-bar-secondary)";
            } else {
              barColor = "var(--color-bar-primary)";
            }

            const isHovered = hoveredIndex === i;
            const showLabelInside = h >= 20;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end min-w-0 cursor-pointer"
                style={{ height: "96px" }}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {!showLabelInside && num > 0 && (
                  <span className="font-mono font-medium text-[12px] select-none mb-0.5" style={{ color: "var(--text-sec)" }}>
                    {displayVal}
                  </span>
                )}
                <div
                  className="w-full flex-shrink-0 relative flex items-center justify-center"
                  style={{
                    height: mounted ? `${h}px` : "0px",
                    minHeight: mounted ? (num === 0 ? "2px" : "18px") : "0px",
                    backgroundColor: barColor,
                    opacity: isHovered ? 1 : 0.85,
                    outline: isHovered ? "1px solid var(--text-sec)" : "none",
                    outlineOffset: "-1px",
                    transition: "height 300ms ease-out",
                    transitionDelay: `${i * 20}ms`,
                  }}
                >
                  {showLabelInside ? (
                    <span
                      className="font-mono font-medium text-[12px] select-none"
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
        <div className="flex mt-1" style={{ gap: "4px" }}>
          {displayData.map((point, i) => (
            <div
              key={i}
              className="flex-1 min-w-0 text-center"
              style={{}}
            >
              <span className="text-[12px] font-mono text-tertiary truncate block w-full leading-tight">
                {abbrev(point.opponentName)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
