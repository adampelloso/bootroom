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
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
    score?: { halftime?: { home: number | null; away: number | null } };
  };
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

/** Load and merge all epl-*-fixtures.json files so we have history across seasons. */
function loadIngestedFixtures(): IngestedFixture[] {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir);
  const eplFiles = files.filter((f) => f.startsWith("epl-") && f.endsWith("-fixtures.json"));
  const all: IngestedFixture[] = [];
  for (const file of eplFiles.sort()) {
    const dataPath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) all.push(...(parsed as IngestedFixture[]));
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

function applyVenueFilter(rows: TeamMatchRow[], venue: VenueFilter): TeamMatchRow[] {
  if (venue === "all") return rows;
  return rows.filter((r) => (venue === "home" ? r.isHome : !r.isHome));
}

/**
 * Get L5, L10 and season rolling stats for a team as of a given fixture date.
 * Optional venue filter: 'home' | 'away' | 'all' (default 'all').
 */
export function getTeamStats(
  teamName: string,
  asOfDate?: string,
  options?: { venue?: VenueFilter }
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
  if (filtered.length === 0) return null;

  const l5 = computeRolling(filtered, 5);
  const l10 = computeRolling(filtered, 10);
  const season = computeRolling(filtered, filtered.length);

  return { l5, l10, season };
}

/**
 * Get last N match rows for a team (for trend charts), with opponent names.
 * Optional venue filter: 'home' | 'away' | 'all' (default 'all').
 * Chronological order (oldest first) so index 0 = earliest of the last N.
 */
export function getTeamLastNMatchRows(
  teamName: string,
  n: number,
  asOfDate?: string,
  options?: { venue?: VenueFilter }
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
  options?: { venue?: VenueFilter }
): MatchStatsResult | null {
  const venue = options?.venue ?? "all";
  const home = getTeamStats(homeTeamName, fixtureDate, { venue });
  const away = getTeamStats(awayTeamName, fixtureDate, { venue });

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
 * Uses ingested data only; returns empty array if team or data missing.
 */
export function getTeamRecentResults(
  teamName: string,
  n: number = 5,
  asOfDate?: string
): FormResult[] {
  const history = getTeamHistory();
  const matches = history.get(teamName);
  if (!matches || matches.length === 0) return [];

  let filtered = matches;
  if (asOfDate) {
    const cutoff = new Date(asOfDate).getTime();
    filtered = matches.filter((m) => m.dateMs < cutoff);
  }
  const slice = filtered.slice(-n);

  return slice.map((m): FormResult => {
    if (m.goalsFor > m.goalsAgainst) return "W";
    if (m.goalsFor < m.goalsAgainst) return "L";
    return "D";
  });
}
