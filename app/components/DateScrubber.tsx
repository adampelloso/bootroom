"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LeagueFilterValue } from "@/lib/leagues";

function parseDateSafe(str: string): Date | null {
  const d = new Date(str + "T12:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatPill(d: Date): { top: string; bottom: string } {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
  return { top: weekday, bottom: day };
}

function buildUrl(date: string, league?: LeagueFilterValue): string {
  const sp = new URLSearchParams();
  sp.set("date", date);
  if (league) sp.set("league", league);
  return `/?${sp.toString()}`;
}

export function DateScrubber({
  currentDate,
  currentLeague,
}: {
  currentDate: string;
  currentLeague?: LeagueFilterValue;
}) {
  const router = useRouter();
  const selected = useMemo(() => parseDateSafe(currentDate) ?? new Date(), [currentDate]);
  const selectedIso = toISODate(selected);

  const days = useMemo(() => {
    const out: Array<{ iso: string; date: Date }> = [];
    const start = new Date(selected);
    start.setDate(start.getDate() - 10);
    for (let i = 0; i < 21; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ iso: toISODate(d), date: d });
    }
    return out;
  }, [selectedIso]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !activeRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedIso]);

  return (
    <div
      ref={containerRef}
      className="filters-scroll flex gap-2 pb-8 px-5"
      style={{
        gap: "var(--space-xs)",
        paddingBottom: "var(--space-lg)",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
        scrollSnapType: "x mandatory",
      }}
      aria-label="Choose date"
    >
      {days.map(({ iso, date }) => {
        const isSelected = iso === selectedIso;
        const label = formatPill(date);
        return (
          <button
            key={iso}
            ref={isSelected ? activeRef : null}
            type="button"
            onClick={() => router.push(buildUrl(iso, currentLeague))}
            className="rounded-full font-mono text-[11px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0"
            style={{
              scrollSnapAlign: "center",
              padding: "10px 14px",
              background: isSelected ? "var(--bg-accent)" : "transparent",
              color: isSelected ? "var(--text-on-accent)" : "var(--text-main)",
              border: isSelected ? "none" : "1px solid var(--border-light)",
              lineHeight: 1.1,
              minWidth: 72,
            }}
          >
            <div className="text-tertiary" style={{ color: isSelected ? "var(--text-on-accent)/75" : "var(--text-tertiary)" }}>
              {label.top}
            </div>
            <div style={{ marginTop: 2 }}>{label.bottom}</div>
          </button>
        );
      })}
    </div>
  );
}

