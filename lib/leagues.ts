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
  // European tier 1.5
  { id: 88, label: "Eredivisie", season: 2025, type: "league", oddsKey: "eredivisie" },
  { id: 94, label: "Liga Portugal", season: 2025, type: "league", oddsKey: "portugal" },
  { id: 144, label: "Belgian Pro League", season: 2025, type: "league", oddsKey: "belgium" },
  { id: 203, label: "Süper Lig", season: 2025, type: "league", oddsKey: "turkey" },
  { id: 179, label: "Scottish Prem", season: 2025, type: "league", oddsKey: "scotland" },
  { id: 218, label: "Austrian BL", season: 2025, type: "league", oddsKey: null },
  // European tier 2
  { id: 207, label: "Swiss Super League", season: 2025, type: "league", oddsKey: null },
  { id: 119, label: "Superliga DK", season: 2025, type: "league", oddsKey: null },
  { id: 197, label: "Super League GR", season: 2025, type: "league", oddsKey: null },
  { id: 210, label: "HNL", season: 2025, type: "league", oddsKey: null },
  { id: 103, label: "Eliteserien", season: 2026, type: "league", oddsKey: null },
  { id: 113, label: "Allsvenskan", season: 2026, type: "league", oddsKey: null },
  { id: 106, label: "Ekstraklasa", season: 2025, type: "league", oddsKey: null },
  { id: 345, label: "Czech Liga", season: 2025, type: "league", oddsKey: null },
  { id: 283, label: "Romania Liga I", season: 2025, type: "league", oddsKey: null },
  // Americas
  { id: 253, label: "MLS", season: 2026, type: "league", oddsKey: "mls" },
  { id: 262, label: "Liga MX", season: 2025, type: "league", oddsKey: "ligamx" },
  { id: 71, label: "Série A BR", season: 2026, type: "league", oddsKey: "brazil_serie_a" },
  { id: 128, label: "Liga Profesional", season: 2026, type: "league", oddsKey: null },
  // Asia / Middle East / Oceania
  { id: 307, label: "Saudi Pro", season: 2025, type: "league", oddsKey: "saudi" },
  { id: 98, label: "J-League", season: 2026, type: "league", oddsKey: null },
  { id: 292, label: "K-League 1", season: 2026, type: "league", oddsKey: null },
  { id: 188, label: "A-League", season: 2025, type: "league", oddsKey: null },
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

export function isCup(leagueId: number): boolean {
  return getCompetitionByLeagueId(leagueId)?.type === "cup";
}

/** League IDs for batch ingest (all supported competitions). */
export const ALL_COMPETITION_IDS = SUPPORTED_COMPETITIONS.map((c) => c.id);

/** Static Phase-1 league eligibility for Today's Best Bets surface. */
export const TODAY_ELIGIBLE_LEAGUE_IDS_PHASE1: number[] = [
  39, 140, 135, 78, 61, // Big 5
  88, 94, 144, 179, 203, // Europe tier 1.5
  40, 79, 136, 62, // selected second tiers
];

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
  // Tier 1.5 — Strong European leagues
  94: 0.90,  // Liga Portugal
  88: 0.90,  // Eredivisie
  203: 0.85, // Turkey Süper Lig
  144: 0.85, // Belgium Pro League
  179: 0.82, // Scottish Premiership
  218: 0.82, // Austria Bundesliga
  197: 0.80, // Greece Super League
  345: 0.80, // Czech First League
  207: 0.80, // Switzerland Super League
  119: 0.80, // Denmark Superliga
  103: 0.75, // Norway Eliteserien
  210: 0.78, // Croatia HNL
  // Americas
  253: 0.72, // MLS
  262: 0.78, // Liga MX
  71: 0.82,  // Série A (Brazil)
  128: 0.80, // Liga Profesional (Argentina)
  // Asia / Middle East / Oceania
  307: 0.72, // Saudi Pro League
  98: 0.72,  // J-League
  292: 0.70, // K-League 1
  188: 0.68, // A-League
  // Tier 2 — Second divisions
  40: 0.78,  // Championship
  136: 0.78, // Serie B
  79: 0.78,  // 2. Bundesliga
  141: 0.78, // Segunda División
  62: 0.78,  // Ligue 2
  // Tier 2.5 — Smaller European leagues
  106: 0.72, // Poland Ekstraklasa
  283: 0.70, // Romania Liga I
  286: 0.72, // Serbia Super Liga
  271: 0.68, // Hungary NB I
  113: 0.75, // Sweden Allsvenskan
  332: 0.68, // Slovakia Super Liga
  172: 0.68, // Bulgaria First League
  244: 0.65, // Finland Veikkausliiga
  318: 0.65, // Cyprus First Division
  383: 0.68, // Israel Ligat Ha'al
  419: 0.60, // Azerbaijan Premyer Liqa
  // Tier 3
  41: 0.62,  // League One
  // Tier 4
  42: 0.50,  // League Two
  // European cups
  2: 1.0,    // UCL
  3: 0.92,   // UEL
  848: 0.85, // UECL
  // Domestic cups (rank with parent league)
  48: 0.95,  // FA Cup
  45: 0.90,  // EFL Cup
  137: 0.95, // Coppa Italia
  143: 0.95, // Copa del Rey
  66: 0.90,  // Coupe de France
  81: 0.95,  // DFB-Pokal
};

/** Get relative strength for a league (1.0 = top-5 baseline, lower = weaker). */
export function getLeagueStrength(leagueId: number): number {
  return LEAGUE_STRENGTH[leagueId] ?? 0.70; // unknown domestic leagues default to ~tier 2.5
}

/** Accent colors per league for UI (left border bars, pills, etc.) */
const LEAGUE_COLORS: Record<number, string> = {
  39: "#6B21A8",   // EPL — purple
  78: "#DC2626",   // Bundesliga — red
  135: "#2563EB",  // Serie A — blue
  140: "#EA580C",  // La Liga — orange
  61: "#0D9488",   // Ligue 1 — teal
  2: "#D4AF37",    // UCL — gold
  3: "#F97316",    // UEL — orange
  848: "#16A34A",  // UECL — green
  48: "#7C3AED",   // FA Cup — violet
  45: "#0EA5E9",   // EFL Cup — sky
  40: "#A855F7",   // Championship — light purple
  137: "#3B82F6",  // Coppa Italia — blue
  143: "#F59E0B",  // Copa del Rey — amber
  66: "#14B8A6",   // Coupe de France — teal
  81: "#E11D48",   // DFB-Pokal — rose
  88: "#FF6B00",   // Eredivisie — orange
  94: "#004D33",   // Liga Portugal — forest green
  144: "#C8102E",  // Belgian Pro League — red
  203: "#E30A17",  // Süper Lig — Turkish red
  179: "#003DA5",  // Scottish Prem — blue
  253: "#292929",  // MLS — dark gray
  262: "#1A472A",  // Liga MX — green
  307: "#006C35",  // Saudi Pro — green
  71: "#009B3A",   // Série A BR — Brazil green
};

export function getLeagueColor(leagueId: number): string {
  return LEAGUE_COLORS[leagueId] ?? "#64748B"; // default slate
}
