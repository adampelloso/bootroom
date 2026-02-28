"use client";

import { useState } from "react";
import type { FeedPlayerSim, FeedPlayerSimEntry } from "@/lib/feed";
import { percentPill } from "@/lib/percent-color";

type StatKey = "goals" | "shots" | "sot" | "assists";

const STAT_BUTTONS: { key: StatKey; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "shots", label: "Shots" },
  { key: "sot", label: "SOT" },
  { key: "assists", label: "Assists" },
];

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  playerSim: FeedPlayerSim;
};

function positionLabel(pos: string | null): string {
  if (!pos) return "—";
  const map: Record<string, string> = {
    Goalkeeper: "GK",
    Defender: "DEF",
    Midfielder: "MID",
    Attacker: "FWD",
  };
  return map[pos] ?? pos.slice(0, 3).toUpperCase();
}

function confidenceBadge(confidence: "locked" | "likely" | "rotation") {
  const colors = {
    locked: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    likely: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    rotation: "bg-stone-500/15 text-stone-500 dark:text-stone-400",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${colors[confidence]}`}
    >
      {confidence}
    </span>
  );
}

function sortEntries(entries: FeedPlayerSimEntry[], stat: StatKey): FeedPlayerSimEntry[] {
  // Filter out GKs
  const filtered = entries.filter((e) => e.position !== "Goalkeeper");
  const sorted = [...filtered];
  switch (stat) {
    case "goals":
      sorted.sort((a, b) => b.anytimeScorerProb - a.anytimeScorerProb);
      break;
    case "shots":
      sorted.sort((a, b) => b.expectedShots - a.expectedShots);
      break;
    case "sot":
      sorted.sort((a, b) => b.expectedSOT - a.expectedSOT);
      break;
    case "assists":
      sorted.sort((a, b) => b.expectedAssists - a.expectedAssists);
      break;
  }
  return sorted;
}

function TeamTable({
  teamName,
  entries,
  stat,
}: {
  teamName: string;
  entries: FeedPlayerSimEntry[];
  stat: StatKey;
}) {
  const sorted = sortEntries(entries, stat);

  return (
    <div className="border-b border-[var(--border-light)] pb-3">
      <p className="text-mono text-[11px] uppercase text-tertiary mb-2">{teamName}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-left text-tertiary border-b border-[var(--border-light)]">
              <th className="py-1 pr-2 font-medium">Player</th>
              <th className="py-1 px-2 font-medium w-7">Pos</th>
              {stat === "goals" && (
                <>
                  <th className="py-1 px-2 font-medium text-right w-12">Scorer</th>
                  <th className="py-1 px-2 font-medium text-right w-10">xG</th>
                </>
              )}
              {stat === "shots" && (
                <>
                  <th className="py-1 px-2 font-medium text-right w-10">xSh</th>
                  <th className="py-1 px-2 font-medium text-right w-10">xSOT</th>
                </>
              )}
              {stat === "sot" && (
                <>
                  <th className="py-1 px-2 font-medium text-right w-10">xSOT</th>
                  <th className="py-1 px-2 font-medium text-right w-10">xSh</th>
                </>
              )}
              {stat === "assists" && (
                <>
                  <th className="py-1 px-2 font-medium text-right w-10">xA</th>
                  <th className="py-1 px-2 font-medium text-right w-10">xG</th>
                </>
              )}
              <th className="py-1 pl-2 font-medium text-center w-14">Conf</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr
                key={p.playerId}
                className="border-b border-[var(--border-light)]/50 last:border-0"
              >
                <td className="py-1 pr-2 truncate max-w-[120px]">{p.name}</td>
                <td className="py-1 px-2 text-tertiary">{positionLabel(p.position)}</td>
                {stat === "goals" && (
                  <>
                    <td className="py-1 px-2 text-right">
                      {p.anytimeScorerProb > 0.01
                        ? <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: percentPill(Math.round(p.anytimeScorerProb * 100)).bg, color: percentPill(Math.round(p.anytimeScorerProb * 100)).text }}>{(p.anytimeScorerProb * 100).toFixed(0)}%</span>
                        : "—"}
                    </td>
                    <td className="py-1 px-2 text-right text-tertiary">
                      {p.expectedGoals.toFixed(2)}
                    </td>
                  </>
                )}
                {stat === "shots" && (
                  <>
                    <td className="py-1 px-2 text-right">{p.expectedShots.toFixed(1)}</td>
                    <td className="py-1 px-2 text-right text-tertiary">
                      {p.expectedSOT.toFixed(1)}
                    </td>
                  </>
                )}
                {stat === "sot" && (
                  <>
                    <td className="py-1 px-2 text-right">{p.expectedSOT.toFixed(1)}</td>
                    <td className="py-1 px-2 text-right text-tertiary">
                      {p.expectedShots.toFixed(1)}
                    </td>
                  </>
                )}
                {stat === "assists" && (
                  <>
                    <td className="py-1 px-2 text-right">
                      {p.expectedAssists > 0.01
                        ? p.expectedAssists.toFixed(2)
                        : "—"}
                    </td>
                    <td className="py-1 px-2 text-right text-tertiary">
                      {p.expectedGoals.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="py-1 pl-2 text-center">{confidenceBadge(p.confidence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlayerProjectionsCard({ homeTeamName, awayTeamName, playerSim }: Props) {
  const [stat, setStat] = useState<StatKey>("goals");

  return (
    <details className="border-t border-[var(--border-light)]">
      <summary
        className="px-5 py-3 cursor-pointer text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary"
        style={{
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
        }}
      >
        Player projections
      </summary>
      <section
        id="section-player-projections"
        className="px-5 pb-4"
        style={{
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
        }}
        aria-label="Player projections"
      >
        <div className="flex items-center gap-1 mb-3">
          {STAT_BUTTONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStat(key)}
              className={`px-3 py-1.5 text-mono text-[11px] uppercase rounded transition-colors ${
                stat === key
                  ? "bg-[var(--text-main)] text-[var(--bg-body)] font-semibold"
                  : "text-tertiary hover:text-[var(--text-sec)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <TeamTable teamName={homeTeamName} entries={playerSim.home} stat={stat} />
          <TeamTable teamName={awayTeamName} entries={playerSim.away} stat={stat} />
        </div>
      </section>
    </details>
  );
}
