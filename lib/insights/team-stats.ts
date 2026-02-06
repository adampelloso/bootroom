/**
 * Team rolling stats (L5/L10) computed from ingested fixture data.
 * Used to fill insight templates with real values instead of stubs.
 */

import fs from "fs";
import path from "path";

export interface RollingStats {
  goalsFor: number;
  goalsAgainst: number;
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
}

export interface TeamRollingStats {
  l5: RollingStats;
  l10: RollingStats;
  season: RollingStats;
}

interface IngestedFixture {
  fixture: {
    fixture: { date: string };
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
  btts: boolean;
  cleanSheet: boolean;
  shotsFor: number;
  shotsAgainst: number;
  sotFor: number;
  sotAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
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
  for (const file of fixtureFiles.sort()) {
    const dataPath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const el of parsed as unknown[]) {
        const entry = el as Record<string, unknown>;
        if (entry && typeof entry.fixture === "object") all.push(el as IngestedFixture);
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

    const homeRow: TeamMatchRow = {
      date,
      dateMs,
      isHome: true,
      opponentName: away,
      goalsFor: gh,
      goalsAgainst: ga,
      btts,
      cleanSheet: ga === 0,
      shotsFor: getStatValue(homeStatArr, "Total Shots"),
      shotsAgainst: getStatValue(awayStatArr, "Total Shots"),
      sotFor: getStatValue(homeStatArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(awayStatArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(homeStatArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(awayStatArr, "Corner Kicks", "Corner kicks"),
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
      btts,
      cleanSheet: gh === 0,
      shotsFor: getStatValue(awayStatArr, "Total Shots"),
      shotsAgainst: getStatValue(homeStatArr, "Total Shots"),
      sotFor: getStatValue(awayStatArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(homeStatArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(awayStatArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(homeStatArr, "Corner Kicks", "Corner kicks"),
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
    };
  }
  const count = slice.length;
  const sum = (fn: (r: TeamMatchRow) => number) => slice.reduce((a, r) => a + fn(r), 0);
  return {
    goalsFor: sum((r) => r.goalsFor) / count,
    goalsAgainst: sum((r) => r.goalsAgainst) / count,
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
  };
}

let cachedHistory: Map<string, TeamMatchRow[]> | null = null;

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
 * League-wide average goals per match for home and away teams,
 * computed across all ingested fixtures (multi-season).
 */
export function getLeagueGoalAverages(): LeagueGoalAverages {
  const history = getTeamHistory();
  let homeGoals = 0;
  let homeMatches = 0;
  let awayGoals = 0;
  let awayMatches = 0;

  for (const [, rows] of history) {
    for (const row of rows) {
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
