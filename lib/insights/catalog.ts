/**
 * Insight type catalog: key, family, title, and display templates.
 * Full 50 types in spec; staging subset defined separately for random feed assignment.
 */

export type InsightFamily =
  | "Goals"
  | "Control"
  | "Corners"
  | "Players"
  | "Timing";

export type InsightPeriod = "L5" | "L10" | "Combined L5" | "Combined L10";

export interface InsightType {
  key: string;
  family: InsightFamily;
  title: string;
  description: string;
  headlineTemplate: string;
  supportLabel: string;
  supportValueTemplate: string;
  period?: InsightPeriod;
  marketKey?: MarketKey;
  /** If true, included in staging random pool. */
  staging?: boolean;
}

export type MarketKey =
  | "match_result"
  | "double_chance"
  | "draw_no_bet"
  | "total_goals"
  | "team_totals"
  | "btts"
  | "correct_score_band"
  | "first_half_result"
  | "first_half_total_goals"
  | "second_half_total_goals"
  | "higher_scoring_half"
  | "win_either_half"
  | "total_corners"
  | "team_corners"
  | "most_corners"
  | "team_shots"
  | "team_shots_on_target"
  | "anytime_goalscorer"
  | "player_shots"
  | "player_shots_on_target"
  | "player_assists";

/** Full catalog (subset used for feed staging). */
const INSIGHT_TYPES: InsightType[] = [
  // A) Goals
  {
    key: "high_total_goals_environment",
    family: "Goals",
    title: "High total goals environment",
    description: "Match-level goals trend materially above league baseline.",
    headlineTemplate: "Combined goals/match: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "total_goals",
  },
  {
    key: "low_total_goals_environment",
    family: "Goals",
    title: "Low total goals environment",
    description: "Match-level goals trend materially below league baseline.",
    headlineTemplate: "{home} + {away} goals avg: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L10",
    marketKey: "total_goals",
  },
  {
    key: "btts_tendency_high",
    family: "Goals",
    title: "BTTS tendency high",
    description: "Both teams scoring frequency elevated.",
    headlineTemplate: "BTTS in {k} of last {n}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L10",
    marketKey: "btts",
  },
  {
    key: "btts_tendency_low",
    family: "Goals",
    title: "BTTS tendency low",
    description: "Both teams scoring frequency depressed.",
    headlineTemplate: "Clean sheets: {combinedCleanSheets}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L10",
    marketKey: "btts",
  },
  {
    key: "home_goals_trending_up",
    family: "Goals",
    title: "Home team goals trending up",
    description: "Home team scoring rate increasing vs season baseline.",
    headlineTemplate: "{home} avg {l5} goals at home",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_totals",
  },
  {
    key: "away_goals_trending_up",
    family: "Goals",
    title: "Away team goals trending up",
    description: "Away team scoring rate increasing vs season baseline.",
    headlineTemplate: "{away} avg {l5} goals away",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_totals",
  },
  {
    key: "home_goals_trending_down",
    family: "Goals",
    title: "Home team goals trending down",
    description: "Home team scoring rate decreasing vs season baseline.",
    headlineTemplate: "{home} goals allowed: {against}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_totals",
  },
  {
    key: "away_goals_trending_down",
    family: "Goals",
    title: "Away team goals trending down",
    description: "Away team scoring rate decreasing vs season baseline.",
    headlineTemplate: "{away} goals allowed: {against}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_totals",
  },
  {
    key: "first_half_goals_tilt",
    family: "Goals",
    title: "First-half goals tilt",
    description: "Goals skew toward the first half.",
    headlineTemplate: "1H goals avg: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "first_half_total_goals",
  },
  {
    key: "second_half_goals_tilt",
    family: "Goals",
    title: "Second-half goals tilt",
    description: "Goals skew toward the second half.",
    headlineTemplate: "2H goals avg: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "second_half_total_goals",
  },
  // B) Control
  {
    key: "shot_dominance_edge",
    family: "Control",
    title: "Shot dominance edge",
    description: "Large shots-for minus shots-against differential.",
    headlineTemplate: "{home} shots diff +{diff}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "match_result",
  },
  {
    key: "sot_dominance_edge",
    family: "Control",
    title: "Shots on target dominance edge",
    description: "Large SOT-for minus SOT-against differential.",
    headlineTemplate: "{home} SOT/match: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_shots_on_target",
  },
  {
    key: "opponent_shots_suppressed",
    family: "Control",
    title: "Opponent shots suppressed",
    description: "Team consistently limits opponent shot volume.",
    headlineTemplate: "{home} shots allowed/game: {against}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L10",
    marketKey: "team_shots",
  },
  {
    key: "one_sided_match_profile",
    family: "Control",
    title: "One-sided match profile",
    description: "Large control differential suggests imbalance.",
    headlineTemplate: "Shots diff +{diff}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "match_result",
  },
  {
    key: "underdog_resilience_profile",
    family: "Control",
    title: "Underdog resilience profile",
    description: "Underdog allows limited shots despite results.",
    headlineTemplate: "{away} shots/game: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L10",
    marketKey: "double_chance",
  },
  // C) Corners
  {
    key: "high_total_corners_environment",
    family: "Corners",
    title: "High total corners environment",
    description: "Match-level corners trend above baseline.",
    headlineTemplate: "Combined corners/match: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "total_corners",
  },
  {
    key: "low_total_corners_environment",
    family: "Corners",
    title: "Low total corners environment",
    description: "Match-level corners trend below baseline.",
    headlineTemplate: "Combined corners/match: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "total_corners",
  },
  {
    key: "home_corners_dominance_trend",
    family: "Corners",
    title: "Home corners dominance trend",
    description: "Home team corners elevated vs baseline.",
    headlineTemplate: "{home} corners/match: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_corners",
  },
  {
    key: "away_corners_dominance_trend",
    family: "Corners",
    title: "Away corners dominance trend",
    description: "Away team corners elevated vs baseline.",
    headlineTemplate: "{away} corners/match: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "team_corners",
  },
  {
    key: "opponent_corners_suppressed",
    family: "Corners",
    title: "Opponent corners suppressed",
    description: "Team consistently limits opponent corner volume.",
    headlineTemplate: "{home} corners allowed: {against}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "most_corners",
  },
  {
    key: "trailing_pressure_profile",
    family: "Corners",
    title: "Trailing pressure profile",
    description: "Corners increase significantly when trailing.",
    headlineTemplate: "Combined corners/match: {value}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "total_corners",
  },
  // D) Players
  {
    key: "primary_shooter_concentration",
    family: "Players",
    title: "Primary shooter concentration",
    description: "One player accounts for large share of team shots.",
    headlineTemplate: "Top shooter share: {pct}%",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "anytime_goalscorer",
  },
  {
    key: "distributed_shooting_profile",
    family: "Players",
    title: "Distributed shooting profile",
    description: "No clear primary shooter.",
    headlineTemplate: "Player shots: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "player_shots",
  },
  {
    key: "player_shots_trending_up",
    family: "Players",
    title: "Player shots trending up",
    description: "Player shot volume increasing vs baseline.",
    headlineTemplate: "Shots (L5 vs L10): {l5} / {l10}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "player_shots",
  },
  {
    key: "team_shot_volume_boost_spot",
    family: "Players",
    title: "Team shot volume boost spot",
    description: "Team context inflates all shooter volume.",
    headlineTemplate: "Player SOT: {l5}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "player_shots_on_target",
  },
  // E) Timing
  {
    key: "high_variance_match_profile",
    family: "Timing",
    title: "High variance match profile",
    description: "Wide dispersion in totals and events.",
    headlineTemplate: "1H goals share: {pct}%",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "higher_scoring_half",
  },
  {
    key: "comeback_frequency",
    family: "Timing",
    title: "Comeback frequency",
    description: "Team frequently recovers after conceding first.",
    headlineTemplate: "{home} half-win rate: {pct}%",
    supportLabel: "",
    supportValueTemplate: "",
    period: "L5",
    marketKey: "win_either_half",
  },
  {
    key: "late_chaos_profile",
    family: "Timing",
    title: "Late chaos profile",
    description: "Late goals + late corners elevated together.",
    headlineTemplate: "2H goals in {k} of last {n}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "second_half_total_goals",
  },
  {
    key: "scoreline_clustering",
    family: "Timing",
    title: "Scoreline clustering",
    description: "Matches repeatedly land in narrow score bands.",
    headlineTemplate: "Common scoreband in {k} of last {n}",
    supportLabel: "",
    supportValueTemplate: "",
    period: "Combined L5",
    marketKey: "correct_score_band",
  },
];

/** Focused feed list (match props only, no player props). */
const MATCH_MARKET_KEYS: MarketKey[] = [
  "match_result",
  "double_chance",
  "draw_no_bet",
  "total_goals",
  "team_totals",
  "btts",
  "correct_score_band",
  "first_half_result",
  "first_half_total_goals",
  "second_half_total_goals",
  "higher_scoring_half",
  "win_either_half",
  "total_corners",
  "team_corners",
  "most_corners",
  "team_shots",
  "team_shots_on_target",
];

const PLAYER_MARKET_KEYS: MarketKey[] = [
  "anytime_goalscorer",
  "player_shots",
  "player_shots_on_target",
  "player_assists",
];

const MATCH_MARKET_SET = new Set(MATCH_MARKET_KEYS);
const PLAYER_MARKET_SET = new Set(PLAYER_MARKET_KEYS);

export const FEED_INSIGHT_KEYS: string[] = INSIGHT_TYPES.filter(
  (t) => t.marketKey && MATCH_MARKET_SET.has(t.marketKey),
).map((t) => t.key);

/** Match detail pool (match + player props). */
export const DETAIL_INSIGHT_KEYS: string[] = INSIGHT_TYPES.filter(
  (t) => t.marketKey && (MATCH_MARKET_SET.has(t.marketKey) || PLAYER_MARKET_SET.has(t.marketKey)),
).map((t) => t.key);

const BY_KEY = new Map(INSIGHT_TYPES.map((t) => [t.key, t]));

export function getInsightType(key: string): InsightType | undefined {
  return BY_KEY.get(key);
}

export function getStagingInsightTypes(): InsightType[] {
  const byKey = new Map(INSIGHT_TYPES.map((t) => [t.key, t]));
  return FEED_INSIGHT_KEYS.map((key) => byKey.get(key)).filter(Boolean) as InsightType[];
}

export function getInsightTypesByFamily(): Record<InsightFamily, InsightType[]> {
  const byFamily: Record<string, InsightType[]> = {
    Goals: [],
    Control: [],
    Corners: [],
    Players: [],
    Timing: [],
  };
  for (const t of INSIGHT_TYPES) {
    byFamily[t.family].push(t);
  }
  return byFamily as Record<InsightFamily, InsightType[]>;
}
