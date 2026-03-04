"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { FeedMatch } from "@/lib/feed";
import type { LeagueFilterValue } from "@/lib/leagues";
import type { DateRange } from "./DateSelector";
import { percentPill } from "@/lib/percent-color";
import { LeagueScrubber } from "./LeagueScrubber";
import { MatchCard } from "./MatchCard";
import { FeedFilterBar, type FeedFilters } from "./FeedFilterBar";
type ViewMode = "cards" | "table";
type SortMode = "kickoff" | "edge";

function getBttsPercent(match: FeedMatch): number | null {
  if (match.modelProbs?.btts != null) return match.modelProbs.btts;
  if (match.modelProbs?.mcBtts != null) return match.modelProbs.mcBtts;
  const bttsRow = match.marketRows.find((r) => r.market === "BTTS");
  if (bttsRow && bttsRow.market === "BTTS") return bttsRow.combinedHits / 10;
  return null;
}

function getO25Percent(match: FeedMatch): number | null {
  const mp = match.modelProbs;
  if (mp?.mcOver25 != null) return mp.mcOver25;
  if (mp?.over_2_5 != null) return mp.over_2_5;
  const o25Row = match.marketRows.find((r) => r.market === "O2.5");
  if (o25Row && o25Row.market === "O2.5") return o25Row.combinedHits / 10;
  return null;
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center shrink-0" style={{ gap: "2px" }}>
      <button
        type="button"
        onClick={() => onChange("cards")}
        className="px-2.5 py-1.5 text-mono text-[12px] uppercase transition-colors"
        style={{
          background: mode === "cards" ? "var(--text-main)" : "transparent",
          color: mode === "cards" ? "var(--bg-body)" : "var(--text-tertiary)",
          border: mode === "cards" ? "none" : "1px solid var(--border-light)",
        }}
        aria-label="Card view"
        title="Card view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="6" height="6" rx="0.5" />
          <rect x="9" y="1" width="6" height="6" rx="0.5" />
          <rect x="1" y="9" width="6" height="6" rx="0.5" />
          <rect x="9" y="9" width="6" height="6" rx="0.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className="px-2.5 py-1.5 text-mono text-[12px] uppercase transition-colors"
        style={{
          background: mode === "table" ? "var(--text-main)" : "transparent",
          color: mode === "table" ? "var(--bg-body)" : "var(--text-tertiary)",
          border: mode === "table" ? "none" : "1px solid var(--border-light)",
        }}
        aria-label="Table view"
        title="Table view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="3" x2="15" y2="3" />
          <line x1="1" y1="7" x2="15" y2="7" />
          <line x1="1" y1="11" x2="15" y2="11" />
          <line x1="1" y1="15" x2="15" y2="15" />
        </svg>
      </button>
    </div>
  );
}

function MatchTable({ matches }: { matches: FeedMatch[] }) {
  const teamText = "font-semibold uppercase truncate text-[12px] sm:text-[16px]";
  const xgVal = "text-[12px] sm:text-[16px] font-bold";
  const thBase = "uppercase font-bold py-2.5 text-[12px] sm:text-[16px] tracking-wider";
  const thColor = { color: "var(--text-tertiary)" };
  const cols = "1fr 36px 1fr 50px 12px 50px 12px 50px 1fr 36px 1fr";

  return (
    <div className="border-t border-[var(--border-light)]">
      {/* Header */}
      <div
        className="grid items-center text-mono"
        style={{ gridTemplateColumns: cols, background: "var(--bg-surface)" }}
      >
        <div />
        <div className={`text-right ${thBase}`} style={thColor}>xG</div>
        <div />
        <div className={`text-center ${thBase}`} style={thColor}>xG</div>
        <div />
        <div className={`text-center ${thBase}`} style={thColor}>O2.5</div>
        <div />
        <div className={`text-center ${thBase}`} style={thColor}>BTTS</div>
        <div />
        <div className={`text-left ${thBase}`} style={thColor}>xG</div>
        <div />
      </div>

      {/* Rows */}
      {matches.map((m) => {
        const mp = m.modelProbs;
        const hxG = mp?.expectedHomeGoals;
        const axG = mp?.expectedAwayGoals;
        const total = hxG != null && axG != null ? hxG + axG : null;
        const o25 = getO25Percent(m);
        const btts = getBttsPercent(m);

        return (
          <div
            key={m.id}
            className="grid items-center text-mono py-3 sm:py-4"
            style={{ gridTemplateColumns: cols, borderBottom: "1px solid var(--border-light)" }}
          >
            {/* Home team */}
            <Link
              href={`/match/${m.providerFixtureId}`}
              className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-70 transition-opacity min-w-0"
            >
              <img src={m.homeTeamLogo} alt="" className="w-4 h-4 sm:w-6 sm:h-6 object-contain shrink-0" width={24} height={24} />
              <span className={`${teamText} sm:hidden`} style={{ color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                {m.homeTeamCode ?? m.homeTeamName}
              </span>
              <span className={`${teamText} hidden sm:inline`} style={{ color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                {m.homeTeamName}
              </span>
            </Link>

            {/* Home xG */}
            <div className={`text-right ${xgVal}`} style={{ color: "var(--text-main)" }}>
              {hxG != null ? hxG.toFixed(1) : "—"}
            </div>

            {/* Spacer */}
            <div />

            {/* Total xG */}
            <div className={`text-center ${xgVal}`} style={{ color: total != null && total > 2.5 ? "var(--text-main)" : "var(--text-tertiary)" }}>
              {total != null ? total.toFixed(1) : "—"}
            </div>

            {/* Gap */}
            <div />

            {/* O2.5 */}
            <div className="text-center">
              {o25 != null ? (
                <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[12px] sm:text-[13px] font-bold" style={{ background: percentPill(Math.round(o25 * 100)).bg, color: percentPill(Math.round(o25 * 100)).text }}>{Math.round(o25 * 100)}%</span>
              ) : <span className={xgVal} style={{ color: "var(--text-tertiary)" }}>—</span>}
            </div>

            {/* Gap */}
            <div />

            {/* BTTS */}
            <div className="text-center">
              {btts != null ? (
                <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[12px] sm:text-[13px] font-bold" style={{ background: percentPill(Math.round(btts * 100)).bg, color: percentPill(Math.round(btts * 100)).text }}>{Math.round(btts * 100)}%</span>
              ) : <span className={xgVal} style={{ color: "var(--text-tertiary)" }}>—</span>}
            </div>

            {/* Spacer */}
            <div />

            {/* Away xG */}
            <div className={`text-left ${xgVal}`} style={{ color: "var(--text-main)" }}>
              {axG != null ? axG.toFixed(1) : "—"}
            </div>

            {/* Away team */}
            <Link
              href={`/match/${m.providerFixtureId}`}
              className="flex items-center justify-end gap-1.5 sm:gap-2.5 hover:opacity-70 transition-opacity min-w-0"
            >
              <span className={`${teamText} text-right sm:hidden`} style={{ color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                {m.awayTeamCode ?? m.awayTeamName}
              </span>
              <span className={`${teamText} text-right hidden sm:inline`} style={{ color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                {m.awayTeamName}
              </span>
              <img src={m.awayTeamLogo} alt="" className="w-4 h-4 sm:w-6 sm:h-6 object-contain shrink-0" width={24} height={24} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .toUpperCase();
}

function groupByDate(matches: FeedMatch[]): Array<{ date: string; matches: FeedMatch[] }> {
  const groups: Map<string, FeedMatch[]> = new Map();
  for (const m of matches) {
    const date = m.kickoffUtc.slice(0, 10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(m);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, matches]) => ({ date, matches }));
}

function DateGroupHeader({ date }: { date: string }) {
  return (
    <div
      className="col-span-full font-mono text-[12px] uppercase font-bold tracking-wider"
      style={{
        color: "var(--color-amber)",
        paddingTop: "var(--space-md)",
        paddingBottom: "var(--space-xs)",
        marginBottom: "var(--space-sm)",
      }}
    >
      {formatDateHeader(date)}
    </div>
  );
}

const GOALS_MARKETS = new Set(["HOME", "DRAW", "AWAY", "O2.5", "U2.5", "O3.5"]);
const BTTS_MARKETS = new Set(["BTTS", "BTTS NO"]);

function matchesMarketFilter(match: FeedMatch, marketType: FeedFilters["marketType"]): boolean {
  if (marketType === "all") return true;
  const best = match.edgeSummary?.bestMarket;
  if (!best) return false;
  const upper = best.toUpperCase();
  if (marketType === "goals") return GOALS_MARKETS.has(upper);
  if (marketType === "btts") return BTTS_MARKETS.has(upper);
  // corners — no corner edges yet, show all
  return true;
}

function matchesTierFilter(match: FeedMatch, minTier: FeedFilters["minTier"]): boolean {
  if (minTier === "ALL") return true;
  const tier = match.edgeSummary?.tier;
  if (!tier) return false;
  if (minTier === "HIGH") return tier === "HIGH";
  if (minTier === "HIGH_MEDIUM") return tier === "HIGH" || tier === "MEDIUM";
  return true;
}

function SortToggle({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  return (
    <div className="flex items-center shrink-0" style={{ gap: "2px" }}>
      <button
        type="button"
        onClick={() => onChange("kickoff")}
        className="px-2.5 py-1.5 text-mono text-[12px] uppercase transition-colors"
        style={{
          background: sort === "kickoff" ? "var(--text-main)" : "transparent",
          color: sort === "kickoff" ? "var(--bg-body)" : "var(--text-tertiary)",
          border: sort === "kickoff" ? "none" : "1px solid var(--border-light)",
        }}
      >
        Time
      </button>
      <button
        type="button"
        onClick={() => onChange("edge")}
        className="px-2.5 py-1.5 text-mono text-[12px] uppercase transition-colors"
        style={{
          background: sort === "edge" ? "var(--text-main)" : "transparent",
          color: sort === "edge" ? "var(--bg-body)" : "var(--text-tertiary)",
          border: sort === "edge" ? "none" : "1px solid var(--border-light)",
        }}
      >
        Edge
      </button>
    </div>
  );
}

export function FeedView({
  matches,
  currentRange,
  currentLeague,
  activeLeagues,
}: {
  matches: FeedMatch[];
  currentRange: DateRange;
  currentLeague: LeagueFilterValue;
  activeLeagues: Array<{ value: LeagueFilterValue; label: string }>;
}) {
  const [mode, setMode] = useState<ViewMode>("cards");
  const [sort, setSort] = useState<SortMode>("kickoff");
  const [filters, setFilters] = useState<FeedFilters>({ marketType: "all", minEdge: 0, minTier: "ALL" });

  const handleFilterChange = useCallback((f: FeedFilters) => setFilters(f), []);

  const sortedMatches = useMemo(() => {
    let result = matches.filter((m) => {
      if (!matchesMarketFilter(m, filters.marketType)) return false;
      if (filters.minEdge > 0 && (m.edgeSummary?.bestEdge ?? 0) < filters.minEdge / 100) return false;
      if (!matchesTierFilter(m, filters.minTier)) return false;
      return true;
    });
    if (sort === "edge") {
      result = [...result].sort((a, b) => (b.edgeSummary?.bestEdge ?? 0) - (a.edgeSummary?.bestEdge ?? 0));
    }
    return result;
  }, [matches, filters, sort]);

  const showDateHeaders = currentRange === "week";

  return (
    <>
      <LeagueScrubber
        currentRange={currentRange}
        currentLeague={currentLeague}
        activeLeagues={activeLeagues}
      >
        <div className="flex items-center gap-2">
          <SortToggle sort={sort} onChange={setSort} />
          <ViewToggle mode={mode} onChange={setMode} />
        </div>
      </LeagueScrubber>

      <FeedFilterBar onFilterChange={handleFilterChange} />

      {mode === "cards" ? (
        <section
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-[var(--border-light)] pt-5 pb-8"
          style={{ gap: "var(--space-sm)" }}
        >
          {sortedMatches.length === 0 ? (
            <p className="text-[13px] text-secondary">No matches in the feed.</p>
          ) : showDateHeaders ? (
            groupByDate(sortedMatches).map((group) => (
              <div key={group.date} className="col-span-full">
                <DateGroupHeader date={group.date} />
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  style={{ gap: "var(--space-sm)" }}
                >
                  {group.matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            sortedMatches.map((match: FeedMatch) => (
              <MatchCard key={match.id} match={match} />
            ))
          )}
        </section>
      ) : (
        <section className="pb-8">
          {sortedMatches.length === 0 ? (
            <p className="text-[13px] text-secondary border-t border-[var(--border-light)] pt-5">
              No matches in the feed.
            </p>
          ) : showDateHeaders ? (
            groupByDate(sortedMatches).map((group) => (
              <div key={group.date}>
                <div
                  className="font-mono text-[12px] uppercase font-bold tracking-wider"
                  style={{
                    color: "var(--color-amber)",
                    paddingTop: "var(--space-md)",
                    paddingBottom: "var(--space-xs)",
                  }}
                >
                  {formatDateHeader(group.date)}
                </div>
                <MatchTable matches={group.matches} />
              </div>
            ))
          ) : (
            <MatchTable matches={sortedMatches} />
          )}
        </section>
      )}
    </>
  );
}
