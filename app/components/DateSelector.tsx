"use client";

import { useRouter } from "next/navigation";

export type DateRange = "today" | "tomorrow" | "week";

const OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This Week" },
];

function buildUrl(range: DateRange): string {
  if (range === "today") return "/matches";
  return `/matches?range=${range}`;
}

export function DateSelector({
  currentRange,
}: {
  currentRange: DateRange;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center" style={{ gap: "var(--space-xs)" }}>
      {OPTIONS.map((opt) => {
        const isActive = opt.value === currentRange;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => router.push(buildUrl(opt.value))}
            className="font-mono text-[12px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0 hover:bg-[var(--bg-surface)]"
            style={{
              padding: "8px 12px",
              background: isActive ? "var(--bg-accent)" : "transparent",
              color: isActive ? "var(--text-on-accent)" : "var(--text-main)",
              border: isActive ? "none" : "1px solid var(--border-light)",
              lineHeight: 1.1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
