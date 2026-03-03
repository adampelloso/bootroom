/**
 * Team rolling stats (L5/L10) computed from ingested fixture data.
 * Used to fill insight templates with real values instead of stubs.
 */

import fs from "fs";
import path from "path";
import { isCup } from "@/lib/leagues";
import { kvGetMany } from "@/lib/kv";

export interface RollingStats {
  goalsFor: number;
  goalsAgainst: number;
  xgFor: number;
  xgAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  sotFor: number;
  sotAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
  bttsCount: number;
  o25Count: number;
  cleanSheets: number;
  matchCount: number;
  /** Number of matches in this window that have xG data. */
  xgMatchCount: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  possession: number;
  blockedShots: number;
  htGoalsFor: number;
  htGoalsAgainst: number;
  htO05Count: number;
  htO15Count: number;
  htBttsCount: number;
}

export interface TeamRollingStats {
  l5: RollingStats;
  l10: RollingStats;
  season: RollingStats;
}

interface IngestedFixture {
  fixture: {
    fixture: { id?: number; date: string };
    league?: { id: number; name?: string };
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
    score?: { halftime?: { home: number | null; away: number | null } };
  };
  /** Top-level league (when ingest persists it here); else use fixture.league */
  league?: { id: number; name?: string };
  stats?: Array<{
    team: { name: string };
    statistics: Array<{ type: string; value: number | string | null }>;
  }>;
}

export interface TeamMatchRow {
  date: string;
  dateMs: number;
  isHome: boolean;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  /** Expected goals for (from provider stats). null if unavailable. */
  xgFor: number | null;
  /** Expected goals against (from provider stats). null if unavailable. */
  xgAgainst: number | null;
  btts: boolean;
  cleanSheet: boolean;
  shotsFor: number;
  shotsAgainst: number;
  sotFor: number;
  sotAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
  /** Half-time goals scored by this team. null if unavailable. */
  htGoalsFor: number | null;
  /** Half-time goals conceded by this team. null if unavailable. */
  htGoalsAgainst: number | null;
  fouls: number;
  yellowCards: number;
  redCards: number;
  /** Ball possession percentage 0-100. */
  possession: number;
  blockedShots: number;
  leagueId?: number;
  leagueName?: string;
}

function getStatValue(stats: Array<{ type: string; value: number | string | null }>, ...typeCandidates: string[]): number {
  for (const type of typeCandidates) {
    const s = stats.find((x) => x.type === type);
    if (!s || s.value == null) continue;
    if (typeof s.value === "string") return parseFloat(s.value) || 0;
    return s.value;
  }
  return 0;
}

/** Load and merge all *-fixtures.json files (e.g. 39-2025-fixtures.json, epl-2020-fixtures.json) so we have history across all ingested competitions. */
function loadIngestedFixtures(): IngestedFixture[] {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir);
  const fixtureFiles = files.filter((f) => f.endsWith("-fixtures.json"));
  const all: IngestedFixture[] = [];
  const seenFixtureIds = new Set<number>();
  // Fallback dedup key when fixture ID is missing: date + home + away
  const seenKeys = new Set<string>();
  for (const file of fixtureFiles.sort()) {
    const dataPath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const el of parsed as unknown[]) {
        const entry = el as Record<string, unknown>;
        if (!entry || typeof entry.fixture !== "object") continue;
        const typed = el as IngestedFixture;
        // Deduplicate by fixture ID (preferred) or date+teams fallback
        const fixtureId = typed.fixture?.fixture?.id;
        if (fixtureId != null) {
          if (seenFixtureIds.has(fixtureId)) continue;
          seenFixtureIds.add(fixtureId);
        } else {
          const key = `${typed.fixture?.fixture?.date}|${typed.fixture?.teams?.home?.name}|${typed.fixture?.teams?.away?.name}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
        }
        all.push(typed);
      }
    } catch {
      // skip invalid or unreadable files
    }
  }
  return all;
}

function buildTeamMatchHistory(fixtures: IngestedFixture[]): Map<string, TeamMatchRow[]> {
  const byTeam = new Map<string, TeamMatchRow[]>();

  const sorted = [...fixtures]
    .filter((f) => f.fixture?.goals?.home != null && f.fixture?.goals?.away != null)
    .sort((a, b) => new Date(a.fixture.fixture.date).getTime() - new Date(b.fixture.fixture.date).getTime());

  for (const entry of sorted) {
    const { fixture, stats } = entry;
    const home = fixture.teams?.home?.name;
    const away = fixture.teams?.away?.name;
    const date = fixture.fixture?.date;
    if (!home || !away || !date) continue;

    const gh = fixture.goals?.home ?? 0;
    const ga = fixture.goals?.away ?? 0;
    const btts = gh > 0 && ga > 0;
    const dateMs = new Date(date).getTime();
    const leagueId = entry.league?.id ?? fixture.league?.id;
    const leagueName = entry.league?.name ?? fixture.league?.name;

    const homeStats = stats?.find((s) => s.team?.name === home);
    const awayStats = stats?.find((s) => s.team?.name === away);
    const homeStatArr = homeStats?.statistics ?? [];
    const awayStatArr = awayStats?.statistics ?? [];

    // Extract expected goals (xG) — returns 0 when missing, so check if stat exists
    const homeXgRaw = getStatValue(homeStatArr, "expected_goals");
    const awayXgRaw = getStatValue(awayStatArr, "expected_goals");
    const homeHasXg = homeStatArr.some((s) => s.type === "expected_goals" && s.value != null);
    const awayHasXg = awayStatArr.some((s) => s.type === "expected_goals" && s.value != null);

    // Half-time scores
    const htHome = fixture.score?.halftime?.home ?? null;
    const htAway = fixture.score?.halftime?.away ?? null;

    // Possession: parse "55%" → 55
    const homePossRaw = homeStatArr.find((s) => s.type === "Ball Possession");
    const awayPossRaw = awayStatArr.find((s) => s.type === "Ball Possession");
    const homePoss = homePossRaw?.value != null ? parseFloat(String(homePossRaw.value)) || 0 : 0;
    const awayPoss = awayPossRaw?.value != null ? parseFloat(String(awayPossRaw.value)) || 0 : 0;

    const homeRow: TeamMatchRow = {
      date,
      dateMs,
      isHome: true,
      opponentName: away,
      goalsFor: gh,
      goalsAgainst: ga,
      xgFor: homeHasXg ? homeXgRaw : null,
      xgAgainst: awayHasXg ? awayXgRaw : null,
      btts,
      cleanSheet: ga === 0,
      shotsFor: getStatValue(homeStatArr, "Total Shots"),
      shotsAgainst: getStatValue(awayStatArr, "Total Shots"),
      sotFor: getStatValue(homeStatArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(awayStatArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(homeStatArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(awayStatArr, "Corner Kicks", "Corner kicks"),
      htGoalsFor: htHome,
      htGoalsAgainst: htAway,
      fouls: getStatValue(homeStatArr, "Fouls"),
      yellowCards: getStatValue(homeStatArr, "Yellow Cards"),
      redCards: getStatValue(homeStatArr, "Red Cards"),
      possession: homePoss,
      blockedShots: getStatValue(homeStatArr, "Blocked Shots"),
      leagueId,
      leagueName,
    };

    const awayRow: TeamMatchRow = {
      date,
      dateMs,
      isHome: false,
      opponentName: home,
      goalsFor: ga,
      goalsAgainst: gh,
      xgFor: awayHasXg ? awayXgRaw : null,
      xgAgainst: homeHasXg ? homeXgRaw : null,
      btts,
      cleanSheet: gh === 0,
      shotsFor: getStatValue(awayStatArr, "Total Shots"),
      shotsAgainst: getStatValue(homeStatArr, "Total Shots"),
      sotFor: getStatValue(awayStatArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(homeStatArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(awayStatArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(homeStatArr, "Corner Kicks", "Corner kicks"),
      htGoalsFor: htAway,
      htGoalsAgainst: htHome,
      fouls: getStatValue(awayStatArr, "Fouls"),
      yellowCards: getStatValue(awayStatArr, "Yellow Cards"),
      redCards: getStatValue(awayStatArr, "Red Cards"),
      possession: awayPoss,
      blockedShots: getStatValue(awayStatArr, "Blocked Shots"),
      leagueId,
      leagueName,
    };

    if (!byTeam.has(home)) byTeam.set(home, []);
    byTeam.get(home)!.push(homeRow);
    if (!byTeam.has(away)) byTeam.set(away, []);
    byTeam.get(away)!.push(awayRow);
  }

  return byTeam;
}

function computeRolling(matches: TeamMatchRow[], n: number): RollingStats {
  const slice = matches.slice(-n);
  if (slice.length === 0) {
    return {
      goalsFor: 0,
      goalsAgainst: 0,
      xgFor: 0,
      xgAgainst: 0,
      shotsFor: 0,
      shotsAgainst: 0,
      sotFor: 0,
      sotAgainst: 0,
      cornersFor: 0,
      cornersAgainst: 0,
      bttsCount: 0,
      o25Count: 0,
      cleanSheets: 0,
      matchCount: 0,
      xgMatchCount: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      possession: 0,
      blockedShots: 0,
      htGoalsFor: 0,
      htGoalsAgainst: 0,
      htO05Count: 0,
      htO15Count: 0,
      htBttsCount: 0,
    };
  }
  const count = slice.length;
  const sum = (fn: (r: TeamMatchRow) => number) => slice.reduce((a, r) => a + fn(r), 0);

  // xG: only average over matches that have xG data
  const xgSlice = slice.filter((r) => r.xgFor != null && r.xgAgainst != null);
  const xgCount = xgSlice.length;

  // HT: only average over matches with HT data
  const htSlice = slice.filter((r) => r.htGoalsFor != null && r.htGoalsAgainst != null);
  const htCount = htSlice.length;

  return {
    goalsFor: sum((r) => r.goalsFor) / count,
    goalsAgainst: sum((r) => r.goalsAgainst) / count,
    xgFor: xgCount > 0 ? xgSlice.reduce((a, r) => a + r.xgFor!, 0) / xgCount : 0,
    xgAgainst: xgCount > 0 ? xgSlice.reduce((a, r) => a + r.xgAgainst!, 0) / xgCount : 0,
    shotsFor: sum((r) => r.shotsFor) / count,
    shotsAgainst: sum((r) => r.shotsAgainst) / count,
    sotFor: sum((r) => r.sotFor) / count,
    sotAgainst: sum((r) => r.sotAgainst) / count,
    cornersFor: sum((r) => r.cornersFor) / count,
    cornersAgainst: sum((r) => r.cornersAgainst) / count,
    bttsCount: slice.filter((r) => r.btts).length,
    o25Count: slice.filter((r) => r.goalsFor + r.goalsAgainst >= 3).length,
    cleanSheets: slice.filter((r) => r.cleanSheet).length,
    matchCount: count,
    xgMatchCount: xgCount,
    fouls: sum((r) => r.fouls) / count,
    yellowCards: sum((r) => r.yellowCards) / count,
    redCards: sum((r) => r.redCards) / count,
    possession: sum((r) => r.possession) / count,
    blockedShots: sum((r) => r.blockedShots) / count,
    htGoalsFor: htCount > 0 ? htSlice.reduce((a, r) => a + r.htGoalsFor!, 0) / htCount : 0,
    htGoalsAgainst: htCount > 0 ? htSlice.reduce((a, r) => a + r.htGoalsAgainst!, 0) / htCount : 0,
    htO05Count: htSlice.filter((r) => r.htGoalsFor! + r.htGoalsAgainst! >= 1).length,
    htO15Count: htSlice.filter((r) => r.htGoalsFor! + r.htGoalsAgainst! >= 2).length,
    htBttsCount: htSlice.filter((r) => r.htGoalsFor! > 0 && r.htGoalsAgainst! > 0).length,
  };
}

let cachedHistory: Map<string, TeamMatchRow[]> | null = null;

/** Pre-loaded league averages from KV (keyed by leagueId or "all"). */
let cachedLeagueAverages: Map<string, LeagueGoalAverages> | null = null;

/**
 * Preload team match history from Cloudflare KV into the module cache.
 * On local dev (no KV), this is a no-op — existing fs code runs unchanged.
 */
export async function preloadTeamStats(teamNames: string[]): Promise<void> {
  if (cachedHistory && teamNames.every((n) => cachedHistory!.has(n))) return;

  const keys = teamNames.map((name) => `team:${name}`);
  const results = await kvGetMany<TeamMatchRow[]>(keys);
  if (results.size === 0) return; // no KV (local dev) or no data

  if (!cachedHistory) cachedHistory = new Map();
  for (const [key, rows] of results) {
    const teamName = key.slice("team:".length);
    cachedHistory.set(teamName, rows);
  }
}

/**
 * Preload league goal averages from Cloudflare KV.
 * On local dev, this is a no-op — getLeagueGoalAverages computes from fs data.
 */
export async function preloadLeagueAverages(leagueIds: number[]): Promise<void> {
  if (cachedLeagueAverages) return;

  const keys = [
    ...leagueIds.map((id) => `league-averages:${id}`),
    "league-averages:all",
  ];
  const results = await kvGetMany<LeagueGoalAverages>(keys);
  if (results.size === 0) return;

  cachedLeagueAverages = new Map();
  for (const [key, avg] of results) {
    const suffix = key.slice("league-averages:".length);
    cachedLeagueAverages.set(suffix, avg);
  }
}

function getTeamHistory(): Map<string, TeamMatchRow[]> {
  if (cachedHistory) return cachedHistory;
  const fixtures = loadIngestedFixtures();
  const built = buildTeamMatchHistory(fixtures);
  if (built.size > 0) cachedHistory = built;
  return built;
}

export interface LeagueGoalAverages {
  homeGoals: number;
  awayGoals: number;
}

/**
 * League-wide average goals per match for home and away teams.
 * When leagueId is provided, only fixtures from that competition are used.
 * Otherwise falls back to all ingested fixtures (multi-league, multi-season).
 * Checks preloaded KV cache first (Workers); falls back to computation (local dev).
 */
export function getLeagueGoalAverages(leagueId?: number): LeagueGoalAverages {
  // Check preloaded KV cache first (populated by preloadLeagueAverages on Workers)
  if (cachedLeagueAverages) {
    const key = leagueId != null ? String(leagueId) : "all";
    const cached = cachedLeagueAverages.get(key);
    if (cached) return cached;
  }

  const history = getTeamHistory();
  let homeGoals = 0;
  let homeMatches = 0;
  let awayGoals = 0;
  let awayMatches = 0;

  for (const [, rows] of history) {
    for (const row of rows) {
      if (leagueId != null && row.leagueId !== leagueId) continue;
      if (row.isHome) {
        homeGoals += row.goalsFor;
        homeMatches += 1;
      } else {
        awayGoals += row.goalsFor;
        awayMatches += 1;
      }
    }
  }

  return {
    homeGoals: homeMatches > 0 ? homeGoals / homeMatches : 0,
    awayGoals: awayMatches > 0 ? awayGoals / awayMatches : 0,
  };
}

function findTeamMatches(history: Map<string, TeamMatchRow[]>, teamName: string): TeamMatchRow[] | undefined {
  const trimmed = teamName.trim();
  const exact = history.get(trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  for (const [name, rows] of history) {
    if (name.toLowerCase() === lower) return rows;
  }
  return undefined;
}

export type VenueFilter = "home" | "away" | "all";

export interface TeamStatsOptions {
  venue?: VenueFilter;
  /** When set, only matches from this competition (league id) are included. */
  leagueId?: number;
}

function applyVenueFilter(rows: TeamMatchRow[], venue: VenueFilter): TeamMatchRow[] {
  if (venue === "all") return rows;
  return rows.filter((r) => (venue === "home" ? r.isHome : !r.isHome));
}

function applyLeagueFilter(rows: TeamMatchRow[], leagueId: number | undefined): TeamMatchRow[] {
  if (leagueId == null) return rows;
  return rows.filter((r) => r.leagueId === leagueId);
}

/**
 * Get L5, L10 and season rolling stats for a team as of a given fixture date.
 * Optional venue filter and leagueId (same competition only when set).
 */
export function getTeamStats(
  teamName: string,
  asOfDate?: string,
  options?: TeamStatsOptions
): TeamRollingStats | null {
  const history = getTeamHistory();
  const matches = findTeamMatches(history, teamName);
  if (!matches || matches.length === 0) return null;

  let filtered = matches;
  if (asOfDate) {
    const cutoff = new Date(asOfDate).getTime();
    filtered = matches.filter((m) => m.dateMs < cutoff);
  }
  filtered = applyVenueFilter(filtered, options?.venue ?? "all");
  filtered = applyLeagueFilter(filtered, options?.leagueId);
  if (filtered.length === 0) return null;

  const l5 = computeRolling(filtered, 5);
  const l10 = computeRolling(filtered, 10);
  const season = computeRolling(filtered, filtered.length);

  return { l5, l10, season };
}

/**
 * Get last N match rows for a team (for trend charts), with opponent names.
 * Optional venue and leagueId filter. Chronological order (oldest first).
 */
export function getTeamLastNMatchRows(
  teamName: string,
  n: number,
  asOfDate?: string,
  options?: TeamStatsOptions
): TeamMatchRow[] {
  const history = getTeamHistory();
  const matches = findTeamMatches(history, teamName);
  if (!matches || matches.length === 0) return [];

  let filtered = matches;
  if (asOfDate) {
    const cutoff = new Date(asOfDate).getTime();
    filtered = matches.filter((m) => m.dateMs < cutoff);
  }
  filtered = applyVenueFilter(filtered, options?.venue ?? "all");
  filtered = applyLeagueFilter(filtered, options?.leagueId);
  return filtered.slice(-n);
}

/**
 * Combined match-level stats for both teams (for total goals, BTTS, etc).
 */
export interface MatchStatsResult {
  home: TeamRollingStats;
  away: TeamRollingStats;
  combinedL5Goals: number;
  combinedL10Goals: number;
  combinedL5CleanSheets: number;
  combinedL10CleanSheets: number;
  combinedL5BTTS: number;
  combinedL10BTTS: number;
  combinedL5Corners: number;
  combinedL10Corners: number;
}

export function getMatchStats(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string,
  options?: TeamStatsOptions
): MatchStatsResult | null {
  const venue = options?.venue ?? "all";
  const leagueId = options?.leagueId;
  const home = getTeamStats(homeTeamName, fixtureDate, { venue, leagueId });
  const away = getTeamStats(awayTeamName, fixtureDate, { venue, leagueId });

  if (!home || !away) return null;

  const combinedL5Goals =
    (home.l5.goalsFor + home.l5.goalsAgainst + away.l5.goalsFor + away.l5.goalsAgainst) / 2;
  const combinedL10Goals =
    (home.l10.goalsFor + home.l10.goalsAgainst + away.l10.goalsFor + away.l10.goalsAgainst) / 2;
  const combinedL5Corners =
    (home.l5.cornersFor + home.l5.cornersAgainst + away.l5.cornersFor + away.l5.cornersAgainst) / 2;
  const combinedL10Corners =
    (home.l10.cornersFor + home.l10.cornersAgainst + away.l10.cornersFor + away.l10.cornersAgainst) /
    2;
  const combinedL5CleanSheets = home.l5.cleanSheets + away.l5.cleanSheets;
  const combinedL10CleanSheets = home.l10.cleanSheets + away.l10.cleanSheets;
  const combinedL5BTTS = home.l5.bttsCount + away.l5.bttsCount;
  const combinedL10BTTS = home.l10.bttsCount + away.l10.bttsCount;

  return {
    home,
    away,
    combinedL5Goals,
    combinedL10Goals,
    combinedL5CleanSheets,
    combinedL10CleanSheets,
    combinedL5BTTS,
    combinedL10BTTS,
    combinedL5Corners,
    combinedL10Corners,
  };
}

/** Clear cache (e.g. after re-ingest). */
export function clearTeamStatsCache(): void {
  cachedHistory = null;
  cachedLeagueAverages = null;
}

/**
 * Detect a team's primary domestic league (the league type competition where
 * they have the most matches). Used for cross-league cup adjustments.
 * Returns the league id, or undefined if no league matches found.
 */
export function getTeamPrimaryLeagueId(teamName: string, asOfDate?: string): number | undefined {
  const history = getTeamHistory();
  const matches = findTeamMatches(history, teamName);
  if (!matches || matches.length === 0) return undefined;

  let filtered = matches;
  if (asOfDate) {
    const cutoff = new Date(asOfDate).getTime();
    filtered = matches.filter((m) => m.dateMs < cutoff);
  }

  // Count matches per leagueId (only league-type competitions, not cups)
  const counts = new Map<number, number>();
  for (const m of filtered) {
    if (m.leagueId == null) continue;
    if (isCup(m.leagueId)) continue;
    counts.set(m.leagueId, (counts.get(m.leagueId) ?? 0) + 1);
  }

  if (counts.size === 0) return undefined;

  // Return the league with the most matches
  let bestId: number | undefined;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
}

export type FormResult = "W" | "D" | "L";

/**
 * Get last n results (W/D/L) for a team as of a given date.
 * Uses ingested data only. Optional leagueId restricts to same competition.
 */
export function getTeamRecentResults(
  teamName: string,
  n: number = 5,
  asOfDate?: string,
  options?: { leagueId?: number }
): FormResult[] {
  const history = getTeamHistory();
  const matches = findTeamMatches(history, teamName);
  if (!matches || matches.length === 0) return [];

  let filtered = matches;
  if (asOfDate) {
    const cutoff = new Date(asOfDate).getTime();
    filtered = matches.filter((m) => m.dateMs < cutoff);
  }
  filtered = applyLeagueFilter(filtered, options?.leagueId);
  const slice = filtered.slice(-n);

  return slice.map((m): FormResult => {
    if (m.goalsFor > m.goalsAgainst) return "W";
    if (m.goalsFor < m.goalsAgainst) return "L";
    return "D";
  });
}
