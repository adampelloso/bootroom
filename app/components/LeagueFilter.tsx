"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LEAGUE_ID,
  SUPPORTED_COMPETITIONS,
  type LeagueFilterValue,
} from "@/lib/leagues";

function leagueLabel(value: LeagueFilterValue): string {
  if (value === "all") return "All competitions";
  const id = Number(value);
  const found = SUPPORTED_COMPETITIONS.find((c) => c.id === id);
  return found?.label ?? `League ${value}`;
}

function buildUrl(date: string, league: LeagueFilterValue): string {
  const sp = new URLSearchParams();
  sp.set("date", date);
  sp.set("league", league);
  return `/feed?${sp.toString()}`;
}

export function LeagueFilterPill({
  currentDate,
  currentLeague,
}: {
  currentDate: string;
  currentLeague?: LeagueFilterValue;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const league = currentLeague ?? (`${DEFAULT_LEAGUE_ID}` as LeagueFilterValue);

  const items = useMemo(() => {
    const base: Array<{ value: LeagueFilterValue; label: string }> = [
      { value: "all", label: "All competitions" },
      ...SUPPORTED_COMPETITIONS.map((c) => ({
        value: `${c.id}` as LeagueFilterValue,
        label: c.label,
      })),
    ];
    return base;
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 border border-[var(--border-light)] px-3 py-2 text-mono font-medium stat-value"
        style={{ fontSize: "14px", background: "var(--bg-body)" }}
      >
        <span className="truncate max-w-[140px]">{leagueLabel(league).toUpperCase()}</span>
        <span className="text-tertiary" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[99] cursor-default"
            aria-label="Close league menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 z-[100] w-56 border border-[var(--border-light)] bg-[var(--bg-body)] overflow-hidden"
          >
            {items.map((it) => {
              const selected = it.value === league;
              return (
                <button
                  key={it.value}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(buildUrl(currentDate, it.value));
                  }}
                  className="w-full text-left px-4 py-3 text-[13px] flex items-center justify-between hover:bg-[var(--bg-surface)]"
                >
                  <span className="font-medium">{it.label}</span>
                  {selected ? (
                    <span className="text-mono text-[11px] uppercase text-tertiary">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
