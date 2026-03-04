"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LeagueFilterValue } from "@/lib/leagues";
import { SUPPORTED_COMPETITIONS } from "@/lib/leagues";
import type { DateRange } from "./DateSelector";

function buildUrl(range: DateRange, league: LeagueFilterValue): string {
  const sp = new URLSearchParams();
  if (range !== "today") sp.set("range", range);
  sp.set("league", league);
  return `/feed?${sp.toString()}`;
}

export function LeagueScrubber({
  currentRange,
  currentLeague,
  activeLeagues,
  children,
}: {
  currentRange: DateRange;
  currentLeague: LeagueFilterValue;
  activeLeagues: Array<{ value: LeagueFilterValue; label: string }>;
  children?: ReactNode;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !activeRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentLeague]);

  const items: Array<{ value: LeagueFilterValue; label: string }> = [
    { value: "all", label: "All" },
    ...activeLeagues,
  ];

  if (items.length <= 1) return null;

  return (
    <div
      className="flex items-center justify-between"
      style={{ paddingBottom: "var(--space-sm)" }}
    >
      <div
        ref={containerRef}
        className="filters-scroll flex gap-2"
        style={{
          gap: "var(--space-xs)",
          scrollSnapType: "x mandatory",
        }}
        aria-label="Choose league"
      >
        {items.map((item) => {
          const isSelected = item.value === currentLeague;
          return (
            <button
              key={item.value}
              ref={isSelected ? activeRef : null}
              type="button"
              onClick={() => router.push(buildUrl(currentRange, item.value))}
              className="font-mono text-[12px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0 hover:bg-[var(--bg-surface)]"
              style={{
                scrollSnapAlign: "center",
                padding: "10px 14px",
                background: isSelected ? "var(--bg-surface)" : "transparent",
                color: isSelected ? "var(--text-main)" : "var(--text-tertiary)",
                border: isSelected ? "none" : "1px solid var(--border-light)",
                lineHeight: 1.1,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
