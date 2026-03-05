"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export type TabId = "overview" | "goals" | "shots" | "corners" | "cards" | "h2h" | "players" | "value" | "simulation";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "OVERVIEW" },
  { id: "goals", label: "GOALS" },
  { id: "shots", label: "SHOTS" },
  { id: "corners", label: "CORNERS" },
  { id: "cards", label: "CARDS" },
  { id: "h2h", label: "H2H" },
  { id: "players", label: "PLAYERS" },
  { id: "value", label: "VALUE" },
  { id: "simulation", label: "SIMULATION" },
];

type Props = {
  activeTab: TabId;
  hasSimData: boolean;
  hasH2H?: boolean;
};

export function MatchPillNav({ activeTab, hasSimData, hasH2H }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(tabId: TabId): string {
    const sp = new URLSearchParams();
    // Preserve form param across tabs
    const form = searchParams.get("form");
    if (form) sp.set("form", form);
    if (tabId !== "overview") sp.set("tab", tabId);
    const q = sp.toString();
    return `${pathname}${q ? `?${q}` : ""}`;
  }

  const visibleTabs = TABS.filter((t) => {
    if (t.id === "simulation" && !hasSimData) return false;
    if (t.id === "h2h" && !hasH2H) return false;
    if (t.id === "value") return false;
    return true;
  });

  return (
    <nav
      className="pill-nav flex px-5 py-0 bg-[var(--bg-panel)] sticky top-0 z-20"
      style={{
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
        gap: "0",
      }}
      aria-label="Match sections"
    >
      {visibleTabs.map(({ id, label }) => {
        const isActive = id === activeTab;
        return (
          <Link
            key={id}
            href={buildHref(id)}
            scroll={false}
            className="font-mono text-[12px] uppercase whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0"
            style={{
              padding: "12px 14px",
              background: "transparent",
              color: isActive ? "var(--text-main)" : "var(--text-tertiary)",
              borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
              lineHeight: 1.1,
            }}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
