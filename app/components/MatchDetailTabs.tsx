"use client";

import { useState } from "react";
import type { MatchStatsResult } from "@/lib/insights/team-stats";

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
};

const TABS = [
  { key: "home", label: "Home" },
  { key: "h2h", label: "H2H" },
  { key: "away", label: "Away" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <li className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-body)] p-4 shadow-[0_10px_24px_rgba(17,17,17,0.06)]">
      <p className="font-medium">{insight.headline}</p>
      {(insight.supportLabel || insight.supportValue) ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-tertiary">
          {insight.supportLabel ? (
            <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
              {insight.supportLabel}
            </span>
          ) : null}
          {insight.supportValue ? (
            <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
              {insight.supportValue}
            </span>
          ) : null}
        </div>
      ) : null}
      {insight.narrative ? (
        <p className="mt-3 text-sm text-[var(--text-sec)]">{insight.narrative}</p>
      ) : null}
    </li>
  );
}

function fmt(n: number) {
  return n.toFixed(1);
}

function SingleTeamStatsSection({
  teamName,
  stats,
}: {
  teamName: string;
  stats: MatchStatsResult["home"];
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary mb-4">
        {teamName} – Rolling form (L5 / L10)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody className="text-tertiary">
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">Goals for</td>
              <td className="text-right py-2 font-mono">{fmt(stats.l5.goalsFor)} / {fmt(stats.l10.goalsFor)}</td>
            </tr>
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">Goals against</td>
              <td className="text-right py-2 font-mono">{fmt(stats.l5.goalsAgainst)} / {fmt(stats.l10.goalsAgainst)}</td>
            </tr>
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">Shots for</td>
              <td className="text-right py-2 font-mono">{fmt(stats.l5.shotsFor)} / {fmt(stats.l10.shotsFor)}</td>
            </tr>
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">Shots against</td>
              <td className="text-right py-2 font-mono">{fmt(stats.l5.shotsAgainst)} / {fmt(stats.l10.shotsAgainst)}</td>
            </tr>
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">Corners for</td>
              <td className="text-right py-2 font-mono">{fmt(stats.l5.cornersFor)} / {fmt(stats.l10.cornersFor)}</td>
            </tr>
            <tr className="border-b border-[var(--border-light)]/50">
              <td className="py-2">BTTS (matches)</td>
              <td className="text-right py-2 font-mono">{stats.l5.bttsCount} / {stats.l10.bttsCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentFormComparison({
  rollingStats,
  homeTeamName,
  awayTeamName,
}: {
  rollingStats: MatchStatsResult;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const { home, away } = rollingStats;
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        padding: "var(--space-sm) var(--space-md)",
      }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary mb-4">
        Recent form comparison (L5 / L10)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[300px]">
          <thead>
            <tr className="border-b border-[var(--border-light)]">
              <th className="text-left py-2 font-mono text-[11px] uppercase text-tertiary">Stat</th>
              <th className="text-right py-2 font-mono text-[11px] uppercase text-tertiary truncate max-w-[80px]" title={homeTeamName}>{homeTeamName}</th>
              <th className="text-right py-2 font-mono text-[11px] uppercase text-tertiary truncate max-w-[80px]" title={awayTeamName}>{awayTeamName}</th>
            </tr>
          </thead>
          <tbody className="text-tertiary">
            <tr className="border-b border-[var(--border-light)]/50"><td className="py-2">Goals for</td><td className="text-right py-2 font-mono">{fmt(home.l5.goalsFor)} / {fmt(home.l10.goalsFor)}</td><td className="text-right py-2 font-mono">{fmt(away.l5.goalsFor)} / {fmt(away.l10.goalsFor)}</td></tr>
            <tr className="border-b border-[var(--border-light)]/50"><td className="py-2">Goals against</td><td className="text-right py-2 font-mono">{fmt(home.l5.goalsAgainst)} / {fmt(home.l10.goalsAgainst)}</td><td className="text-right py-2 font-mono">{fmt(away.l5.goalsAgainst)} / {fmt(away.l10.goalsAgainst)}</td></tr>
            <tr className="border-b border-[var(--border-light)]/50"><td className="py-2">Shots for</td><td className="text-right py-2 font-mono">{fmt(home.l5.shotsFor)} / {fmt(home.l10.shotsFor)}</td><td className="text-right py-2 font-mono">{fmt(away.l5.shotsFor)} / {fmt(away.l10.shotsFor)}</td></tr>
            <tr className="border-b border-[var(--border-light)]/50"><td className="py-2">Corners for</td><td className="text-right py-2 font-mono">{fmt(home.l5.cornersFor)} / {fmt(home.l10.cornersFor)}</td><td className="text-right py-2 font-mono">{fmt(away.l5.cornersFor)} / {fmt(away.l10.cornersFor)}</td></tr>
          </tbody>
        </table>
      </div>
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

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-[var(--bg-body)] px-4 pb-4 pt-2">
        <div className="flex gap-3 filters-scroll">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-[11px] uppercase font-mono whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-black text-white"
                  : "border border-[var(--border-light)] text-[var(--text-main)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "home" && (
        <section className="space-y-6">
          {rollingStats ? (
            <SingleTeamStatsSection
              teamName={homeTeamName}
              stats={rollingStats.home}
            />
          ) : (
            <p className="text-[13px] text-tertiary">No rolling stats for home team.</p>
          )}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
              Insights (home)
            </h2>
            <ul className="mt-4 space-y-4">
              {(insightsByFamily.Goals ?? []).concat(insightsByFamily.Control ?? []).slice(0, 6).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ul>
          </div>
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
          <H2HFixtureList
            fixtures={h2hFixtures}
            homeTeamId={homeTeamId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
          {rollingStats ? (
            <RecentFormComparison
              rollingStats={rollingStats}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
            />
          ) : null}
        </section>
      )}

      {activeTab === "away" && (
        <section className="space-y-6">
          {rollingStats ? (
            <SingleTeamStatsSection
              teamName={awayTeamName}
              stats={rollingStats.away}
            />
          ) : (
            <p className="text-[13px] text-tertiary">No rolling stats for away team.</p>
          )}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
              Insights (away)
            </h2>
            <ul className="mt-4 space-y-4">
              {(insightsByFamily.Goals ?? []).concat(insightsByFamily.Control ?? []).slice(0, 6).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ul>
          </div>
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
