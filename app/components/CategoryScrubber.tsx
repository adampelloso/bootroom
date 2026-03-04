"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { InsightFamily } from "@/lib/insights/catalog";

const CATEGORIES: Array<{ key: InsightFamily | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "Goals", label: "Goals" },
  { key: "Control", label: "Shots" },
  { key: "Corners", label: "Corners" },
  { key: "Players", label: "Player Props" },
  { key: "Timing", label: "Timing" },
];

export function CategoryScrubber({
  currentCategory,
}: {
  currentCategory?: InsightFamily | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = currentCategory ?? (searchParams.get("category") as InsightFamily | "all") ?? "all";

  const buildUrl = (cat: InsightFamily | "all") => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("category", cat);
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <div
      className="filters-scroll flex gap-2 pb-8 px-5"
      style={{
        gap: "var(--space-xs)",
        paddingBottom: "var(--space-lg)",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
        scrollSnapType: "x mandatory",
      }}
      aria-label="Choose category"
    >
      {CATEGORIES.map((cat) => {
        const isSelected = cat.key === category;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => router.push(buildUrl(cat.key), { scroll: false })}
            className="rounded-full font-mono text-[12px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0"
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
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
