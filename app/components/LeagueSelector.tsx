"use client";

import { useState } from "react";

interface LeagueOption {
  id: number;
  label: string;
  group: string;
}

const LEAGUE_GROUPS: { name: string; leagues: { id: number; label: string }[] }[] = [
  {
    name: "Big 5",
    leagues: [
      { id: 39, label: "EPL" },
      { id: 78, label: "Bundesliga" },
      { id: 135, label: "Serie A" },
      { id: 140, label: "La Liga" },
      { id: 61, label: "Ligue 1" },
    ],
  },
  {
    name: "European Cups",
    leagues: [
      { id: 2, label: "UCL" },
      { id: 3, label: "UEL" },
      { id: 848, label: "UECL" },
    ],
  },
  {
    name: "Domestic Cups",
    leagues: [
      { id: 48, label: "FA Cup" },
      { id: 45, label: "EFL Cup" },
      { id: 137, label: "Coppa Italia" },
      { id: 143, label: "Copa del Rey" },
      { id: 66, label: "Coupe de France" },
      { id: 81, label: "DFB-Pokal" },
    ],
  },
  {
    name: "Europe",
    leagues: [
      { id: 88, label: "Eredivisie" },
      { id: 94, label: "Liga Portugal" },
      { id: 144, label: "Belgian Pro League" },
      { id: 203, label: "Süper Lig" },
      { id: 179, label: "Scottish Prem" },
      { id: 218, label: "Austrian BL" },
      { id: 207, label: "Swiss Super League" },
      { id: 119, label: "Superliga DK" },
      { id: 197, label: "Super League GR" },
      { id: 210, label: "HNL" },
      { id: 103, label: "Eliteserien" },
      { id: 113, label: "Allsvenskan" },
      { id: 106, label: "Ekstraklasa" },
      { id: 345, label: "Czech Liga" },
    ],
  },
  {
    name: "Americas",
    leagues: [
      { id: 253, label: "MLS" },
      { id: 262, label: "Liga MX" },
      { id: 71, label: "Série A BR" },
      { id: 128, label: "Liga Profesional" },
    ],
  },
  {
    name: "Asia / Middle East",
    leagues: [
      { id: 307, label: "Saudi Pro" },
      { id: 98, label: "J-League" },
      { id: 292, label: "K-League 1" },
      { id: 188, label: "A-League" },
    ],
  },
  {
    name: "Second Tier",
    leagues: [
      { id: 40, label: "Championship" },
      { id: 41, label: "League One" },
      { id: 42, label: "League Two" },
      { id: 136, label: "Serie B" },
      { id: 79, label: "2. Bundesliga" },
      { id: 141, label: "Segunda Div." },
      { id: 62, label: "Ligue 2" },
    ],
  },
];

const ALL_IDS = LEAGUE_GROUPS.flatMap((g) => g.leagues.map((l) => l.id));

function parseCookie(): Set<number> {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("followed_leagues="))
    ?.split("=")[1];
  if (!raw) return new Set(ALL_IDS);
  const ids = raw.split(",").map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  return ids.length > 0 ? new Set(ids) : new Set(ALL_IDS);
}

function saveCookie(ids: Set<number>) {
  document.cookie = `followed_leagues=${[...ids].join(",")};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function LeagueSelector() {
  const [selected, setSelected] = useState<Set<number>>(() => parseCookie());

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
    saveCookie(next);
  };

  const toggleGroup = (groupLeagues: { id: number }[]) => {
    const ids = groupLeagues.map((l) => l.id);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    for (const id of ids) {
      if (allSelected) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    setSelected(next);
    saveCookie(next);
  };

  const selectAll = () => {
    const next = new Set(ALL_IDS);
    setSelected(next);
    saveCookie(next);
  };

  const selectNone = () => {
    const next = new Set<number>();
    setSelected(next);
    saveCookie(next);
  };

  return (
    <div>
      <div className="flex gap-2" style={{ marginBottom: "var(--space-md)" }}>
        <button
          type="button"
          onClick={selectAll}
          className="font-mono uppercase"
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            color: "var(--text-sec)",
            cursor: "pointer",
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="font-mono uppercase"
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            color: "var(--text-sec)",
            cursor: "pointer",
          }}
        >
          None
        </button>
      </div>

      {LEAGUE_GROUPS.map((group) => {
        const allSelected = group.leagues.every((l) => selected.has(l.id));
        return (
          <div key={group.name} style={{ marginBottom: "var(--space-md)" }}>
            <button
              type="button"
              onClick={() => toggleGroup(group.leagues)}
              className="font-mono uppercase"
              style={{
                fontSize: "11px",
                letterSpacing: "0.05em",
                color: allSelected ? "var(--text-main)" : "var(--text-tertiary)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                marginBottom: "var(--space-xs)",
              }}
            >
              {group.name}
            </button>
            <div className="flex flex-wrap" style={{ gap: "6px" }}>
              {group.leagues.map((league) => {
                const on = selected.has(league.id);
                return (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => toggle(league.id)}
                    className="font-mono"
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      background: on ? "var(--text-main)" : "var(--bg-surface)",
                      color: on ? "var(--bg-body)" : "var(--text-tertiary)",
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    {league.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
