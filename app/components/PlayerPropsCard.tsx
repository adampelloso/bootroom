"use client";

export type PlayerPropStat = {
  id: number;
  name: string;
  teamName: string;
  shotsTotal: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
  appearances?: number;
};

type Props = {
  playerStats: PlayerPropStat[];
  homeTeamName: string;
  awayTeamName: string;
  isSeasonAverage?: boolean;
};

/**
 * Player props section: Shots and Shots on target (and optionally goals).
 * Dual mode: season averages (per-game) for upcoming matches, match stats for finished.
 */
export function PlayerPropsCard({ playerStats, homeTeamName, awayTeamName, isSeasonAverage }: Props) {
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
          No player data available.
        </p>
      </section>
    );
  }

  const withShots = playerStats
    .map((p) => ({ ...p, shots: p.shotsTotal ?? 0, sot: p.shotsOn ?? 0 }))
    .filter((p) => isSeasonAverage ? (p.shots > 0 || p.sot > 0 || (p.goals ?? 0) > 0) : (p.shots > 0 || p.sot > 0))
    .sort((a, b) => b.shots - a.shots || b.sot - a.sot)
    .slice(0, 20);

  const homePlayers = withShots.filter((p) => p.teamName === homeTeamName);
  const awayPlayers = withShots.filter((p) => p.teamName === awayTeamName);

  const subtitle = isSeasonAverage
    ? "Season averages per game"
    : "Shots and shots on target (match stats)";

  function Table({ players, teamLabel }: { players: typeof withShots; teamLabel: string }) {
    if (players.length === 0) return null;
    return (
      <div className="border-b border-[var(--border-light)] pb-3">
        <p className="text-mono text-[11px] uppercase text-tertiary mb-3">{teamLabel}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-left text-tertiary border-b border-[var(--border-light)]">
                <th className="py-1 pr-2 font-medium">Player</th>
                {isSeasonAverage && (
                  <th className="py-1 px-2 font-medium text-right w-10">Apps</th>
                )}
                <th className="py-1 px-2 font-medium text-right w-12">
                  {isSeasonAverage ? "Sh/G" : "Shots"}
                </th>
                <th className="py-1 px-2 font-medium text-right w-12">
                  {isSeasonAverage ? "SOT/G" : "SOT"}
                </th>
                <th className="py-1 pl-2 font-medium text-right w-10">
                  {isSeasonAverage ? "Goals" : "G"}
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-light)]/50 last:border-0">
                  <td className="py-1 pr-2 truncate max-w-[120px]">{p.name}</td>
                  {isSeasonAverage && (
                    <td className="py-1 px-2 text-right text-tertiary">
                      {p.appearances ?? "—"}
                    </td>
                  )}
                  <td className="py-1 px-2 text-right">
                    {isSeasonAverage ? p.shots.toFixed(1) : p.shots}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isSeasonAverage ? p.sot.toFixed(1) : p.sot}
                  </td>
                  <td className="py-1 pl-2 text-right text-tertiary">
                    {p.goals ?? "—"}
                  </td>
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
      <p className="text-mono text-[11px] uppercase text-tertiary mb-3">{subtitle}</p>
      <div className="space-y-4">
        <Table players={homePlayers} teamLabel={homeTeamName} />
        <Table players={awayPlayers} teamLabel={awayTeamName} />
      </div>
    </section>
  );
}
