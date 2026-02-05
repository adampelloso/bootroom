"use client";

import { useState } from "react";

export type Period = "L5" | "L10" | "Season";

export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const periods: Period[] = ["L5", "L10", "Season"];
  const activeIndex = periods.indexOf(value);

  return (
    <div
      className="relative flex rounded-full border border-[var(--border-light)] bg-[var(--bg-body)] px-1 py-0.5"
      style={{ overflow: "hidden", width: "fit-content" }}
    >
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-[var(--bg-accent)] transition-transform duration-200 ease-out"
        style={{
          width: `${100 / periods.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {periods.map((period) => {
        const isActive = value === period;
        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            className="relative z-10 px-3 py-1 text-[10px] uppercase font-mono whitespace-nowrap text-center transition-colors"
            style={{
              color: isActive ? "var(--text-on-accent)" : "var(--text-main)",
            }}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}
