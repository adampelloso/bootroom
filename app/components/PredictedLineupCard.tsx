import type {
  FeedPredictedLineup,
  FeedPredictedStarter,
  FeedPlayerSim,
  FeedPlayerSimEntry,
} from "@/lib/feed";
import { percentPill } from "@/lib/percent-color";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeLineup?: FeedPredictedLineup;
  awayLineup?: FeedPredictedLineup;
  playerSim?: FeedPlayerSim;
};

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

function confidenceSummary(starters: FeedPredictedStarter[]) {
  const locked = starters.filter((s) => s.confidence === "locked").length;
  const likely = starters.filter((s) => s.confidence === "likely").length;
  const rotation = starters.filter((s) => s.confidence === "rotation").length;
  const parts: string[] = [];
  if (locked > 0) parts.push(`${locked} locked`);
  if (likely > 0) parts.push(`${likely} likely`);
  if (rotation > 0) parts.push(`${rotation} rotation`);
  return parts.join(", ");
}

function TeamLineup({
  teamName,
  lineup,
  simEntries,
}: {
  teamName: string;
  lineup: FeedPredictedLineup;
  simEntries?: FeedPlayerSimEntry[];
}) {
  const simMap = new Map<number, FeedPlayerSimEntry>();
  if (simEntries) {
    for (const entry of simEntries) {
      simMap.set(entry.playerId, entry);
    }
  }

  return (
    <div className="border-b border-[var(--border-light)] pb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-mono text-[11px] uppercase text-tertiary">{teamName}</p>
        <p className="text-mono text-[10px] text-tertiary">
          {confidenceSummary(lineup.starters)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-left text-tertiary border-b border-[var(--border-light)]">
              <th className="py-1 pr-2 font-medium w-7">Pos</th>
              <th className="py-1 pr-2 font-medium">Player</th>
              <th className="py-1 px-2 font-medium text-right w-10">Start</th>
              <th className="py-1 px-2 font-medium text-center w-14">Status</th>
              {simEntries && (
                <>
                  <th className="py-1 px-2 font-medium text-right w-10">Scorer</th>
                  <th className="py-1 pl-2 font-medium text-right w-10">xSh</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lineup.starters.map((p) => {
              const sim = simMap.get(p.playerId);
              return (
                <tr
                  key={p.playerId}
                  className="border-b border-[var(--border-light)]/50 last:border-0"
                >
                  <td className="py-1 pr-2 text-tertiary">
                    {positionLabel(p.position)}
                  </td>
                  <td className="py-1 pr-2 truncate max-w-[120px]">{p.name}</td>
                  <td className="py-1 px-2 text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: percentPill(Math.round(p.startRate * 100)).bg, color: percentPill(Math.round(p.startRate * 100)).text }}>{(p.startRate * 100).toFixed(0)}%</span>
                  </td>
                  <td className="py-1 px-2 text-center">
                    {confidenceBadge(p.confidence)}
                  </td>
                  {simEntries && (
                    <>
                      <td className="py-1 px-2 text-right">
                        {sim && sim.anytimeScorerProb > 0.01
                          ? <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: percentPill(Math.round(sim.anytimeScorerProb * 100)).bg, color: percentPill(Math.round(sim.anytimeScorerProb * 100)).text }}>{(sim.anytimeScorerProb * 100).toFixed(0)}%</span>
                          : "—"}
                      </td>
                      <td className="py-1 pl-2 text-right text-tertiary">
                        {sim ? sim.expectedShots.toFixed(1) : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PredictedLineupContent({
  homeTeamName,
  awayTeamName,
  homeLineup,
  awayLineup,
  playerSim,
}: Props) {
  if (!homeLineup && !awayLineup) return null;

  return (
    <section aria-label="Predicted lineups">
      <p className="text-mono text-[10px] uppercase text-tertiary mb-3">
        Based on season start rates
      </p>
      <div className="space-y-4">
        {homeLineup && (
          <TeamLineup
            teamName={homeTeamName}
            lineup={homeLineup}
            simEntries={playerSim?.home}
          />
        )}
        {awayLineup && (
          <TeamLineup
            teamName={awayTeamName}
            lineup={awayLineup}
            simEntries={playerSim?.away}
          />
        )}
      </div>
    </section>
  );
}

export function PredictedLineupCard({
  homeTeamName,
  awayTeamName,
  homeLineup,
  awayLineup,
  playerSim,
}: Props) {
  if (!homeLineup && !awayLineup) return null;

  return (
    <details className="border-t border-[var(--border-light)]">
      <summary
        className="px-5 py-3 cursor-pointer text-[13px] font-semibold uppercase tracking-[0.08em] text-tertiary"
        style={{
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
        }}
      >
        Predicted lineups
      </summary>
      <div
        className="px-5 pb-4"
        style={{
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
        }}
      >
        <PredictedLineupContent
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          playerSim={playerSim}
        />
      </div>
    </details>
  );
}
