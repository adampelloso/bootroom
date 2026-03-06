import type { FeedPredictedLineup, FeedPlayerSim } from "@/lib/feed";
import type { PlayerPropStat } from "@/app/components/PlayerPropsCard";
import { UnifiedPlayerTable } from "@/app/components/UnifiedPlayerTable";
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
  const hasProjections = !isFinished && playerSimData;

  return (
    <div className="space-y-0">
      {/* Unified sortable player table */}
      {hasProjections && (
        <UnifiedPlayerTable
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homePlayers={playerSimData!.home}
          awayPlayers={playerSimData!.away}
          homeLineup={predictedHomeLineup}
          awayLineup={predictedAwayLineup}
        />
      )}

      {/* Fallback: season player stats */}
      {!hasProjections && (
        <PlayerPropsCard
          playerStats={playerStats}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          isSeasonAverage={isSeasonAverage}
        />
      )}
    </div>
  );
}
