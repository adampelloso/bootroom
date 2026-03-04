"use client";

import { useState, useEffect } from "react";

export type FeedFilters = {
  marketType: "all" | "goals" | "btts" | "corners";
  minEdge: number;
  minTier: "ALL" | "HIGH" | "HIGH_MEDIUM";
};

const DEFAULT_FILTERS: FeedFilters = {
  marketType: "all",
  minEdge: 0,
  minTier: "ALL",
};

const STORAGE_KEY = "bootroom-feed-filters";

function loadFilters(): FeedFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_FILTERS;
}

function saveFilters(f: FeedFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {}
}

const MARKET_OPTIONS: Array<{ value: FeedFilters["marketType"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "goals", label: "Goals" },
  { value: "btts", label: "BTTS" },
  { value: "corners", label: "Corners" },
];

const EDGE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "0%" },
  { value: 4, label: "4%" },
  { value: 8, label: "8%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
];

const TIER_OPTIONS: Array<{ value: FeedFilters["minTier"]; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "HIGH", label: "High" },
  { value: "HIGH_MEDIUM", label: "High+Med" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 font-mono text-[12px] uppercase transition-colors whitespace-nowrap"
      style={{
        background: active ? "var(--text-main)" : "transparent",
        color: active ? "var(--bg-body)" : "var(--text-tertiary)",
        border: active ? "none" : "1px solid var(--border-light)",
      }}
    >
      {children}
    </button>
  );
}

export function FeedFilterBar({
  onFilterChange,
}: {
  onFilterChange: (filters: FeedFilters) => void;
}) {
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadFilters();
    setFilters(saved);
    onFilterChange(saved);
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch: Partial<FeedFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    saveFilters(next);
    onFilterChange(next);
  }

  if (!mounted) return null;

  return (
    <div
      className="flex items-center gap-4 overflow-x-auto py-2"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Market type */}
      <div className="flex items-center gap-1 shrink-0">
        {MARKET_OPTIONS.map((opt) => (
          <Pill
            key={opt.value}
            active={filters.marketType === opt.value}
            onClick={() => update({ marketType: opt.value })}
          >
            {opt.label}
          </Pill>
        ))}
      </div>

      <div className="w-px h-5 shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Edge threshold */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono text-[10px] uppercase mr-1" style={{ color: "var(--text-tertiary)" }}>
          Edge
        </span>
        {EDGE_OPTIONS.map((opt) => (
          <Pill
            key={opt.value}
            active={filters.minEdge === opt.value}
            onClick={() => update({ minEdge: opt.value })}
          >
            {opt.label}
          </Pill>
        ))}
      </div>

      <div className="w-px h-5 shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Confidence tier */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono text-[10px] uppercase mr-1" style={{ color: "var(--text-tertiary)" }}>
          Tier
        </span>
        {TIER_OPTIONS.map((opt) => (
          <Pill
            key={opt.value}
            active={filters.minTier === opt.value}
            onClick={() => update({ minTier: opt.value })}
          >
            {opt.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}
