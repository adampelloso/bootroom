/**
 * Predicted lineup module.
 *
 * Primary: uses per-match lineup data from DB (fixture_lineup table).
 * Recent starts are weighted more heavily — last 5 matches count double.
 *
 * Fallback: season-aggregate stats from player JSON files (old approach).
 */

import { getTeamAllPlayers } from "@/lib/insights/player-stats";
import type { RecentStarterRow } from "@/lib/db-queries";

export type LineupConfidence = "locked" | "likely" | "rotation";

export interface PredictedStarter {
  playerId: number;
  name: string;
  position: string | null; // Goalkeeper | Defender | Midfielder | Attacker
  startRate: number; // weighted start rate (0-1)
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

/**
 * Predict lineup from recent per-match DB data.
 * Uses recency-weighted start counts: last 5 matches count 2x.
 */
export function predictLineupFromDb(
  teamName: string,
  recentLineups: RecentStarterRow[],
  injuredPlayerIds?: Set<number>,
): PredictedLineup | null {
  if (recentLineups.length === 0) return null;

  // Get unique fixture dates sorted most recent first
  const fixtureDates = [...new Set(recentLineups.map((r) => r.fixtureDate))]
    .sort((a, b) => b.localeCompare(a));
  const totalMatches = fixtureDates.length;
  if (totalMatches < 3) return null;

  // Build recency weight map: most recent 5 matches → weight 2, older → weight 1
  const dateWeight = new Map<string, number>();
  fixtureDates.forEach((d, i) => dateWeight.set(d, i < 5 ? 2 : 1));
  const maxWeightedStarts = fixtureDates.reduce((sum, d) => sum + (dateWeight.get(d) ?? 1), 0);

  // Aggregate per player
  type PlayerAgg = {
    playerId: number;
    name: string;
    position: string | null;
    weightedStarts: number;
    totalAppearances: number;
  };
  const playerMap = new Map<number, PlayerAgg>();

  for (const row of recentLineups) {
    if (injuredPlayerIds?.has(row.playerId)) continue;
    let agg = playerMap.get(row.playerId);
    if (!agg) {
      agg = { playerId: row.playerId, name: row.playerName, position: row.position, weightedStarts: 0, totalAppearances: 0 };
      playerMap.set(row.playerId, agg);
    }
    agg.totalAppearances++;
    if (row.started) {
      agg.weightedStarts += dateWeight.get(row.fixtureDate) ?? 1;
    }
  }

  const players = [...playerMap.values()];
  if (players.length < 11) return null;

  // Enrich with season stats where available (for goals/shots data)
  const seasonStats = new Map<number, { goals: number; assists: number; shotsPerGame: number; sotPerGame: number; goalsPerGame: number; appearances: number }>();
  try {
    const allSeasonPlayers = getTeamAllPlayers(teamName);
    for (const p of allSeasonPlayers) {
      seasonStats.set(p.playerId, {
        goals: p.goals,
        assists: p.assists,
        shotsPerGame: p.shotsPerGame,
        sotPerGame: p.sotPerGame,
        goalsPerGame: p.goalsPerGame,
        appearances: p.appearances,
      });
    }
  } catch {
    // Season stats unavailable — proceed without
  }

  function toStarter(p: PlayerAgg): PredictedStarter {
    const startRate = Math.min(p.weightedStarts / maxWeightedStarts, 0.95);
    const ss = seasonStats.get(p.playerId);
    const apps = ss?.appearances || p.totalAppearances || 1;
    return {
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      startRate,
      confidence: assignConfidence(startRate),
      seasonGoals: ss?.goals ?? 0,
      seasonShots: Math.round((ss?.shotsPerGame ?? 0) * apps),
      seasonSOT: Math.round((ss?.sotPerGame ?? 0) * apps),
      seasonAssists: ss?.assists ?? 0,
      shotsPerGame: ss?.shotsPerGame ?? 0,
      goalsPerGame: ss?.goalsPerGame ?? 0,
      assistsPerGame: apps > 0 ? (ss?.assists ?? 0) / apps : 0,
    };
  }

  // Separate GKs from outfield
  const goalkeepers = players
    .filter((p) => p.position === "Goalkeeper")
    .sort((a, b) => b.weightedStarts - a.weightedStarts);
  const outfield = players
    .filter((p) => p.position !== "Goalkeeper")
    .sort((a, b) => b.weightedStarts - a.weightedStarts);

  const startingGK = goalkeepers[0];
  if (!startingGK) return null;

  const startingOutfield = outfield.slice(0, 10);
  if (startingOutfield.length < 10) return null;

  const starters = [toStarter(startingGK), ...startingOutfield.map(toStarter)];

  // Sort by position order, then start rate within group
  starters.sort((a, b) => {
    const posA = POSITION_ORDER[a.position ?? "Attacker"] ?? 3;
    const posB = POSITION_ORDER[b.position ?? "Attacker"] ?? 3;
    if (posA !== posB) return posA - posB;
    return b.startRate - a.startRate;
  });

  const bench = outfield.slice(10, 13).map(toStarter);

  return { teamName, starters, bench, teamMatchesPlayed: totalMatches };
}

/**
 * Fallback: predict lineup from season-aggregate stats (old approach).
 * Used when no per-match lineup data is available.
 */
export function predictLineup(
  teamName: string,
  leagueId?: number,
  fixtureDate?: string,
  injuredPlayerIds?: Set<number>,
): PredictedLineup | null {
  let allPlayers = getTeamAllPlayers(teamName);
  if (allPlayers.length < 11) return null;

  if (injuredPlayerIds && injuredPlayerIds.size > 0) {
    allPlayers = allPlayers.filter((p) => !injuredPlayerIds.has(p.playerId));
    if (allPlayers.length < 11) return null;
  }

  const teamMatchesPlayed = Math.max(...allPlayers.map((p) => p.appearances));
  if (teamMatchesPlayed < 5) return null;

  const goalkeepers = allPlayers
    .filter((p) => p.position === "Goalkeeper")
    .sort((a, b) => b.lineups - a.lineups);
  const outfield = allPlayers
    .filter((p) => p.position !== "Goalkeeper")
    .sort((a, b) => b.lineups - a.lineups);

  const startingGK = goalkeepers[0];
  if (!startingGK) return null;

  const startingOutfield = outfield.slice(0, 10);
  if (startingOutfield.length < 10) return null;

  function toStarter(p: typeof allPlayers[0]): PredictedStarter {
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

  const starters = [toStarter(startingGK), ...startingOutfield.map(toStarter)];
  starters.sort((a, b) => {
    const posA = POSITION_ORDER[a.position ?? "Attacker"] ?? 3;
    const posB = POSITION_ORDER[b.position ?? "Attacker"] ?? 3;
    if (posA !== posB) return posA - posB;
    return b.startRate - a.startRate;
  });

  const bench = outfield.slice(10, 13).map(toStarter);

  return { teamName, starters, bench, teamMatchesPlayed };
}
