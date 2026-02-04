export type LeagueFilterValue = "all" | `${number}`;

export interface SupportedLeague {
  id: number;
  label: string;
  season: number;
}

// Keep this list intentionally small and product-scoped.
// It powers the league dropdown + multi-league aggregation on the feed.
export const SUPPORTED_LEAGUES: SupportedLeague[] = [
  { id: 39, label: "EPL", season: 2025 },
  { id: 78, label: "Bundesliga", season: 2025 },
  { id: 135, label: "Serie A", season: 2025 },
  { id: 140, label: "La Liga", season: 2025 },
  { id: 61, label: "Ligue 1", season: 2025 },
];

export const DEFAULT_LEAGUE_ID = 39;

