"use client";

const TABS = [
  { id: "all", label: "ALL", targetId: "section-snapshot" },
  { id: "goals", label: "GOALS", targetId: "chart-total-goals" },
  { id: "corners", label: "CORNERS", targetId: "chart-total-corners" },
  { id: "shots", label: "SHOTS", targetId: "section-deep-stats" },
] as const;

/**
 * Tab row for match detail: scrolls to Snapshot, Goals chart, Corners chart, or Deep Stats.
 * SHOTS sets hash to #section-deep-stats so Deep Stats accordion opens.
 */
export function DetailTabs() {
  const handleClick = (targetId: string, id: string) => {
    if (id === "shots") {
      window.location.hash = "section-deep-stats";
    }
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="flex items-center gap-1 px-5 py-2 border-b border-[var(--border-light)] bg-[var(--bg-body)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      role="tablist"
      aria-label="Section navigation"
    >
      {TABS.map(({ id, label, targetId }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="px-3 py-1.5 text-mono text-[11px] uppercase text-tertiary hover:text-[var(--text-sec)] border border-transparent hover:border-[var(--border-light)] rounded"
          onClick={() => handleClick(targetId, id)}
        >
          {label}
        </button>
      ))}
      <span className="px-3 py-1.5 text-mono text-[11px] uppercase text-tertiary/50 cursor-not-allowed">
        PLAYER PROPS
      </span>
    </div>
  );
}
