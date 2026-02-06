"use client";

export type PlayerPropStat = {
  id: number;
  name: string;
  teamName: string;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
};

type Props = {
  playerStats: PlayerPropStat[];
  homeTeamName: string;
  awayTeamName: string;
};

/**
 * Player props section: Shots and Shots on target (and optionally goals).
 * Sorted by shots then SOT so bettors see who to look at for shots/SOT lines.
 * Post-match only (stats from fixture players).
 */
export function PlayerPropsCard({ playerStats, homeTeamName, awayTeamName }: Props) {
  if (playerStats.length === 0) {
    return (
      <section
        id="section-player-props"
        className="px-5 py-4 border-t border-[var(--border-light)]"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
        aria-label="Player props"
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Player props</h2>
        <p className="text-secondary-data text-tertiary text-[13px]">
          Player shots and SOT available after the match (from match stats).
        </p>
      </section>
    );
  }

  const withShots = playerStats
    .map((p) => ({ ...p, shots: p.shotsTotal ?? 0, sot: p.shotsOn ?? 0 }))
    .filter((p) => p.shots > 0 || p.sot > 0)
    .sort((a, b) => b.shots - a.shots || b.sot - a.sot)
    .slice(0, 20);

  const homePlayers = withShots.filter((p) => p.teamName === homeTeamName);
  const awayPlayers = withShots.filter((p) => p.teamName === awayTeamName);

  function Table({ players, teamLabel }: { players: typeof withShots; teamLabel: string }) {
    if (players.length === 0) return null;
    return (
      <div className="border-b border-[var(--border-light)] pb-3">
        <p className="text-mono text-[11px] uppercase text-tertiary mb-3">{teamLabel}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] text-primary-data">
            <thead>
              <tr className="text-left text-tertiary border-b border-[var(--border-light)]">
                <th className="py-1.5 font-medium">Player</th>
                <th className="py-1.5 font-medium text-right w-16">Shots</th>
                <th className="py-1.5 font-medium text-right w-16">SOT</th>
                <th className="py-1.5 font-medium text-right w-12">G</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-light)]/50 last:border-0">
                  <td className="py-1.5 truncate max-w-[140px]">{p.name}</td>
                  <td className="py-1.5 text-right font-mono">{p.shots}</td>
                  <td className="py-1.5 text-right font-mono">{p.sot}</td>
                  <td className="py-1.5 text-right font-mono text-tertiary">{p.goals ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <section
      id="section-player-props"
      className="px-5 py-4 border-t border-[var(--border-light)]"
      style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      aria-label="Player props"
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4">Player props</h2>
      <p className="text-mono text-[11px] uppercase text-tertiary mb-3">Shots and shots on target (match stats)</p>
      <div className="space-y-4">
        <Table players={homePlayers} teamLabel={homeTeamName} />
        <Table players={awayPlayers} teamLabel={awayTeamName} />
      </div>
    </section>
  );
}
