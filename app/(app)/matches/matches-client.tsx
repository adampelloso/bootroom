"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { MatchCard } from "@/app/components/MatchCard";
import { EdgeBadge, getBestEdge } from "@/app/components/EdgeBadge";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import type { FeedMatch, FormResult } from "@/lib/feed";

const STORAGE_KEYS = {
  leagues: "br_matches_leagues",
  sort: "br_matches_sort",
  view: "br_matches_view",
  date: "br_matches_date",
} as const;

type DateRange = "today" | "tomorrow" | "week";
type BaseSort = "league" | "kickoff" | "edge";
type ViewMode = "card" | "table";
type ColumnSortKey =
  | "league"
  | "kickoff"
  | "xgHome"
  | "xgAway"
  | "xgTotal"
  | "over25"
  | "btts"
  | "edge";
type TableSort = { key: ColumnSortKey; direction: "asc" | "desc" };

type Props = {
  initialFollowedLeagueIds: number[];
};

type FeedResponse = {
  matches: FeedMatch[];
};

type LeagueOption = {
  id: number;
  name: string;
  matchCount: number;
};

type LeagueGroup = {
  leagueId: number;
  leagueName: string;
  matches: FeedMatch[];
  bestEdge: ReturnType<typeof getBestEdge>;
};

const SORT_LABEL: Record<BaseSort, string> = {
  league: "By League",
  kickoff: "By Kickoff",
  edge: "By Edge",
};

const LEAGUE_PRIORITY_BY_ID: Record<number, number> = {
  39: 1,
  140: 2,
  135: 3,
  78: 4,
  61: 5,
  40: 6,
  79: 7,
  136: 8,
  62: 9,
  88: 10,
  94: 11,
  144: 12,
  179: 13,
  203: 14,
  45: 15,
  48: 15,
  137: 15,
  143: 15,
  66: 15,
  81: 15,
  307: 16,
  253: 17,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const today = isoDate(now);
  if (range === "today") return { from: today, to: today };

  if (range === "tomorrow") {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const date = isoDate(tmrw);
    return { from: date, to: date };
  }

  const end = new Date(now);
  end.setDate(end.getDate() + 6);
  return { from: today, to: isoDate(end) };
}

function parseStoredDate(v: string | null): DateRange {
  if (v === "today" || v === "tomorrow" || v === "week") return v;
  return "today";
}

function parseStoredSort(v: string | null): BaseSort {
  if (v === "league" || v === "kickoff" || v === "edge") return v;
  return "league";
}

function parseStoredView(v: string | null): ViewMode {
  if (v === "card" || v === "table") return v;
  return "card";
}

function formatKickoffLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getLeagueName(match: FeedMatch): string {
  return match.leagueName ?? "Unknown League";
}

function leaguePriority(match: FeedMatch): number {
  if (match.leagueId != null && LEAGUE_PRIORITY_BY_ID[match.leagueId] != null) {
    return LEAGUE_PRIORITY_BY_ID[match.leagueId];
  }
  const normalized = getLeagueName(match).toLowerCase();
  if (normalized.includes("premier") && normalized.includes("league")) return 1;
  if (normalized.includes("la liga")) return 2;
  if (normalized.includes("serie a")) return 3;
  if (normalized.includes("bundesliga") && !normalized.includes("2")) return 4;
  if (normalized.includes("ligue 1")) return 5;
  if (normalized.includes("championship")) return 6;
  if (normalized.includes("2. bundesliga") || normalized.includes("2 bundesliga")) return 7;
  if (normalized.includes("serie b")) return 8;
  if (normalized.includes("ligue 2")) return 9;
  if (normalized.includes("eredivisie")) return 10;
  if (normalized.includes("portugal")) return 11;
  if (normalized.includes("belgian")) return 12;
  if (normalized.includes("scottish")) return 13;
  if (normalized.includes("super lig")) return 14;
  if (normalized.includes("cup")) return 15;
  if (normalized.includes("saudi")) return 16;
  if (normalized.includes("mls")) return 17;
  return 999;
}

function byLeagueThenKickoff(a: FeedMatch, b: FeedMatch): number {
  const p = leaguePriority(a) - leaguePriority(b);
  if (p !== 0) return p;
  const leagueCmp = getLeagueName(a).localeCompare(getLeagueName(b));
  if (leagueCmp !== 0) return leagueCmp;
  return a.kickoffUtc.localeCompare(b.kickoffUtc);
}

function byKickoffAsc(a: FeedMatch, b: FeedMatch): number {
  return a.kickoffUtc.localeCompare(b.kickoffUtc);
}

function bestEdgeValue(match: FeedMatch): number {
  const best = getBestEdge(match.modelProbs);
  return best?.edge ?? Number.NEGATIVE_INFINITY;
}

function byEdgeDesc(a: FeedMatch, b: FeedMatch): number {
  const edgeDiff = bestEdgeValue(b) - bestEdgeValue(a);
  if (edgeDiff !== 0) return edgeDiff;
  return a.kickoffUtc.localeCompare(b.kickoffUtc);
}

function getOver25(match: FeedMatch): number | null {
  if (match.modelProbs?.mcOver25 != null) return match.modelProbs.mcOver25;
  if (match.modelProbs?.over_2_5 != null) return match.modelProbs.over_2_5;
  const row = match.marketRows.find((r) => r.market === "O2.5");
  return row ? row.combinedHits / 10 : null;
}

function getBtts(match: FeedMatch): number | null {
  if (match.modelProbs?.btts != null) return match.modelProbs.btts;
  if (match.modelProbs?.mcBtts != null) return match.modelProbs.mcBtts;
  const row = match.marketRows.find((r) => r.market === "BTTS");
  return row ? row.combinedHits / 10 : null;
}

function getTierLabel(match: FeedMatch): "HIGH" | "MED" | "SPEC" | null {
  const tier = match.edgeSummary?.tier;
  if (tier === "HIGH") return "HIGH";
  if (tier === "MEDIUM") return "MED";
  if (tier === "SPECULATIVE") return "SPEC";
  return null;
}

function tierStyle(label: "HIGH" | "MED" | "SPEC"): { bg: string; text: string } {
  if (label === "HIGH") return { bg: "#16A34A", text: "#F8FAFC" };
  if (label === "MED") return { bg: "#2563EB", text: "#F8FAFC" };
  return { bg: "#D97706", text: "#111827" };
}

function pctText(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}

function pctColor(v: number | null): { bg: string; text: string } | null {
  if (v == null) return null;
  const pct = Math.round(v * 100);
  if (pct >= 65) return { bg: "#16A34A", text: "#F8FAFC" };
  if (pct >= 50) return { bg: "#D97706", text: "#111827" };
  return { bg: "#DC2626", text: "#F8FAFC" };
}

function formDots(form: FormResult[] | undefined, reverse = false) {
  const values = (form ?? []).slice(-5);
  const ordered = reverse ? [...values].reverse() : values;
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {ordered.map((r, i) => (
        <span
          key={`${r}-${i}`}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor:
              r === "W" ? "var(--color-edge-strong)" : r === "D" ? "var(--text-tertiary)" : "#EF4444",
          }}
        />
      ))}
    </div>
  );
}

function getLeagueHeaderStats(matches: FeedMatch[]): { matchCount: number; bestEdge: ReturnType<typeof getBestEdge> } {
  let best: ReturnType<typeof getBestEdge> = null;
  for (const match of matches) {
    const edge = getBestEdge(match.modelProbs);
    if (!edge) continue;
    if (!best || edge.edge > best.edge) best = edge;
  }
  return { matchCount: matches.length, bestEdge: best };
}

function LeagueSectionHeader({
  leagueName,
  matchCount,
  bestEdge,
}: {
  leagueName: string;
  matchCount: number;
  bestEdge: ReturnType<typeof getBestEdge>;
}) {
  return (
    <div className="col-span-full" style={{ marginTop: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
      <div className="flex items-center gap-2 text-mono text-[12px] uppercase" style={{ color: "var(--text-tertiary)" }}>
        <span className="font-bold" style={{ color: "var(--text-main)" }}>{leagueName.toUpperCase()}</span>
        <span>- {matchCount} {matchCount === 1 ? "match" : "matches"}</span>
        {bestEdge && (
          <span style={{ color: "var(--color-edge-strong)" }}>
            - Best: {bestEdge.market.toUpperCase()} {bestEdge.edge > 0 ? "+" : ""}
            {(bestEdge.edge * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="w-full" style={{ borderBottom: "1px solid var(--border-light)", marginTop: "6px" }} />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function LeagueDropdown({
  leagues,
  selected,
  onToggleLeague,
  onToggleAll,
}: {
  leagues: LeagueOption[];
  selected: Set<number>;
  onToggleLeague: (id: number) => void;
  onToggleAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const selectedCount = leagues.filter((l) => selected.has(l.id)).length;
  const allSelected = leagues.length > 0 && selectedCount === leagues.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selectedLeagues = leagues.filter((l) => selected.has(l.id));
  let label = "All Leagues";
  if (!allSelected) {
    if (selectedLeagues.length === 1) label = selectedLeagues[0].name;
    else if (selectedLeagues.length >= 2 && selectedLeagues.length <= 4) {
      label = selectedLeagues.map((l) => l.name).join(", ");
    } else if (selectedLeagues.length >= 5) {
      label = `${selectedLeagues.length} Leagues`;
    } else {
      label = "No Leagues";
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[12px] uppercase"
        style={{
          padding: "8px 10px",
          border: "1px solid var(--border-light)",
          background: "var(--bg-panel)",
          color: "var(--text-main)",
        }}
      >
        {label} v
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 z-30"
          style={{
            minWidth: "260px",
            maxHeight: "300px",
            overflowY: "auto",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <label
            className="flex items-center gap-2 text-[12px] font-mono uppercase px-3 py-2"
            style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-main)" }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={onToggleAll}
            />
            All Leagues
          </label>

          {leagues.map((league) => (
            <label
              key={league.id}
              className="flex items-center justify-between gap-2 text-[12px] font-mono uppercase px-3 py-2"
              style={{ color: "var(--text-main)" }}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(league.id)}
                  onChange={() => onToggleLeague(league.id)}
                />
                {league.name}
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>{league.matchCount}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SimpleDropdown<T extends string>({
  value,
  options,
  onChange,
  prefix,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  prefix?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="font-mono text-[12px] uppercase"
      style={{
        padding: "8px 10px",
        border: "1px solid var(--border-light)",
        background: "var(--bg-panel)",
        color: "var(--text-main)",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {prefix ? `${prefix}: ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Card view"
        onClick={() => onChange("card")}
        style={{
          width: 34,
          height: 30,
          border: "1px solid var(--border-light)",
          background: view === "card" ? "var(--bg-surface)" : "transparent",
          color: view === "card" ? "var(--text-main)" : "var(--text-tertiary)",
        }}
      >
        Card
      </button>
      <button
        type="button"
        aria-label="Table view"
        onClick={() => onChange("table")}
        style={{
          width: 34,
          height: 30,
          border: "1px solid var(--border-light)",
          background: view === "table" ? "var(--bg-surface)" : "transparent",
          color: view === "table" ? "var(--text-main)" : "var(--text-tertiary)",
        }}
      >
        Table
      </button>
    </div>
  );
}

function MobileSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-50"
        style={{
          background: "var(--bg-panel)",
          borderTop: "1px solid var(--border-light)",
          padding: "var(--space-md)",
          paddingBottom: "max(var(--space-lg), env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[12px] uppercase" style={{ color: "var(--text-main)" }}>
            {title}
          </span>
          <button type="button" onClick={onClose} className="text-[18px]" style={{ color: "var(--text-tertiary)" }}>
            x
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

function FilterBar({
  leagues,
  selectedLeagueIds,
  date,
  sortLabel,
  sortValue,
  view,
  onLeagueToggle,
  onLeagueToggleAll,
  onDateChange,
  onSortChange,
  onViewChange,
  desktop,
  onOpenMobileFilters,
  onOpenMobileSort,
}: {
  leagues: LeagueOption[];
  selectedLeagueIds: Set<number>;
  date: DateRange;
  sortLabel: string;
  sortValue: BaseSort | "custom";
  view: ViewMode;
  onLeagueToggle: (id: number) => void;
  onLeagueToggleAll: () => void;
  onDateChange: (d: DateRange) => void;
  onSortChange: (s: BaseSort) => void;
  onViewChange: (v: ViewMode) => void;
  desktop: boolean;
  onOpenMobileFilters: () => void;
  onOpenMobileSort: () => void;
}) {
  if (!desktop) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenMobileFilters}
          aria-label="Open filters"
          className="font-mono text-[12px] uppercase px-3 py-2"
          style={{ border: "1px solid var(--border-light)", color: "var(--text-main)" }}
        >
          Filters
        </button>
        <button
          type="button"
          onClick={onOpenMobileSort}
          aria-label="Open sort"
          className="font-mono text-[12px] uppercase px-3 py-2"
          style={{ border: "1px solid var(--border-light)", color: "var(--text-main)" }}
        >
          Sort
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between"
      style={{
        gap: "var(--space-sm)",
        paddingTop: "var(--space-sm)",
        paddingBottom: "var(--space-sm)",
        borderTop: "1px solid var(--border-light)",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      <div className="flex items-center gap-2">
        <LeagueDropdown
          leagues={leagues}
          selected={selectedLeagueIds}
          onToggleLeague={onLeagueToggle}
          onToggleAll={onLeagueToggleAll}
        />
        <SimpleDropdown<DateRange>
          value={date}
          options={[
            { value: "today", label: "Today" },
            { value: "tomorrow", label: "Tomorrow" },
            { value: "week", label: "This Week" },
          ]}
          onChange={onDateChange}
        />
        <SimpleDropdown<BaseSort | "custom">
          value={sortValue}
          options={[
            { value: "league", label: "By League" },
            { value: "kickoff", label: "By Kickoff" },
            { value: "edge", label: "By Edge" },
            ...(sortValue === "custom" ? [{ value: "custom" as const, label: "Custom" }] : []),
          ]}
          onChange={(v) => {
            if (v !== "custom") onSortChange(v);
          }}
          prefix="Sort"
        />
        {sortValue === "custom" && (
          <span className="font-mono text-[11px] uppercase" style={{ color: "var(--text-tertiary)" }}>
            {sortLabel}
          </span>
        )}
      </div>
      <ViewToggle view={view} onChange={onViewChange} />
    </div>
  );
}

function sortMatchesForTable(matches: FeedMatch[], tableSort: TableSort): FeedMatch[] {
  const rows = [...matches];
  rows.sort((a, b) => {
    let diff = 0;
    switch (tableSort.key) {
      case "league": {
        const league = getLeagueName(a).localeCompare(getLeagueName(b));
        diff = league === 0 ? a.kickoffUtc.localeCompare(b.kickoffUtc) : league;
        break;
      }
      case "kickoff":
        diff = a.kickoffUtc.localeCompare(b.kickoffUtc);
        break;
      case "xgHome":
        diff = (a.modelProbs?.expectedHomeGoals ?? -1) - (b.modelProbs?.expectedHomeGoals ?? -1);
        break;
      case "xgAway":
        diff = (a.modelProbs?.expectedAwayGoals ?? -1) - (b.modelProbs?.expectedAwayGoals ?? -1);
        break;
      case "xgTotal":
        diff =
          (a.modelProbs?.expectedHomeGoals ?? -1) +
          (a.modelProbs?.expectedAwayGoals ?? -1) -
          ((b.modelProbs?.expectedHomeGoals ?? -1) + (b.modelProbs?.expectedAwayGoals ?? -1));
        break;
      case "over25":
        diff = (getOver25(a) ?? -1) - (getOver25(b) ?? -1);
        break;
      case "btts":
        diff = (getBtts(a) ?? -1) - (getBtts(b) ?? -1);
        break;
      case "edge":
        diff = bestEdgeValue(a) - bestEdgeValue(b);
        break;
      default:
        diff = 0;
    }

    if (tableSort.direction === "asc") return diff;
    return -diff;
  });
  return rows;
}

function groupByLeague(matches: FeedMatch[]): LeagueGroup[] {
  const grouped = new Map<string, FeedMatch[]>();
  for (const match of matches) {
    const key = `${match.leagueId ?? -1}::${getLeagueName(match)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }

  return Array.from(grouped.entries())
    .map(([key, groupMatches]) => {
      const [rawLeagueId, leagueName] = key.split("::");
      const { bestEdge } = getLeagueHeaderStats(groupMatches);
      return {
        leagueId: Number(rawLeagueId),
        leagueName,
        matches: [...groupMatches].sort(byKickoffAsc),
        bestEdge,
      };
    })
    .sort((a, b) => {
      const matchA = a.matches[0];
      const matchB = b.matches[0];
      return byLeagueThenKickoff(matchA, matchB);
    });
}

function MatchTable({
  matches,
  groupByLeagueMode,
  tableSort,
  onSortClick,
}: {
  matches: FeedMatch[];
  groupByLeagueMode: boolean;
  tableSort: TableSort;
  onSortClick: (key: ColumnSortKey) => void;
}) {
  const router = useRouter();
  const rows = useMemo(() => sortMatchesForTable(matches, tableSort), [matches, tableSort]);
  const groups = useMemo(() => (groupByLeagueMode ? groupByLeague(rows) : []), [rows, groupByLeagueMode]);

  function SortHeader({ keyName, label }: { keyName: ColumnSortKey; label: string }) {
    const active = tableSort.key === keyName;
    const arrow = !active ? "" : tableSort.direction === "asc" ? " ^" : " v";
    return (
      <button
        type="button"
        onClick={() => onSortClick(keyName)}
        className="font-semibold uppercase"
        style={{ color: active ? "var(--text-main)" : "var(--text-tertiary)" }}
      >
        {label}
        {arrow}
      </button>
    );
  }

  const renderRow = (match: FeedMatch) => {
    const o25 = getOver25(match);
    const btts = getBtts(match);
    const bestEdge = getBestEdge(match.modelProbs);
    const tier = getTierLabel(match);
    const o25Style = pctColor(o25);
    const bttsStyle = pctColor(btts);
    return (
      <tr
        key={match.id}
        className="cursor-pointer"
        style={{ borderBottom: "1px solid var(--border-light)", background: "transparent" }}
        onClick={() => router.push(`/match/${match.providerFixtureId}`)}
      >
          <td className="py-2 px-2">
            <div className="flex items-center gap-2 min-w-[180px]">
              <img src={match.homeTeamLogo} alt="" className="w-4 h-4 object-contain" width={16} height={16} />
              <span className="text-[12px] uppercase font-semibold" style={{ color: "var(--text-main)" }}>
                {match.homeTeamCode ?? match.homeTeamName}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>v</span>
              <span className="text-[12px] uppercase font-semibold" style={{ color: "var(--text-main)" }}>
                {match.awayTeamCode ?? match.awayTeamName}
              </span>
              <img src={match.awayTeamLogo} alt="" className="w-4 h-4 object-contain" width={16} height={16} />
            </div>
          </td>
          {!groupByLeagueMode && (
            <td className="py-2 px-2 text-[12px] uppercase" style={{ color: "var(--text-sec)" }}>
              {getLeagueName(match)}
            </td>
          )}
          <td className="py-2 px-2 text-[12px] font-mono" style={{ color: "var(--text-main)" }}>
            {formatKickoffLocal(match.kickoffUtc)}
          </td>
          <td className="py-2 px-2">{formDots(match.homeForm, false)}</td>
          <td className="py-2 px-2">{formDots(match.awayForm, true)}</td>
          <td className="py-2 px-2 text-right text-[12px]" style={{ color: "var(--text-main)" }}>
            {match.modelProbs?.expectedHomeGoals != null ? match.modelProbs.expectedHomeGoals.toFixed(1) : "-"}
          </td>
          <td className="py-2 px-2 text-right text-[12px]" style={{ color: "var(--text-main)" }}>
            {match.modelProbs?.expectedAwayGoals != null ? match.modelProbs.expectedAwayGoals.toFixed(1) : "-"}
          </td>
          <td className="py-2 px-2 text-right text-[12px]" style={{ color: "var(--text-main)" }}>
            {match.modelProbs?.expectedHomeGoals != null && match.modelProbs?.expectedAwayGoals != null
              ? (match.modelProbs.expectedHomeGoals + match.modelProbs.expectedAwayGoals).toFixed(1)
              : "-"}
          </td>
          <td className="py-2 px-2 text-right">
            <span
              className="inline-flex px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: o25Style?.bg ?? "transparent",
                color: o25Style?.text ?? "var(--text-tertiary)",
              }}
            >
              {pctText(o25)}
            </span>
          </td>
          <td className="py-2 px-2 text-right">
            <span
              className="inline-flex px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: bttsStyle?.bg ?? "transparent",
                color: bttsStyle?.text ?? "var(--text-tertiary)",
              }}
            >
              {pctText(btts)}
            </span>
          </td>
          <td className="py-2 px-2 text-right">
            {bestEdge ? <EdgeBadge edge={bestEdge.edge} market={bestEdge.market} variant="badge" /> : null}
          </td>
          <td className="py-2 px-2 text-right">
            {tier ? (
              <span
                className="inline-flex px-2 py-0.5 text-[10px] font-mono font-semibold uppercase"
                style={{ background: tierStyle(tier).bg, color: tierStyle(tier).text }}
              >
                {tier}
              </span>
            ) : null}
          </td>
      </tr>
    );
  };

  return (
    <div style={{ overflowX: "auto", marginTop: "var(--space-sm)" }}>
      <table className="w-full text-[12px] font-mono" style={{ borderCollapse: "collapse", minWidth: groupByLeagueMode ? "1080px" : "1180px" }}>
        <thead>
          <tr style={{ background: "var(--bg-surface)", color: "var(--text-tertiary)" }}>
            <th className="text-left py-2 px-2 font-semibold uppercase">Match</th>
            {!groupByLeagueMode && (
              <th className="text-left py-2 px-2"><SortHeader keyName="league" label="League" /></th>
            )}
            <th className="text-left py-2 px-2"><SortHeader keyName="kickoff" label="Kickoff" /></th>
            <th className="text-left py-2 px-2 font-semibold uppercase">Form (H)</th>
            <th className="text-left py-2 px-2 font-semibold uppercase">Form (A)</th>
            <th className="text-right py-2 px-2"><SortHeader keyName="xgHome" label="xG (H)" /></th>
            <th className="text-right py-2 px-2"><SortHeader keyName="xgAway" label="xG (A)" /></th>
            <th className="text-right py-2 px-2"><SortHeader keyName="xgTotal" label="Total xG" /></th>
            <th className="text-right py-2 px-2"><SortHeader keyName="over25" label="O2.5" /></th>
            <th className="text-right py-2 px-2"><SortHeader keyName="btts" label="BTTS" /></th>
            <th className="text-right py-2 px-2"><SortHeader keyName="edge" label="Best Edge" /></th>
            <th className="text-right py-2 px-2 font-semibold uppercase">Tier</th>
          </tr>
        </thead>
        <tbody>
          {groupByLeagueMode
            ? groups.map((group) => {
                const stats = getLeagueHeaderStats(group.matches);
                return (
                  <Fragment key={`${group.leagueId}-${group.leagueName}`}>
                    <tr style={{ background: "var(--bg-panel)" }}>
                      <td colSpan={11} className="py-2 px-2">
                        <div className="flex items-center gap-2 text-[12px] uppercase" style={{ color: "var(--text-tertiary)" }}>
                          <span className="font-bold" style={{ color: "var(--text-main)" }}>{group.leagueName.toUpperCase()}</span>
                          <span>- {stats.matchCount} {stats.matchCount === 1 ? "match" : "matches"}</span>
                          {stats.bestEdge && (
                            <span style={{ color: "var(--color-edge-strong)" }}>
                              - Best: {stats.bestEdge.market.toUpperCase()} {stats.bestEdge.edge > 0 ? "+" : ""}
                              {(stats.bestEdge.edge * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {group.matches.map((m) => renderRow(m))}
                  </Fragment>
                );
              })
            : rows.map((m) => renderRow(m))}
        </tbody>
      </table>
    </div>
  );
}

export function MatchesClient({ initialFollowedLeagueIds }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isHydrated, setIsHydrated] = useState(false);

  const [date, setDate] = useState<DateRange>("today");
  const [baseSort, setBaseSort] = useState<BaseSort>("league");
  const [view, setView] = useState<ViewMode>("card");
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<Set<number>>(new Set());
  const [tableSort, setTableSort] = useState<TableSort>({ key: "league", direction: "asc" });
  const [sortIsCustom, setSortIsCustom] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  useEffect(() => {
    try {
      setDate(parseStoredDate(localStorage.getItem(STORAGE_KEYS.date)));
      setBaseSort(parseStoredSort(localStorage.getItem(STORAGE_KEYS.sort)));
      setView(parseStoredView(localStorage.getItem(STORAGE_KEYS.view)));
      const rawLeagues = localStorage.getItem(STORAGE_KEYS.leagues);
      if (rawLeagues) {
        const parsed = JSON.parse(rawLeagues) as number[];
        if (Array.isArray(parsed)) {
          setSelectedLeagueIds(new Set(parsed.filter((n) => Number.isFinite(n))));
        }
      }
    } catch {
      // ignore malformed localStorage
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.date, date);
  }, [date, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.sort, baseSort);
  }, [baseSort, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.view, view);
  }, [view, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.leagues, JSON.stringify(Array.from(selectedLeagueIds)));
  }, [selectedLeagueIds, isHydrated]);

  useEffect(() => {
    if (!isDesktop && view === "table") {
      setView("card");
    }
  }, [isDesktop, view]);

  const range = useMemo(() => getDateRange(date), [date]);
  const url = `/api/feed?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&league=all`;
  const { data, loading, error } = useCachedApi<FeedResponse>(url, 60_000);
  const allMatches = data?.matches ?? [];

  const availableLeagues = useMemo<LeagueOption[]>(() => {
    const map = new Map<number, LeagueOption>();
    for (const match of allMatches) {
      if (match.leagueId == null) continue;
      if (!map.has(match.leagueId)) {
        map.set(match.leagueId, { id: match.leagueId, name: getLeagueName(match), matchCount: 0 });
      }
      map.get(match.leagueId)!.matchCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => {
      const matchA = allMatches.find((m) => m.leagueId === a.id) ?? allMatches[0];
      const matchB = allMatches.find((m) => m.leagueId === b.id) ?? allMatches[0];
      if (!matchA || !matchB) return a.name.localeCompare(b.name);
      const p = leaguePriority(matchA) - leaguePriority(matchB);
      if (p !== 0) return p;
      return a.name.localeCompare(b.name);
    });
  }, [allMatches]);

  useEffect(() => {
    if (!isHydrated) return;
    if (availableLeagues.length === 0) return;
    if (selectedLeagueIds.size > 0) return;

    const fromFollowed = initialFollowedLeagueIds.filter((id) => availableLeagues.some((l) => l.id === id));
    const initial = fromFollowed.length > 0 ? fromFollowed : availableLeagues.map((l) => l.id);
    setSelectedLeagueIds(new Set(initial));
  }, [availableLeagues, initialFollowedLeagueIds, isHydrated, selectedLeagueIds.size]);

  const filteredMatches = useMemo(() => {
    if (selectedLeagueIds.size === 0) return [];
    return allMatches.filter((m) => m.leagueId != null && selectedLeagueIds.has(m.leagueId));
  }, [allMatches, selectedLeagueIds]);

  useEffect(() => {
    if (sortIsCustom) return;
    if (baseSort === "league") setTableSort({ key: "league", direction: "asc" });
    if (baseSort === "kickoff") setTableSort({ key: "kickoff", direction: "asc" });
    if (baseSort === "edge") setTableSort({ key: "edge", direction: "desc" });
  }, [baseSort, sortIsCustom]);

  const sortedMatches = useMemo(() => {
    const source = [...filteredMatches];
    if (baseSort === "league") return source.sort(byLeagueThenKickoff);
    if (baseSort === "kickoff") return source.sort(byKickoffAsc);
    return source.sort(byEdgeDesc);
  }, [filteredMatches, baseSort]);

  const grouped = useMemo(() => (baseSort === "league" ? groupByLeague(sortedMatches) : []), [baseSort, sortedMatches]);

  function setAllLeagues() {
    const all = availableLeagues.map((l) => l.id);
    setSelectedLeagueIds(new Set(all));
    localStorage.setItem(STORAGE_KEYS.leagues, JSON.stringify(all));
  }

  function toggleAllLeagues() {
    const all = availableLeagues.map((l) => l.id);
    const allSelected = all.length > 0 && all.every((id) => selectedLeagueIds.has(id));
    if (allSelected) {
      setSelectedLeagueIds(new Set());
      return;
    }
    setAllLeagues();
  }

  function toggleLeague(id: number) {
    setSelectedLeagueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSortChange(next: BaseSort) {
    setSortIsCustom(false);
    setBaseSort(next);
  }

  function onTableSortClick(key: ColumnSortKey) {
    const mapsToBase = key === "league" || key === "kickoff" || key === "edge";
    if (mapsToBase) {
      setSortIsCustom(false);
      setBaseSort(key);
    } else {
      setSortIsCustom(true);
    }

    setTableSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      const defaultDirection: TableSort["direction"] =
        key === "league" || key === "kickoff" ? "asc" : "desc";
      return { key, direction: defaultDirection };
    });
  }

  const sortValue: BaseSort | "custom" = sortIsCustom ? "custom" : baseSort;
  const sortLabel = sortIsCustom
    ? `Sort: ${tableSort.key} (${tableSort.direction})`
    : `Sort: ${SORT_LABEL[baseSort]}`;
  const tableGroupedByLeague = !sortIsCustom && baseSort === "league";

  return (
    <>
      <header
        className="flex justify-between items-center"
        style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}
      >
        <h1
          className="font-bold uppercase"
          style={{ fontSize: "20px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Matches
        </h1>

        {!isDesktop && (
          <FilterBar
            leagues={availableLeagues}
            selectedLeagueIds={selectedLeagueIds}
            date={date}
            sortLabel={sortLabel}
            sortValue={sortValue}
            view={view}
            onLeagueToggle={toggleLeague}
            onLeagueToggleAll={toggleAllLeagues}
            onDateChange={setDate}
            onSortChange={onSortChange}
            onViewChange={setView}
            desktop={false}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            onOpenMobileSort={() => setMobileSortOpen(true)}
          />
        )}
      </header>

      {isDesktop && (
        <FilterBar
          leagues={availableLeagues}
          selectedLeagueIds={selectedLeagueIds}
          date={date}
          sortLabel={sortLabel}
          sortValue={sortValue}
          view={view}
          onLeagueToggle={toggleLeague}
          onLeagueToggleAll={toggleAllLeagues}
          onDateChange={setDate}
          onSortChange={onSortChange}
          onViewChange={setView}
          desktop
          onOpenMobileFilters={() => {}}
          onOpenMobileSort={() => {}}
        />
      )}

      <MobileSheet open={mobileFiltersOpen} title="Filters" onClose={() => setMobileFiltersOpen(false)}>
        <div className="flex flex-col gap-3">
          <div style={{ border: "1px solid var(--border-light)" }}>
            <label
              className="flex items-center gap-2 text-[12px] font-mono uppercase px-3 py-2"
              style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-main)" }}
            >
              <input
                type="checkbox"
                checked={availableLeagues.length > 0 && availableLeagues.every((l) => selectedLeagueIds.has(l.id))}
                ref={(input) => {
                  if (!input) return;
                  const selectedCount = availableLeagues.filter((l) => selectedLeagueIds.has(l.id)).length;
                  input.indeterminate = selectedCount > 0 && selectedCount < availableLeagues.length;
                }}
                onChange={toggleAllLeagues}
              />
              All Leagues
            </label>
            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
              {availableLeagues.map((league) => (
                <label
                  key={league.id}
                  className="flex items-center justify-between gap-2 text-[12px] font-mono uppercase px-3 py-2"
                  style={{ color: "var(--text-main)" }}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedLeagueIds.has(league.id)}
                      onChange={() => toggleLeague(league.id)}
                    />
                    {league.name}
                  </span>
                  <span style={{ color: "var(--text-tertiary)" }}>{league.matchCount}</span>
                </label>
              ))}
            </div>
          </div>
          <SimpleDropdown<DateRange>
            value={date}
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
              { value: "week", label: "This Week" },
            ]}
            onChange={setDate}
          />
        </div>
      </MobileSheet>

      <MobileSheet open={mobileSortOpen} title="Sort" onClose={() => setMobileSortOpen(false)}>
        <div className="flex flex-col gap-2">
          {(["league", "kickoff", "edge"] as BaseSort[]).map((option) => {
            const selected = !sortIsCustom && baseSort === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onSortChange(option);
                  setMobileSortOpen(false);
                }}
                className="text-left font-mono text-[12px] uppercase px-3 py-2"
                style={{
                  border: "1px solid var(--border-light)",
                  background: selected ? "var(--bg-surface)" : "transparent",
                  color: selected ? "var(--text-main)" : "var(--text-tertiary)",
                }}
              >
                {SORT_LABEL[option]}
              </button>
            );
          })}
        </div>
      </MobileSheet>

      {loading && !data && (
        <section className="pt-5 pb-8">
          <p className="text-[13px] text-secondary">Loading matches...</p>
        </section>
      )}

      {error && !data && (
        <section className="pt-5 pb-8">
          <p className="text-[13px] text-red-500">Failed to load matches.</p>
        </section>
      )}

      {!loading && !error && (
        <>
          {!isDesktop || view === "card" ? (
            <section
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pt-5 pb-8"
              style={{ gap: "var(--space-md)" }}
            >
              {sortedMatches.length === 0 ? (
                <p className="text-[13px] text-secondary">No matches in the feed.</p>
              ) : baseSort === "league" ? (
                grouped.map((group) => {
                  const stats = getLeagueHeaderStats(group.matches);
                  return (
                    <div key={`${group.leagueId}-${group.leagueName}`} className="col-span-full">
                      <LeagueSectionHeader
                        leagueName={group.leagueName}
                        matchCount={stats.matchCount}
                        bestEdge={stats.bestEdge}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: "var(--space-sm)" }}>
                        {group.matches.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                sortedMatches.map((match) => <MatchCard key={match.id} match={match} />)
              )}
            </section>
          ) : (
            <MatchTable
              matches={sortedMatches}
              groupByLeagueMode={tableGroupedByLeague}
              tableSort={tableSort}
              onSortClick={onTableSortClick}
            />
          )}
        </>
      )}
    </>
  );
}
