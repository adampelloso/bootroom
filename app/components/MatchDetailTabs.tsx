"use client";

import { useState } from "react";
import type { MatchStatsResult, RollingStats } from "@/lib/insights/team-stats";
import type { InsightFamily } from "@/lib/insights/catalog";
import {
  type TrendsByStat,
  type TrendStatKey,
  TREND_STAT_TITLES,
  TREND_STAT_INTEGER,
} from "@/lib/insights/trend-chart-data";
import { StatTrendChart } from "./StatTrendChart";
import { H2HBarChart } from "./H2HBarChart";

/** Groups with For/Against toggle; single stats rendered as one chart each. */
const TREND_GROUPS: Array<{
  id: string;
  label: string;
  forKey: TrendStatKey;
  againstKey: TrendStatKey;
}> = [
  { id: "goals", label: "Goals", forKey: "goalsFor", againstKey: "goalsAgainst" },
  { id: "corners", label: "Corners", forKey: "cornersFor", againstKey: "cornersAgainst" },
  { id: "shots", label: "Shots", forKey: "shotsFor", againstKey: "shotsAgainst" },
  { id: "sot", label: "Shots on target", forKey: "sotFor", againstKey: "sotAgainst" },
];

const TREND_SINGLE: Array<{ key: TrendStatKey; title: string }> = [
  { key: "btts", title: "BTTS (matches)" },
  { key: "cleanSheet", title: "Clean sheets" },
];

function getTrendGroupsForCategory(category: InsightFamily | "all") {
  switch (category) {
    case "Goals":
      return TREND_GROUPS.filter((g) => g.id === "goals");
    case "Control":
      return TREND_GROUPS.filter((g) => g.id === "shots" || g.id === "sot");
    case "Corners":
      return TREND_GROUPS.filter((g) => g.id === "corners");
    case "all":
      return TREND_GROUPS;
    default:
      return [];
  }
}

function getTrendSingleForCategory(category: InsightFamily | "all") {
  if (category !== "all" && category !== "Goals" && category !== "Control" && category !== "Corners")
    return [];
  return TREND_SINGLE;
}

/** Market tags shown under each chart/section (plan 2.4). */
const MARKET_TAGS_BY_GROUP: Record<string, string> = {
  goals: "Team goals, Match totals, BTTS",
  corners: "Team corners, Match corners",
  shots: "Team shots",
  sot: "Player SOT, Team SOT",
};
const MARKET_TAGS_BTTS = "BTTS";
const MARKET_TAGS_CLEAN_SHEETS = "BTTS, Clean sheets";

type Insight = {
  id: string;
  headline: string;
  supportLabel: string;
  supportValue: string;
  narrative?: string;
  totalScore: number;
};

type PlayerPropStat = {
  id: number;
  name: string;
  teamName: string;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
};

type PlayerPropDef = {
  key: "shotsTotal" | "shotsOn" | "goals" | "assists";
  title: string;
  label: string;
};

type H2HFixture = {
  fixture: { date: string; venue?: { name?: string } | null };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals?: { home: number | null; away: number | null };
};

type Props = {
  overviewInsights: Insight[];
  insightsByFamily: Record<string, Insight[]>;
  playerStats: PlayerPropStat[];
  playerProps: readonly PlayerPropDef[];
  rollingStats: MatchStatsResult | null;
  h2hFixtures: H2HFixture[];
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  /** Precomputed trend data (server) so client gets plain values. */
  homeTrends: TrendsByStat | null;
  awayTrends: TrendsByStat | null;
  currentCategory?: InsightFamily | "all";
  /** Conditions row: venue filter (data filtering in todo 7). */
  venue?: "Home" | "Away" | "Combined";
  /** Conditions row: sample (L5 / L10 / Season). */
  sample?: "L5" | "L10" | "Season";
};

const TABS = [
  { key: "home", label: "Home" },
  { key: "h2h", label: "Compare" },
  { key: "away", label: "Away" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ForAgainstToggle({
  value,
  onChange,
}: {
  value: "For" | "Against";
  onChange: (v: "For" | "Against") => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] p-0.5"
      role="tablist"
      aria-label="For or Against"
    >
      {(["For", "Against"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          onClick={() => onChange(opt)}
          className="rounded-full px-3 py-1 text-[11px] font-mono uppercase transition-colors"
          style={{
            background: value === opt ? "var(--bg-accent)" : "transparent",
            color: value === opt ? "var(--text-on-accent)" : "var(--text-tertiary)",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SingleTeamTrendSection({
  teamName,
  trendsByStat,
  category,
}: {
  teamName: string;
  trendsByStat: TrendsByStat;
  category: InsightFamily | "all";
}) {
  const [groupMode, setGroupMode] = useState<Record<string, "For" | "Against">>({});

  const groups = getTrendGroupsForCategory(category);
  const single = getTrendSingleForCategory(category);

  const getKey = (group: (typeof TREND_GROUPS)[number]) =>
    groupMode[group.id] === "Against" ? group.againstKey : group.forKey;

  if (groups.length === 0 && single.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
        {teamName} – Last 10 (trend + avg)
      </h2>
      {groups.map((group) => {
        const key = getKey(group);
        const mode = groupMode[group.id] ?? "For";
        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-tertiary">
                  {group.label}
                </h3>
                {MARKET_TAGS_BY_GROUP[group.id] ? (
                  <p className="text-[10px] text-tertiary mt-0.5" aria-hidden>
                    For: {MARKET_TAGS_BY_GROUP[group.id]}
                  </p>
                ) : null}
              </div>
              <ForAgainstToggle
                value={mode}
                onChange={(v) => setGroupMode((prev) => ({ ...prev, [group.id]: v }))}
              />
            </div>
            <StatTrendChart
              title={TREND_STAT_TITLES[key]}
              data={trendsByStat[key].data}
              average={trendsByStat[key].average}
              integerValues={TREND_STAT_INTEGER[key] === true}
            />
          </div>
        );
      })}
      {single.map(({ key, title }) => (
        <div key={key} className="space-y-2">
          <div>
            <p className="text-[10px] text-tertiary" aria-hidden>
              For: {key === "btts" ? MARKET_TAGS_BTTS : MARKET_TAGS_CLEAN_SHEETS}
            </p>
          </div>
          <StatTrendChart
            title={title}
            data={trendsByStat[key].data}
            average={trendsByStat[key].average}
            integerValues={TREND_STAT_INTEGER[key] === true}
          />
        </div>
      ))}
    </div>
  );
}

function H2HFixtureList({
  fixtures,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: {
  fixtures: H2HFixture[];
  homeTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const sorted = [...fixtures].sort(
    (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  );
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary mb-4">
        Past H2H results
      </h2>
      {sorted.length === 0 ? (
        <p className="text-[13px] text-tertiary">No H2H data.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((f, i) => {
            const isHomeFirst = f.teams.home.id === homeTeamId;
            const homeGoals = isHomeFirst ? (f.goals?.home ?? 0) : (f.goals?.away ?? 0);
            const awayGoals = isHomeFirst ? (f.goals?.away ?? 0) : (f.goals?.home ?? 0);
            const date = new Date(f.fixture.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            const venue = f.fixture?.venue?.name ?? "";
            return (
              <li key={i} className="flex items-center justify-between text-[13px] py-2 border-b border-[var(--border-light)]/50 last:border-0">
                <div>
                  <span className="font-mono">{homeGoals} – {awayGoals}</span>
                  <span className="text-tertiary ml-2 text-[11px]">{date}</span>
                </div>
                {venue ? <span className="text-tertiary text-[11px] truncate max-w-[120px]" title={venue}>{venue}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type L10Key = keyof RollingStats;

const H2H_GROUPS: Array<{
  id: string;
  label: string;
  forKey: L10Key;
  againstKey: L10Key;
  integerValues?: boolean;
}> = [
  { id: "goals", label: "Goals", forKey: "goalsFor", againstKey: "goalsAgainst", integerValues: true },
  { id: "corners", label: "Corners", forKey: "cornersFor", againstKey: "cornersAgainst" },
  { id: "shots", label: "Shots", forKey: "shotsFor", againstKey: "shotsAgainst" },
  { id: "sot", label: "Shots on target", forKey: "sotFor", againstKey: "sotAgainst" },
];

const H2H_SINGLE: Array<{ key: L10Key; label: string; integerValues?: boolean }> = [
  { key: "bttsCount", label: "BTTS matches", integerValues: true },
  { key: "cleanSheets", label: "Clean sheets", integerValues: true },
];

function getH2HGroupsForCategory(category: InsightFamily | "all") {
  switch (category) {
    case "Goals":
      return H2H_GROUPS.filter((g) => g.id === "goals");
    case "Control":
      return H2H_GROUPS.filter((g) => g.id === "shots" || g.id === "sot");
    case "Corners":
      return H2H_GROUPS.filter((g) => g.id === "corners");
    case "all":
      return H2H_GROUPS;
    default:
      return [];
  }
}

function getH2HSingleForCategory(category: InsightFamily | "all") {
  if (category !== "all" && category !== "Goals" && category !== "Control" && category !== "Corners")
    return [];
  return H2H_SINGLE;
}

function H2HBarChartsSection({
  rollingStats,
  homeTeamName,
  awayTeamName,
  category,
  homeColor,
  awayColor,
}: {
  rollingStats: MatchStatsResult;
  homeTeamName: string;
  awayTeamName: string;
  category: InsightFamily | "all";
  homeColor?: string;
  awayColor?: string;
}) {
  const { home, away } = rollingStats;
  const groups = getH2HGroupsForCategory(category);
  const single = getH2HSingleForCategory(category);
  const [groupMode, setGroupMode] = useState<Record<string, "For" | "Against">>({});

  if (groups.length === 0 && single.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
        {category === "all" ? "Compare (L10 avg)" : `${category} comparison`}
      </h2>
      {groups.map((group) => {
        const mode = groupMode[group.id] ?? "For";
        const key = mode === "Against" ? group.againstKey : group.forKey;
        const label = `${group.label} ${mode.toLowerCase()}`;
        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-tertiary">
                  {group.label}
                </h3>
                {MARKET_TAGS_BY_GROUP[group.id] ? (
                  <p className="text-[10px] text-tertiary mt-0.5" aria-hidden>
                    For: {MARKET_TAGS_BY_GROUP[group.id]}
                  </p>
                ) : null}
              </div>
              <ForAgainstToggle
                value={mode}
                onChange={(v) => setGroupMode((prev) => ({ ...prev, [group.id]: v }))}
              />
            </div>
            <H2HBarChart
              statLabel={label}
              homeValue={home.l10[key]}
              awayValue={away.l10[key]}
              homeLabel={homeTeamName}
              awayLabel={awayTeamName}
              homeColor={homeColor}
              awayColor={awayColor}
              integerValues={group.integerValues}
            />
          </div>
        );
      })}
      {single.map((s) => (
        <div key={s.key} className="space-y-2">
          <p className="text-[10px] text-tertiary" aria-hidden>
            For: {s.key === "bttsCount" ? MARKET_TAGS_BTTS : MARKET_TAGS_CLEAN_SHEETS}
          </p>
          <H2HBarChart
            statLabel={s.label}
            homeValue={home.l10[s.key]}
            awayValue={away.l10[s.key]}
            homeLabel={homeTeamName}
            awayLabel={awayTeamName}
            homeColor={homeColor}
            awayColor={awayColor}
            integerValues={s.integerValues}
          />
        </div>
      ))}
    </div>
  );
}

export function MatchDetailTabs({
  overviewInsights,
  insightsByFamily,
  playerStats,
  playerProps,
  rollingStats,
  h2hFixtures,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeTrends,
  awayTrends,
  currentCategory = "all",
  venue,
  sample,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const topPlayers = (
    players: PlayerPropStat[],
    key: "shotsTotal" | "shotsOn" | "goals" | "assists",
    limit = 3,
  ) =>
    players
      .map((player) => ({ ...player, value: player[key] ?? 0 }))
      .filter((player) => player.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  return (
    <div>
      <div className="-mx-4 bg-[var(--bg-body)] px-4 pb-4 pt-2">
        <div
          className="relative flex rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-1 py-1"
          style={{ overflow: "hidden" }}
        >
          <div
            className="absolute top-1 bottom-1 rounded-full bg-[var(--bg-accent)] transition-transform duration-200 ease-out"
            style={{
              width: "33.3333%",
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="relative z-10 flex-1 px-2 py-1 text-[11px] uppercase font-mono whitespace-nowrap text-center transition-colors"
                style={{
                  color: isActive ? "var(--text-on-accent)" : "var(--text-main)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "home" && (
        <section className="space-y-6">
          {homeTrends ? (
            <SingleTeamTrendSection
              teamName={homeTeamName}
              trendsByStat={homeTrends}
              category={currentCategory}
            />
          ) : rollingStats ? (
            <p className="text-[13px] text-tertiary">No last-10 data for home team.</p>
          ) : (
            <p className="text-[13px] text-tertiary">No rolling stats for home team.</p>
          )}
          {playerStats.filter((p) => p.teamName === homeTeamName).length > 0 ? (
            <div
              className="rounded-xl"
              style={{ background: "var(--bg-surface)", padding: "var(--space-sm) var(--space-md)" }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
                Top scorers ({homeTeamName})
              </h2>
              <ul className="mt-4 space-y-3">
                {topPlayers(
                  playerStats.filter((p) => p.teamName === homeTeamName),
                  "goals"
                ).map((player) => (
                  <li key={player.id} className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{player.name}</span>
                    <span className="text-mono text-[15px] font-medium">{player.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {activeTab === "h2h" && (
        <section className="space-y-6">
          {rollingStats ? (
            <H2HBarChartsSection
              rollingStats={rollingStats}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              category={currentCategory}
            />
          ) : (
            <p className="text-[13px] text-tertiary">No H2H comparison data available.</p>
          )}
          <H2HFixtureList
            fixtures={h2hFixtures}
            homeTeamId={homeTeamId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        </section>
      )}

      {activeTab === "away" && (
        <section className="space-y-6">
          {awayTrends ? (
            <SingleTeamTrendSection
              teamName={awayTeamName}
              trendsByStat={awayTrends}
              category={currentCategory}
            />
          ) : rollingStats ? (
            <p className="text-[13px] text-tertiary">No last-10 data for away team.</p>
          ) : (
            <p className="text-[13px] text-tertiary">No rolling stats for away team.</p>
          )}
          {playerStats.filter((p) => p.teamName === awayTeamName).length > 0 ? (
            <div
              className="rounded-xl"
              style={{ background: "var(--bg-surface)", padding: "var(--space-sm) var(--space-md)" }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
                Top scorers ({awayTeamName})
              </h2>
              <ul className="mt-4 space-y-3">
                {topPlayers(
                  playerStats.filter((p) => p.teamName === awayTeamName),
                  "goals"
                ).map((player) => (
                  <li key={player.id} className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{player.name}</span>
                    <span className="text-mono text-[15px] font-medium">{player.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

    </div>
  );
}
