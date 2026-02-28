/**
 * Predicted lineup module.
 * Uses season start rates (lineups / teamMatchesPlayed) to predict
 * the most likely starting XI for a team.
 */

import { getTeamAllPlayers } from "@/lib/insights/player-stats";

export type LineupConfidence = "locked" | "likely" | "rotation";

export interface PredictedStarter {
  playerId: number;
  name: string;
  position: string | null; // Goalkeeper | Defender | Midfielder | Attacker
  startRate: number; // lineups / teamMatchesPlayed (0-1)
  confidence: LineupConfidence;
  seasonGoals: number;
  seasonShots: number;
  seasonSOT: number;
  seasonAssists: number;
  shotsPerGame: number;
  goalsPerGame: number;
  assistsPerGame: number;
}

export interface PredictedLineup {
  teamName: string;
  starters: PredictedStarter[]; // 11 players (1 GK + 10 outfield)
  bench: PredictedStarter[]; // next 3 borderline players
  teamMatchesPlayed: number;
}

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Attacker: 3,
};

function assignConfidence(startRate: number): LineupConfidence {
  if (startRate >= 0.85) return "locked";
  if (startRate >= 0.60) return "likely";
  return "rotation";
}

function toStarter(
  p: { playerId: number; name: string; position: string | null; lineups: number; goals: number; assists: number; shotsPerGame: number; sotPerGame: number; goalsPerGame: number },
  teamMatchesPlayed: number
): PredictedStarter {
  const rawRate = teamMatchesPlayed > 0 ? p.lineups / teamMatchesPlayed : 0;
  const startRate = Math.min(rawRate, 0.95);
  const appearances = p.lineups || 1;
  return {
    playerId: p.playerId,
    name: p.name,
    position: p.position,
    startRate,
    confidence: assignConfidence(startRate),
    seasonGoals: p.goals,
    seasonShots: Math.round(p.shotsPerGame * appearances),
    seasonSOT: Math.round(p.sotPerGame * appearances),
    seasonAssists: p.assists,
    shotsPerGame: p.shotsPerGame,
    goalsPerGame: p.goalsPerGame,
    assistsPerGame: appearances > 0 ? p.assists / appearances : 0,
  };
}

/**
 * Predict the most likely starting XI for a team.
 *
 * Algorithm:
 * 1. Get team match count from season stats
 * 2. Load all players (including GKs)
 * 3. For cup matches, use primary league stats (more reliable)
 * 4. Compute startRate = lineups / teamMatchesPlayed
 * 5. Pick 1 GK (highest lineups), 10 outfield (highest lineups)
 * 6. Assign confidence: >=85% locked, 60-85% likely, <60% rotation
 * 7. Sort by position order, then start rate within group
 *
 * Returns null if insufficient data (< 5 matches played).
 */
export function predictLineup(
  teamName: string,
  leagueId?: number,
  fixtureDate?: string
): PredictedLineup | null {
  const allPlayers = getTeamAllPlayers(teamName);
  if (allPlayers.length < 11) return null;

  // Derive team match count from player data (current season only).
  // The most-appearing player's appearances is the best proxy for total
  // matches played this season. Fixture history spans multiple seasons
  // and can't be used here.
  const teamMatchesPlayed = Math.max(...allPlayers.map((p) => p.appearances));
  if (teamMatchesPlayed < 5) return null;

  // Separate GKs from outfield
  const goalkeepers = allPlayers
    .filter((p) => p.position === "Goalkeeper")
    .sort((a, b) => b.lineups - a.lineups);

  const outfield = allPlayers
    .filter((p) => p.position !== "Goalkeeper")
    .sort((a, b) => b.lineups - a.lineups);

  // Pick 1 GK
  const startingGK = goalkeepers[0];
  if (!startingGK) return null;

  // Pick top 10 outfield
  const startingOutfield = outfield.slice(0, 10);
  if (startingOutfield.length < 10) return null;

  // Build starters
  const starters = [
    toStarter(startingGK, teamMatchesPlayed),
    ...startingOutfield.map((p) => toStarter(p, teamMatchesPlayed)),
  ];

  // Sort by position order, then start rate within group
  starters.sort((a, b) => {
    const posA = POSITION_ORDER[a.position ?? "Attacker"] ?? 3;
    const posB = POSITION_ORDER[b.position ?? "Attacker"] ?? 3;
    if (posA !== posB) return posA - posB;
    return b.startRate - a.startRate;
  });

  // Bench = next 3 outfield by lineups
  const bench = outfield.slice(10, 13).map((p) => toStarter(p, teamMatchesPlayed));

  return {
    teamName,
    starters,
    bench,
    teamMatchesPlayed,
  };
}
