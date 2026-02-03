"use client";

import { useMemo, useState } from "react";

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

type Props = {
  overviewInsights: Insight[];
  insightsByFamily: Record<string, Insight[]>;
  playerStats: PlayerPropStat[];
  playerProps: readonly PlayerPropDef[];
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "goals", label: "Goals" },
  { key: "corners", label: "Corners" },
  { key: "shots", label: "Shots" },
  { key: "halves", label: "Halves" },
  { key: "players", label: "Players" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <li className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-body)] p-4 shadow-[0_10px_24px_rgba(17,17,17,0.06)]">
      <p className="font-medium">{insight.headline}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-tertiary">
        <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
          {insight.supportLabel}
        </span>
        <span className="rounded-full bg-[var(--bg-surface)] px-3 py-1">
          {insight.supportValue}
        </span>
      </div>
      {insight.narrative ? (
        <p className="mt-3 text-sm text-[var(--text-sec)]">{insight.narrative}</p>
      ) : null}
    </li>
  );
}

export function MatchDetailTabs({
  overviewInsights,
  insightsByFamily,
  playerStats,
  playerProps,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

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

  const goalsInsights = insightsByFamily.Goals ?? [];
  const cornersInsights = insightsByFamily.Corners ?? [];
  const shotsInsights = insightsByFamily.Control ?? [];

  const halvesInsights = useMemo(() => {
    const pool = insightsByFamily.Goals ?? [];
    return pool.filter((insight) => {
      const text = `${insight.headline} ${insight.supportLabel}`.toLowerCase();
      return text.includes("first-half") || text.includes("second-half") || text.includes("1h") || text.includes("2h");
    });
  }, [insightsByFamily]);

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

      {activeTab === "overview" && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
            Best Insights
          </h2>
          <ul className="space-y-4">
            {overviewInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </section>
      )}

      {activeTab === "goals" && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
            Goals
          </h2>
          <ul className="space-y-4">
            {goalsInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </section>
      )}

      {activeTab === "corners" && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
            Corners
          </h2>
          <ul className="space-y-4">
            {cornersInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </section>
      )}

      {activeTab === "shots" && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
              Team Shots
            </h2>
            <ul className="mt-4 space-y-4">
              {shotsInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
                Player Shots
              </h2>
              <span className="text-mono text-[11px] uppercase text-tertiary">
                Top 3
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {playerProps
                .filter((prop) => prop.key === "shotsTotal" || prop.key === "shotsOn")
                .map((prop) => {
                  const rows = topPlayers(playerStats, prop.key);
                  return (
                    <div
                      key={prop.key}
                      className="rounded-xl"
                      style={{
                        background: "var(--bg-surface)",
                        padding: "var(--space-sm) var(--space-md)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
                          {prop.title}
                        </h3>
                        <span className="text-mono text-[11px] uppercase text-tertiary">
                          {prop.label}
                        </span>
                      </div>
                      {rows.length === 0 ? (
                        <p className="mt-3 text-[13px] text-[var(--text-sec)]">
                          No player props available.
                        </p>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {rows.map((player) => (
                            <li
                              key={`${prop.key}-${player.id}`}
                              className="flex items-center justify-between"
                            >
                              <div className="flex flex-col">
                                <span className="text-[13px] font-medium">
                                  {player.name}
                                </span>
                                <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                                  {player.teamName}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-mono text-[15px] font-medium">
                                  {player.value}
                                </span>
                                <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                                  {prop.label}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {activeTab === "halves" && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
            Halves
          </h2>
          <ul className="space-y-4">
            {halvesInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </section>
      )}

      {activeTab === "players" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-tertiary">
              Player Props
            </h2>
            <span className="text-mono text-[11px] uppercase text-tertiary">
              Top 3
            </span>
          </div>
          <div className="space-y-4">
            {playerProps.map((prop) => {
              const rows = topPlayers(playerStats, prop.key);
              return (
                <div
                  key={prop.key}
                  className="rounded-xl"
                  style={{
                    background: "var(--bg-surface)",
                    padding: "var(--space-sm) var(--space-md)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
                      {prop.title}
                    </h3>
                    <span className="text-mono text-[11px] uppercase text-tertiary">
                      {prop.label}
                    </span>
                  </div>
                  {rows.length === 0 ? (
                    <p className="mt-3 text-[13px] text-[var(--text-sec)]">
                      No player props available.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {rows.map((player) => (
                        <li
                          key={`${prop.key}-${player.id}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium">
                              {player.name}
                            </span>
                            <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                              {player.teamName}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-mono text-[15px] font-medium">
                              {player.value}
                            </span>
                            <span className="text-xs uppercase tracking-[0.2em] text-tertiary">
                              {prop.label}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
