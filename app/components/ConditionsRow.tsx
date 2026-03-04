"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterSheet } from "./FilterSheet";

export type VenueCondition = "Home" | "Away" | "Combined";
export type SampleCondition = "L5" | "L10" | "Season";
export type TimeCondition = "Full";

const VENUE_OPTIONS: Array<{ key: VenueCondition; label: string }> = [
  { key: "Home", label: "Home" },
  { key: "Away", label: "Away" },
  { key: "Combined", label: "Combined" },
];

const SAMPLE_OPTIONS: Array<{ key: SampleCondition; label: string }> = [
  { key: "L5", label: "L5" },
  { key: "L10", label: "L10" },
  { key: "Season", label: "Season" },
];

export function ConditionsRow({
  venue,
  sample,
  time,
}: {
  venue: VenueCondition;
  sample: SampleCondition;
  time: TimeCondition;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildUrl = (updates: { venue?: VenueCondition; sample?: SampleCondition; time?: TimeCondition }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (updates.venue != null) sp.set("venue", updates.venue);
    if (updates.sample != null) sp.set("sample", updates.sample);
    if (updates.time != null) sp.set("time", updates.time);
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <>
      {/* Mobile: bottom sheet trigger */}
      <div
        className="sm:hidden border-b border-[var(--border-light)] pb-3"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <FilterSheet venue={venue} sample={sample} time={time} />
      </div>

      {/* Desktop: inline row */}
      <div
        className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2 text-mono text-[12px] uppercase text-tertiary border-b border-[var(--border-light)] pb-3"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        role="group"
        aria-label="Filter by venue, sample, and time"
      >
        <span className="text-tertiary/80">Venue:</span>
        <div className="flex gap-1">
          {VENUE_OPTIONS.map((opt) => {
            const isSelected = venue === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => router.push(buildUrl({ venue: opt.key }), { scroll: false })}
                className="rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: isSelected ? "var(--bg-accent)" : "transparent",
                  color: isSelected ? "var(--text-on-accent)" : "var(--text-tertiary)",
                  border: isSelected ? "none" : "1px solid var(--border-light)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="text-tertiary/80 ml-1">Sample:</span>
        <div className="flex gap-1">
          {SAMPLE_OPTIONS.map((opt) => {
            const isSelected = sample === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => router.push(buildUrl({ sample: opt.key }), { scroll: false })}
                className="rounded-full px-2.5 py-1 transition-colors"
                style={{
                  background: isSelected ? "var(--bg-accent)" : "transparent",
                  color: isSelected ? "var(--text-on-accent)" : "var(--text-tertiary)",
                  border: isSelected ? "none" : "1px solid var(--border-light)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="text-tertiary/80 ml-1">Time:</span>
        <div className="flex gap-1">
          <span
            className="rounded-full px-2.5 py-1 bg-[var(--bg-accent)] text-[var(--text-on-accent)]"
            aria-label="Full match only"
          >
            Full
          </span>
        </div>
      </div>
    </>
  );
}
