export type LeagueFilterValue = "all" | `${number}`;

export interface SupportedLeague {
  id: number;
  label: string;
  season: number;
}

/** Competition type for feed, form, and odds. */
export type CompetitionType = "league" | "cup";

export interface SupportedCompetition {
  id: number;
  label: string;
  season: number;
  type: CompetitionType;
  /** The Odds API competition code (e.g. 'epl', 'ucl'). Null = no odds ingestion for this competition. */
  oddsKey: string | null;
}

// Single source of truth for all supported leagues and cups.
// oddsKey maps to scripts/ingest-odds.py SPORT_MAP; null means fixtures/stats only, no odds.
export const SUPPORTED_COMPETITIONS: SupportedCompetition[] = [
  // Big 5 leagues
  { id: 39, label: "EPL", season: 2025, type: "league", oddsKey: "epl" },
  { id: 78, label: "Bundesliga", season: 2025, type: "league", oddsKey: "bundesliga" },
  { id: 135, label: "Serie A", season: 2025, type: "league", oddsKey: "seriea" },
  { id: 140, label: "La Liga", season: 2025, type: "league", oddsKey: "laliga" },
  { id: 61, label: "Ligue 1", season: 2025, type: "league", oddsKey: "ligue1" },
  // Second-tier leagues (stats/form for cup opponents)
  { id: 40, label: "Championship", season: 2025, type: "league", oddsKey: null },
  { id: 41, label: "League One", season: 2025, type: "league", oddsKey: null },
  { id: 42, label: "League Two", season: 2025, type: "league", oddsKey: null },
  { id: 136, label: "Serie B", season: 2025, type: "league", oddsKey: null },
  { id: 79, label: "2. Bundesliga", season: 2025, type: "league", oddsKey: null },
  { id: 141, label: "Segunda Div.", season: 2025, type: "league", oddsKey: null },
  { id: 62, label: "Ligue 2", season: 2025, type: "league", oddsKey: null },
  // European cups
  { id: 2, label: "UCL", season: 2025, type: "cup", oddsKey: "ucl" },
  { id: 3, label: "UEL", season: 2025, type: "cup", oddsKey: "uel" },
  { id: 848, label: "UECL", season: 2025, type: "cup", oddsKey: "uecl" },
  // Domestic cups (API-Football league IDs; oddsKey null where Odds API may not list)
  { id: 48, label: "FA Cup", season: 2025, type: "cup", oddsKey: "fa_cup" },
  { id: 45, label: "EFL Cup", season: 2025, type: "cup", oddsKey: "efl_cup" },
  { id: 137, label: "Coppa Italia", season: 2025, type: "cup", oddsKey: null },
  { id: 143, label: "Copa del Rey", season: 2025, type: "cup", oddsKey: null },
  { id: 66, label: "Coupe de France", season: 2025, type: "cup", oddsKey: null },
  { id: 81, label: "DFB-Pokal", season: 2025, type: "cup", oddsKey: null },
];

/** Backward compatibility: Big 5 leagues only, for default feed filter. */
export const SUPPORTED_LEAGUES: SupportedLeague[] = SUPPORTED_COMPETITIONS.filter(
  (c) => c.type === "league"
).map((c) => ({ id: c.id, label: c.label, season: c.season }));

export const DEFAULT_LEAGUE_ID = 39;

const COMPETITION_BY_ID = new Map(SUPPORTED_COMPETITIONS.map((c) => [c.id, c]));

export function getCompetitionByLeagueId(leagueId: number): SupportedCompetition | undefined {
  return COMPETITION_BY_ID.get(leagueId);
}

/** Returns The Odds API competition code for a league id, or null if no odds. */
export function getOddsKeyForLeagueId(leagueId: number): string | null {
  return getCompetitionByLeagueId(leagueId)?.oddsKey ?? null;
}

export function isCup(leagueId: number): boolean {
  return getCompetitionByLeagueId(leagueId)?.type === "cup";
}

/** League IDs for batch ingest (all supported competitions). */
export const ALL_COMPETITION_IDS = SUPPORTED_COMPETITIONS.map((c) => c.id);

/**
 * Relative league strength factors for cross-league (cup) match adjustments.
 * 1.0 = top-5 European league baseline. Lower values mean weaker league.
 * Used to scale attack/defence when teams from different tiers meet in cups.
 */
const LEAGUE_STRENGTH: Record<number, number> = {
  // Tier 1 — Big 5
  39: 1.0,   // EPL
  78: 1.0,   // Bundesliga
  135: 1.0,  // Serie A
  140: 1.0,  // La Liga
  61: 1.0,   // Ligue 1
  // Tier 2 — Second divisions
  40: 0.78,  // Championship
  136: 0.78, // Serie B
  79: 0.78,  // 2. Bundesliga
  141: 0.78, // Segunda División
  62: 0.78,  // Ligue 2
  // Tier 3
  41: 0.62,  // League One
  // Tier 4
  42: 0.50,  // League Two
};

/** Get relative strength for a league (1.0 = top-5 baseline, lower = weaker). */
export function getLeagueStrength(leagueId: number): number {
  return LEAGUE_STRENGTH[leagueId] ?? 0.70; // unknown domestic leagues default to ~tier 2.5
}