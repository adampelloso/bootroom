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

export interface InsightType {
  key: string;
  family: InsightFamily;
  title: string;
  description: string;
  headlineTemplate: string;
  supportLabel: string;
  supportValueTemplate: string;
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
  // A) Goals (4)
  {
    key: "high_total_goals_environment",
    family: "Goals",
    title: "High total goals environment",
    description: "Match-level goals trend materially above league baseline.",
    headlineTemplate: "Combined goals per match (L5): {value}",
    supportLabel: "Both sides score in last {n}",
    supportValueTemplate: "{k}",
    marketKey: "total_goals",
  },
  {
    key: "low_total_goals_environment",
    family: "Goals",
    title: "Low total goals environment",
    description: "Match-level goals trend materially below league baseline.",
    headlineTemplate: "{home} + {away} goals avg (L10): {value}",
    supportLabel: "Both sides score in last {n}",
    supportValueTemplate: "{k}",
    marketKey: "total_goals",
  },
  {
    key: "btts_tendency_high",
    family: "Goals",
    title: "BTTS tendency high",
    description: "Both teams scoring frequency elevated.",
    headlineTemplate: "Both sides score in {k} of last {n}",
    supportLabel: "BTTS rate",
    supportValueTemplate: "{pct}%",
    marketKey: "btts",
  },
  {
    key: "btts_tendency_low",
    family: "Goals",
    title: "BTTS tendency low",
    description: "Both teams scoring frequency depressed.",
    headlineTemplate: "Clean sheets in {k} of last {n}",
    supportLabel: "BTTS rate",
    supportValueTemplate: "{pct}%",
    marketKey: "btts",
  },
  {
    key: "home_goals_trending_up",
    family: "Goals",
    title: "Home team goals trending up",
    description: "Home team scoring rate increasing vs season baseline.",
    headlineTemplate: "{home} avg {l5} goals at home (L5)",
    supportLabel: "Goals allowed (L5)",
    supportValueTemplate: "{against}",
    marketKey: "team_totals",
  },
  {
    key: "away_goals_trending_up",
    family: "Goals",
    title: "Away team goals trending up",
    description: "Away team scoring rate increasing vs season baseline.",
    headlineTemplate: "{away} avg {l5} goals away (L5)",
    supportLabel: "Goals allowed (L5)",
    supportValueTemplate: "{against}",
    marketKey: "team_totals",
  },
  {
    key: "home_goals_trending_down",
    family: "Goals",
    title: "Home team goals trending down",
    description: "Home team scoring rate decreasing vs season baseline.",
    headlineTemplate: "{home} goals allowed (L5): {against}",
    supportLabel: "Home goals per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "team_totals",
  },
  {
    key: "away_goals_trending_down",
    family: "Goals",
    title: "Away team goals trending down",
    description: "Away team scoring rate decreasing vs season baseline.",
    headlineTemplate: "{away} goals allowed (L5): {against}",
    supportLabel: "Away goals per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "team_totals",
  },
  {
    key: "first_half_goals_tilt",
    family: "Goals",
    title: "First-half goals tilt",
    description: "Goals skew toward the first half.",
    headlineTemplate: "1H goals avg (L5): {value}",
    supportLabel: "First-half goals (last {n})",
    supportValueTemplate: "{k}",
    marketKey: "first_half_total_goals",
  },
  {
    key: "second_half_goals_tilt",
    family: "Goals",
    title: "Second-half goals tilt",
    description: "Goals skew toward the second half.",
    headlineTemplate: "2H goals avg (L5): {value}",
    supportLabel: "Second-half goals (last {n})",
    supportValueTemplate: "{k}",
    marketKey: "second_half_total_goals",
  },
  // B) Control (4)
  {
    key: "shot_dominance_edge",
    family: "Control",
    title: "Shot dominance edge",
    description: "Large shots-for minus shots-against differential.",
    headlineTemplate: "{home} shots diff +{diff} (L5)",
    supportLabel: "Shots per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "match_result",
  },
  {
    key: "sot_dominance_edge",
    family: "Control",
    title: "Shots on target dominance edge",
    description: "Large SOT-for minus SOT-against differential.",
    headlineTemplate: "{home} SOT per match (L5): {l5}",
    supportLabel: "SOT against (L5)",
    supportValueTemplate: "{against}",
    marketKey: "team_shots_on_target",
  },
  {
    key: "opponent_shots_suppressed",
    family: "Control",
    title: "Opponent shots suppressed",
    description: "Team consistently limits opponent shot volume.",
    headlineTemplate: "{home} shots allowed (L5): {against}",
    supportLabel: "Shots per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "team_shots",
  },
  {
    key: "one_sided_match_profile",
    family: "Control",
    title: "One-sided match profile",
    description: "Large control differential suggests imbalance.",
    headlineTemplate: "Shots diff +{diff} (L5)",
    supportLabel: "SOT per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "match_result",
  },
  {
    key: "underdog_resilience_profile",
    family: "Control",
    title: "Underdog resilience profile",
    description: "Underdog allows limited shots despite results.",
    headlineTemplate: "{away} shots per match (L5): {l5}",
    supportLabel: "Shots allowed (L5)",
    supportValueTemplate: "{against}",
    marketKey: "double_chance",
  },
  // C) Corners (4)
  {
    key: "high_total_corners_environment",
    family: "Corners",
    title: "High total corners environment",
    description: "Match-level corners trend above baseline.",
    headlineTemplate: "Combined corners per match (L5): {value}",
    supportLabel: "10.5+ corners in last {n}",
    supportValueTemplate: "{k}",
    marketKey: "total_corners",
  },
  {
    key: "low_total_corners_environment",
    family: "Corners",
    title: "Low total corners environment",
    description: "Match-level corners trend below baseline.",
    headlineTemplate: "Combined corners per match (L5): {value}",
    supportLabel: "10.5+ corners in last {n}",
    supportValueTemplate: "{k}",
    marketKey: "total_corners",
  },
  {
    key: "home_corners_dominance_trend",
    family: "Corners",
    title: "Home corners dominance trend",
    description: "Home team corners elevated vs baseline.",
    headlineTemplate: "{home} corners per match (L5): {l5}",
    supportLabel: "Corners diff (L5)",
    supportValueTemplate: "+{diff}",
    marketKey: "team_corners",
  },
  {
    key: "away_corners_dominance_trend",
    family: "Corners",
    title: "Away corners dominance trend",
    description: "Away team corners elevated vs baseline.",
    headlineTemplate: "{away} corners per match (L5): {l5}",
    supportLabel: "Corners diff (L5)",
    supportValueTemplate: "+{diff}",
    marketKey: "team_corners",
  },
  {
    key: "opponent_corners_suppressed",
    family: "Corners",
    title: "Opponent corners suppressed",
    description: "Team consistently limits opponent corner volume.",
    headlineTemplate: "{home} corners allowed (L5): {against}",
    supportLabel: "Corners per match (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "most_corners",
  },
  {
    key: "trailing_pressure_profile",
    family: "Corners",
    title: "Trailing pressure profile",
    description: "Corners increase significantly when trailing.",
    headlineTemplate: "Combined corners per match (L5): {value}",
    supportLabel: "10.5+ corners in last {n}",
    supportValueTemplate: "{k}",
    marketKey: "total_corners",
  },
  // D) Players (4)
  {
    key: "primary_shooter_concentration",
    family: "Players",
    title: "Primary shooter concentration",
    description: "One player accounts for large share of team shots.",
    headlineTemplate: "Top shooter share: {pct}%",
    supportLabel: "Player shots (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "anytime_goalscorer",
  },
  {
    key: "distributed_shooting_profile",
    family: "Players",
    title: "Distributed shooting profile",
    description: "No clear primary shooter.",
    headlineTemplate: "Player shots (L5): {l5}",
    supportLabel: "Shots (L5 vs L10)",
    supportValueTemplate: "{l5} / {l10}",
    marketKey: "player_shots",
  },
  {
    key: "player_shots_trending_up",
    family: "Players",
    title: "Player shots trending up",
    description: "Player shot volume increasing vs baseline.",
    headlineTemplate: "Shots (L5 vs L10): {l5} / {l10}",
    supportLabel: "Player shots (L5)",
    supportValueTemplate: "{l5}",
    marketKey: "player_shots",
  },
  {
    key: "team_shot_volume_boost_spot",
    family: "Players",
    title: "Team shot volume boost spot",
    description: "Team context inflates all shooter volume.",
    headlineTemplate: "Player SOT (L5): {l5}",
    supportLabel: "SOT (L5 vs L10)",
    supportValueTemplate: "{l5} / {l10}",
    marketKey: "player_shots_on_target",
  },
  // E) Timing (4)
  {
    key: "high_variance_match_profile",
    family: "Timing",
    title: "High variance match profile",
    description: "Wide dispersion in totals and events.",
    headlineTemplate: "1H goals share: {pct}%",
    supportLabel: "2H goals share",
    supportValueTemplate: "{pct}%",
    marketKey: "higher_scoring_half",
  },
  {
    key: "comeback_frequency",
    family: "Timing",
    title: "Comeback frequency",
    description: "Team frequently recovers after conceding first.",
    headlineTemplate: "{home} half-win rate (L5): {pct}%",
    supportLabel: "{away} half-win rate (L5)",
    supportValueTemplate: "{pct}%",
    marketKey: "win_either_half",
  },
  {
    key: "late_chaos_profile",
    family: "Timing",
    title: "Late chaos profile",
    description: "Late goals + late corners elevated together.",
    headlineTemplate: "Second-half goals in {k} of last {n}",
    supportLabel: "2H goals avg (L5)",
    supportValueTemplate: "{value}",
    marketKey: "second_half_total_goals",
  },
  {
    key: "scoreline_clustering",
    family: "Timing",
    title: "Scoreline clustering",
    description: "Matches repeatedly land in narrow score bands.",
    headlineTemplate: "Common scoreband in {k} of last {n}",
    supportLabel: "Total goals avg (L5)",
    supportValueTemplate: "{value}",
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
