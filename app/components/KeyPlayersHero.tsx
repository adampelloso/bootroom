"use client";

import type { FeedPlayerSimEntry } from "@/lib/feed";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: FeedPlayerSimEntry[];
  awayPlayers: FeedPlayerSimEntry[];
};

function PlayerCard({ player, teamCode }: { player: FeedPlayerSimEntry; teamCode: string }) {
  return (
    <div className="panel-card p-3" style={{ minWidth: "140px" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-mono text-[9px] uppercase px-1.5 py-0.5" style={{ background: "var(--bg-elevated)", color: "var(--text-sec)" }}>
          {teamCode}
        </span>
        <span className="text-mono text-[9px] uppercase text-tertiary">{player.position ?? "?"}</span>
      </div>
      <p className="text-[13px] font-semibold truncate mb-2" style={{ color: "var(--text-main)" }}>
        {player.name}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div>
          <span className="text-tertiary block">Scorer</span>
          <span className="text-[var(--text-main)] font-semibold">{(player.anytimeScorerProb * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-tertiary block">xG</span>
          <span className="text-[var(--text-main)] font-semibold">{player.expectedGoals.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function KeyPlayersHero({ homeTeamName, awayTeamName, homePlayers, awayPlayers }: Props) {
  const topHome = [...homePlayers].sort((a, b) => b.anytimeScorerProb - a.anytimeScorerProb).slice(0, 3);
  const topAway = [...awayPlayers].sort((a, b) => b.anytimeScorerProb - a.anytimeScorerProb).slice(0, 3);
  const homeCode = homeTeamName.slice(0, 3).toUpperCase();
  const awayCode = awayTeamName.slice(0, 3).toUpperCase();

  if (topHome.length === 0 && topAway.length === 0) return null;

  return (
    <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Key players</h2>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {topHome.map((p) => (
          <PlayerCard key={p.playerId} player={p} teamCode={homeCode} />
        ))}
        {topAway.map((p) => (
          <PlayerCard key={p.playerId} player={p} teamCode={awayCode} />
        ))}
      </div>
    </section>
  );
}
