/**
 * Player season stats computed from ingested /players data.
 * Loads *-players.json files and provides per-game averages.
 */

import fs from "fs";
import path from "path";

export interface PlayerSeasonStat {
  playerId: number;
  name: string;
  teamId: number | null;
  teamName: string;
  position: string | null;
  appearances: number;
  minutes: number;
  lineups: number;
  startRate: number;
  shotsPerGame: number;
  sotPerGame: number;
  goalsPerGame: number;
  goals: number;
  assists: number;
  rating: number | null;
}

interface RawPlayerEntry {
  playerId: number;
  name: string;
  teamId: number | null;
  teamName: string | null;
  position: string | null;
  appearances: number;
  minutes: number;
  shotsTotal: number;
  shotsOn: number;
  goals: number;
  assists: number;
  keyPasses: number;
  rating: number | null;
  lineups: number;
}

let cachedPlayers: RawPlayerEntry[] | null = null;

function loadIngestedPlayers(): RawPlayerEntry[] {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir);
  const playerFiles = files.filter((f) => f.endsWith("-players.json"));
  const byKey = new Map<string, RawPlayerEntry>();

  for (const file of playerFiles.sort()) {
    const dataPath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const el of parsed as unknown[]) {
        const entry = el as RawPlayerEntry;
        if (!entry || !entry.playerId || !entry.teamName) continue;
        // Deduplicate by playerId + teamName — keep entry with most appearances
        // (domestic league stats are more reliable than cup stats)
        const key = `${entry.playerId}|${entry.teamName}`;
        const existing = byKey.get(key);
        if (!existing || entry.appearances > existing.appearances) {
          byKey.set(key, entry);
        }
      }
    } catch {
      // skip invalid or unreadable files
    }
  }
  return Array.from(byKey.values());
}

function getAllPlayers(): RawPlayerEntry[] {
  if (cachedPlayers) return cachedPlayers;
  const loaded = loadIngestedPlayers();
  if (loaded.length > 0) cachedPlayers = loaded;
  return loaded;
}

/**
 * Get player season stats for a team, with per-game averages.
 * Filters out goalkeepers and players below minAppearances.
 * Sorted by shots/game descending.
 */
export function getTeamPlayerStats(
  teamName: string,
  minAppearances: number = 3
): PlayerSeasonStat[] {
  const all = getAllPlayers();
  const lower = teamName.trim().toLowerCase();

  const teamPlayers = all.filter((p) => {
    if (!p.teamName) return false;
    return p.teamName.toLowerCase() === lower;
  });

  return teamPlayers
    .filter((p) => p.position !== "Goalkeeper" && p.appearances >= minAppearances)
    .map((p): PlayerSeasonStat => {
      const apps = p.appearances;
      const lineups = p.lineups ?? apps; // fallback to appearances for old data
      return {
        playerId: p.playerId,
        name: p.name,
        teamId: p.teamId,
        teamName: p.teamName ?? teamName,
        position: p.position,
        appearances: apps,
        minutes: p.minutes,
        lineups,
        startRate: 0, // computed externally when teamMatchesPlayed is known
        shotsPerGame: apps > 0 ? p.shotsTotal / apps : 0,
        sotPerGame: apps > 0 ? p.shotsOn / apps : 0,
        goalsPerGame: apps > 0 ? p.goals / apps : 0,
        goals: p.goals,
        assists: p.assists,
        rating: p.rating,
      };
    })
    .sort((a, b) => b.shotsPerGame - a.shotsPerGame || b.sotPerGame - a.sotPerGame);
}

/**
 * Get ALL players for a team (including goalkeepers).
 * No min-appearances filter. Needed for lineup prediction.
 */
export function getTeamAllPlayers(
  teamName: string
): PlayerSeasonStat[] {
  const all = getAllPlayers();
  const lower = teamName.trim().toLowerCase();

  const teamPlayers = all.filter((p) => {
    if (!p.teamName) return false;
    return p.teamName.toLowerCase() === lower;
  });

  return teamPlayers.map((p): PlayerSeasonStat => {
    const apps = p.appearances;
    const lineups = p.lineups ?? apps;
    return {
      playerId: p.playerId,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName ?? teamName,
      position: p.position,
      appearances: apps,
      minutes: p.minutes,
      lineups,
      startRate: 0,
      shotsPerGame: apps > 0 ? p.shotsTotal / apps : 0,
      sotPerGame: apps > 0 ? p.shotsOn / apps : 0,
      goalsPerGame: apps > 0 ? p.goals / apps : 0,
      goals: p.goals,
      assists: p.assists,
      rating: p.rating,
    };
  });
}

/** Clear cache (e.g. after re-ingest). */
export function clearPlayerStatsCache(): void {
  cachedPlayers = null;
}
