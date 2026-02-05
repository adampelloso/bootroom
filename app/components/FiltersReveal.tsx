"use client";

import { useState } from "react";
import { CategoryScrubber } from "@/app/components/CategoryScrubber";
import { ConditionsRow } from "@/app/components/ConditionsRow";
import type { InsightFamily } from "@/lib/insights/catalog";

type VenueCondition = "Home" | "Away" | "Combined";

type Props = {
  currentCategory: InsightFamily | "all";
  venue: VenueCondition;
  sample: "L5" | "L10" | "Season";
};

/**
 * Filters are hidden on initial load. User reveals them by clicking "Show filters".
 */
export function FiltersReveal({ currentCategory, venue, sample }: Props) {
  const [showFilters, setShowFilters] = useState(false);

  if (!showFilters) {
    return (
      <div
        className="px-5 py-2 border-t border-[var(--border-light)]"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="text-mono text-[11px] uppercase text-tertiary hover:text-[var(--text-sec)] transition-colors"
        >
          Show filters
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border-light)]">
      <CategoryScrubber currentCategory={currentCategory} />
      <ConditionsRow venue={venue} sample={sample} time="Full" />
    </div>
  );
}
