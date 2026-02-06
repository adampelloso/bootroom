"use client";

const TABS = [
  { id: "goals", label: "GOALS", targetId: "section-total-goals" },
  { id: "corners", label: "CORNERS", targetId: "section-total-corners" },
  { id: "player-props", label: "PLAYER PROPS", targetId: "section-player-props" },
] as const;

/**
 * Tab row for match detail: scrolls to Total goals, Corners, or Player props (five trust markets).
 */
export function DetailTabs() {
  const handleClick = (targetId: string) => {
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
          className="px-3 py-1.5 text-mono text-[11px] uppercase text-tertiary hover:text-[var(--text-sec)] border-b-2 border-transparent hover:border-b-[var(--text-tertiary)]"
          onClick={() => handleClick(targetId)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
