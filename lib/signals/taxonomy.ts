export type SignalCategory = "goals" | "form" | "corners" | "discipline" | "meta";

export interface SignalDef {
  id: string;
  label: string;
  category: SignalCategory;
  /** Short color-appropriate class/label for UI display. */
  shortLabel: string;
}

export const SIGNALS: Record<string, SignalDef> = {
  HIGH_SCORING_H2H: { id: "HIGH_SCORING_H2H", label: "High-scoring rivalry", category: "goals", shortLabel: "H2H Goals" },
  LOW_SCORING_H2H: { id: "LOW_SCORING_H2H", label: "Tight rivalry", category: "goals", shortLabel: "Low H2H" },
  BTTS_TREND: { id: "BTTS_TREND", label: "Both teams scoring trend", category: "goals", shortLabel: "BTTS Trend" },
  HOME_FORM_SURGE: { id: "HOME_FORM_SURGE", label: "Home on a run", category: "form", shortLabel: "Home Form" },
  AWAY_FORM_COLLAPSE: { id: "AWAY_FORM_COLLAPSE", label: "Away struggling", category: "form", shortLabel: "Away Weak" },
  HIGH_CORNER_MATCH: { id: "HIGH_CORNER_MATCH", label: "High corners projected", category: "corners", shortLabel: "Corners" },
  REFEREE_BOOKS_OFTEN: { id: "REFEREE_BOOKS_OFTEN", label: "Card-heavy referee", category: "discipline", shortLabel: "Cards" },
  REFEREE_TIGHT: { id: "REFEREE_TIGHT", label: "Lenient referee", category: "discipline", shortLabel: "Low Cards" },
  HOME_CLEAN_SHEET_RUN: { id: "HOME_CLEAN_SHEET_RUN", label: "Home defensive form", category: "form", shortLabel: "Clean Sheet" },
  AWAY_GOAL_DROUGHT: { id: "AWAY_GOAL_DROUGHT", label: "Away can't score", category: "form", shortLabel: "No Goals" },
  LARGE_XG_GAP: { id: "LARGE_XG_GAP", label: "Lopsided xG", category: "goals", shortLabel: "xG Gap" },
  LOW_TOTAL_XG: { id: "LOW_TOTAL_XG", label: "Low-scoring projected", category: "goals", shortLabel: "Under" },
  HIGH_TOTAL_XG: { id: "HIGH_TOTAL_XG", label: "Goal-fest projected", category: "goals", shortLabel: "Over" },
  BTTS_BOTH_SCORE_HIGH: { id: "BTTS_BOTH_SCORE_HIGH", label: "Both defenses leak", category: "goals", shortLabel: "BTTS" },
  OVER_25_STREAK: { id: "OVER_25_STREAK", label: "Goals trend", category: "goals", shortLabel: "O2.5 Streak" },
  HOME_DOMINANT: { id: "HOME_DOMINANT", label: "Strong home advantage", category: "form", shortLabel: "Home Dom" },
  AWAY_UNDERDOG_VALUE: { id: "AWAY_UNDERDOG_VALUE", label: "Away edge", category: "form", shortLabel: "Away Edge" },
  HIGH_SHOT_MATCH: { id: "HIGH_SHOT_MATCH", label: "Shot-heavy projected", category: "corners", shortLabel: "Shots" },
  LINEUP_UNCONFIRMED: { id: "LINEUP_UNCONFIRMED", label: "Lineup unknown", category: "meta", shortLabel: "No Lineup" },
  KEY_PLAYER_MISSING: { id: "KEY_PLAYER_MISSING", label: "Key absence", category: "meta", shortLabel: "Missing" },
};

/** Color for signal category pills. */
export const CATEGORY_COLORS: Record<SignalCategory, string> = {
  goals: "var(--color-edge-strong)",     // green
  form: "var(--color-accent)",           // accent/blue
  corners: "var(--color-amber)",         // amber
  discipline: "#EF4444",                 // red
  meta: "var(--text-tertiary)",          // gray
};
