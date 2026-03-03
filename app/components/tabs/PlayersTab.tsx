import type { FeedPredictedLineup, FeedPlayerSim } from "@/lib/feed";
import type { PlayerPropStat } from "@/app/components/PlayerPropsCard";
import { PredictedLineupContent } from "@/app/components/PredictedLineupCard";
import { PlayerProjectionsContent } from "@/app/components/PlayerProjectionsCard";
import { PlayerPropsCard } from "@/app/components/PlayerPropsCard";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  isFinished: boolean;
  predictedHomeLineup?: FeedPredictedLineup;
  predictedAwayLineup?: FeedPredictedLineup;
  playerSimData?: FeedPlayerSim;
  playerStats: PlayerPropStat[];
  isSeasonAverage: boolean;
};

export function PlayersTab({
  homeTeamName,
  awayTeamName,
  isFinished,
  predictedHomeLineup,
  predictedAwayLineup,
  playerSimData,
  playerStats,
  isSeasonAverage,
}: Props) {
  const hasLineups = !isFinished && (predictedHomeLineup || predictedAwayLineup);
  const hasProjections = !isFinished && playerSimData;

  return (
    <div className="detail-grid">
      {/* Left: Lineups + projections */}
      <div className="space-y-4">
        {hasLineups && (
          <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Predicted lineups</h2>
            <PredictedLineupContent
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeLineup={predictedHomeLineup}
              awayLineup={predictedAwayLineup}
              playerSim={playerSimData}
            />
          </section>
        )}
        {hasProjections && (
          <section className="px-5 py-4 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Player projections</h2>
            <PlayerProjectionsContent
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              playerSim={playerSimData!}
            />
          </section>
        )}
        {!hasLineups && !hasProjections && (
          <section className="px-5 py-4" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <p className="text-secondary-data text-tertiary">No lineup or projection data available.</p>
          </section>
        )}
      </div>

      {/* Right: Player props */}
      <div>
        <PlayerPropsCard
          playerStats={playerStats}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          isSeasonAverage={isSeasonAverage}
        />
      </div>
    </div>
  );
}
