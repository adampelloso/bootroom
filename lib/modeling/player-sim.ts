/**
 * Player-level simulation module.
 * Distributes team-level MC outputs (expected goals, shots) across
 * predicted starters using season goal/shot shares.
 *
 * Math:
 *   goalShare = playerSeasonGoals / sum(allStarterSeasonGoals)
 *   playerExpectedGoals = teamLambda * goalShare
 *   P(scores) = 1 - exp(-playerExpectedGoals)   // Poisson P(X >= 1)
 *
 *   shotShare = playerSeasonShots / sum(allStarterSeasonShots)
 *   expectedShots = teamAvgShotsPerGame * shotShare
 *   expectedSOT = teamAvgSOTPerGame * sotShare
 */

import type { PredictedLineup, PredictedStarter, LineupConfidence } from "./predicted-lineup";
import { getTeamStats, getTeamPrimaryLeagueId } from "@/lib/insights/team-stats";
import { isCup } from "@/lib/leagues";

export interface PlayerSimResult {
  playerId: number;
  name: string;
  position: string | null;
  confidence: LineupConfidence;
  goalShare: number; // player season goals / team total starter goals
  anytimeScorerProb: number; // 1 - exp(-teamLambda * goalShare)
  expectedGoals: number; // teamLambda * goalShare
  expectedShots: number; // teamAvgShots * shotShare
  expectedSOT: number; // teamAvgSOT * sotShare
  expectedAssists: number; // teamLambda * assistShare * assistGoalRatio
}

export interface MatchPlayerSim {
  home: PlayerSimResult[];
  away: PlayerSimResult[];
}

// Assist-to-goal ratio: ~0.6 in top leagues (assists per goal scored)
const ASSIST_GOAL_RATIO = 0.6;

function simulatePlayerGoals(
  starters: PredictedStarter[],
  teamLambda: number,
  teamAvgShots: number,
  teamAvgSOT: number
): PlayerSimResult[] {
  // Compute total goals/shots/SOT/assists across starters
  const totalGoals = starters.reduce((sum, p) => sum + p.seasonGoals, 0);
  const totalShots = starters.reduce((sum, p) => sum + p.seasonShots, 0);
  const totalSOT = starters.reduce((sum, p) => sum + p.seasonSOT, 0);
  const totalAssists = starters.reduce((sum, p) => sum + p.seasonAssists, 0);

  return starters.map((p): PlayerSimResult => {
    // Goal share: fallback to 1/11 if team has 0 goals
    const goalShare = totalGoals > 0 ? p.seasonGoals / totalGoals : 1 / 11;

    // Shot/SOT shares: fallback to 1/11
    const shotShare = totalShots > 0 ? p.seasonShots / totalShots : 1 / 11;
    const sotShare = totalSOT > 0 ? p.seasonSOT / totalSOT : 1 / 11;

    // Assist share: fallback to 1/11
    const assistShare = totalAssists > 0 ? p.seasonAssists / totalAssists : 1 / 11;

    // GKs and most defenders have 0 goals — their goalShare will be 0 naturally
    const playerExpectedGoals = teamLambda * goalShare;
    const anytimeScorerProb = 1 - Math.exp(-playerExpectedGoals);

    // Expected assists: convert goal-based lambda to assist space
    const expectedAssists = teamLambda * assistShare * ASSIST_GOAL_RATIO;

    return {
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      confidence: p.confidence,
      goalShare,
      anytimeScorerProb,
      expectedGoals: playerExpectedGoals,
      expectedShots: teamAvgShots * shotShare,
      expectedSOT: teamAvgSOT * sotShare,
      expectedAssists,
    };
  });
}

/**
 * Produce player-level sim results for both teams.
 *
 * @param homeLineup - Predicted lineup for home team
 * @param awayLineup - Predicted lineup for away team
 * @param homeLambda - Expected home goals from MC engine
 * @param awayLambda - Expected away goals from MC engine
 * @param fixtureDate - ISO date string
 * @param leagueId - League ID for stats lookup
 */
export function getMatchPlayerSim(
  homeLineup: PredictedLineup,
  awayLineup: PredictedLineup,
  homeLambda: number,
  awayLambda: number,
  fixtureDate?: string,
  leagueId?: number
): MatchPlayerSim {
  // Get team rolling stats for shots/SOT baselines
  const useCupFallback = leagueId != null && isCup(leagueId);

  function getTeamShotBaselines(teamName: string) {
    const statsLeagueId = useCupFallback
      ? getTeamPrimaryLeagueId(teamName, fixtureDate) ?? leagueId
      : leagueId;
    const stats = getTeamStats(teamName, fixtureDate, {
      venue: "all",
      leagueId: statsLeagueId,
    });
    if (!stats || stats.season.matchCount === 0) {
      return { avgShots: 12, avgSOT: 4 }; // league-average fallback
    }
    return {
      avgShots: stats.season.shotsFor,
      avgSOT: stats.season.sotFor,
    };
  }

  const homeBaselines = getTeamShotBaselines(homeLineup.teamName);
  const awayBaselines = getTeamShotBaselines(awayLineup.teamName);

  const home = simulatePlayerGoals(
    homeLineup.starters,
    homeLambda,
    homeBaselines.avgShots,
    homeBaselines.avgSOT
  );

  const away = simulatePlayerGoals(
    awayLineup.starters,
    awayLambda,
    awayBaselines.avgShots,
    awayBaselines.avgSOT
  );

  return { home, away };
}
