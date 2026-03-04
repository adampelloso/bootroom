import type { FeedMatch } from "@/lib/feed";
import { SIGNALS, type SignalCategory } from "./taxonomy";

export interface EvaluatedSignal {
  id: string;
  label: string;
  category: SignalCategory;
  shortLabel: string;
  strength: number; // 0-1 for sorting
}

export function evaluateSignals(match: FeedMatch): EvaluatedSignal[] {
  const signals: EvaluatedSignal[] = [];
  const mp = match.modelProbs;

  // Helper to add a signal
  const add = (id: string, strength: number) => {
    const def = SIGNALS[id];
    if (def) signals.push({ ...def, strength });
  };

  // Goals-related signals (use xG from modelProbs)
  const totalXg = (mp?.expectedHomeGoals ?? 0) + (mp?.expectedAwayGoals ?? 0);
  const homeXg = mp?.expectedHomeGoals ?? 0;
  const awayXg = mp?.expectedAwayGoals ?? 0;

  if (totalXg > 3.5) add("HIGH_TOTAL_XG", totalXg / 5);
  if (totalXg > 0 && totalXg < 1.8) add("LOW_TOTAL_XG", 1 - totalXg / 3);
  if (Math.abs(homeXg - awayXg) > 1.2) add("LARGE_XG_GAP", Math.abs(homeXg - awayXg) / 3);
  if (homeXg > 2.0 && awayXg < 1.0) add("HOME_DOMINANT", (homeXg - awayXg) / 3);

  // Form-based signals
  const homeForm = match.homeForm ?? [];
  const awayForm = match.awayForm ?? [];

  const homeWinStreak = countConsecutive(homeForm, "W");
  if (homeWinStreak >= 4) add("HOME_FORM_SURGE", homeWinStreak / 6);

  const awayLossStreak = countConsecutive(awayForm, "L");
  if (awayLossStreak >= 3) add("AWAY_FORM_COLLAPSE", awayLossStreak / 5);

  // Home clean sheet run: low goals-against average
  if (match.homeAvgGoalsAgainst != null && match.homeAvgGoalsAgainst < 0.4) {
    add("HOME_CLEAN_SHEET_RUN", 1 - match.homeAvgGoalsAgainst);
  }

  // Away goal drought
  if (match.awayAvgGoalsFor != null && match.awayAvgGoalsFor < 0.5) {
    add("AWAY_GOAL_DROUGHT", 1 - match.awayAvgGoalsFor);
  }

  // BTTS signals
  const bttsProb = mp?.btts ?? mp?.mcBtts ?? null;
  if (bttsProb != null && bttsProb > 0.65) add("BTTS_BOTH_SCORE_HIGH", bttsProb);

  // O2.5 streak: use market row combined hits
  const o25Row = match.marketRows.find(r => r.market === "O2.5");
  if (o25Row && o25Row.combinedHits >= 8) add("OVER_25_STREAK", o25Row.combinedHits / 10);

  // Edge-based signals
  if (match.edgeSummary) {
    if (match.edgeSummary.bestMarket === "AWAY" && match.edgeSummary.bestEdge > 0.10) {
      add("AWAY_UNDERDOG_VALUE", match.edgeSummary.bestEdge);
    }
  }

  // Corners
  const cornersRow = match.marketRows.find(r => r.market === "Corners");
  if (cornersRow && cornersRow.market === "Corners" && cornersRow.combinedAvg > 11.0) {
    add("HIGH_CORNER_MATCH", cornersRow.combinedAvg / 14);
  }

  // H2H signals (when h2hSummary has enriched data with avgGoals and bttsRate)
  // These will fire once WS3 enriches h2hSummary — for now, basic h2hSummary doesn't have avgGoals
  const h2h = match.h2hSummary;
  if (h2h) {
    const h2hAvgGoals = (h2h as any).avgGoals;
    const h2hBttsRate = (h2h as any).bttsRate;
    if (typeof h2hAvgGoals === "number" && h2hAvgGoals > 3.0) add("HIGH_SCORING_H2H", h2hAvgGoals / 4);
    if (typeof h2hAvgGoals === "number" && h2hAvgGoals < 2.0) add("LOW_SCORING_H2H", 1 - h2hAvgGoals / 3);
    if (typeof h2hBttsRate === "number" && h2hBttsRate > 0.70) add("BTTS_TREND", h2hBttsRate);
  }

  // Sort by strength descending, cap at 4
  signals.sort((a, b) => b.strength - a.strength);
  return signals.slice(0, 4);
}

function countConsecutive(form: Array<"W" | "D" | "L">, result: "W" | "D" | "L"): number {
  let count = 0;
  for (const r of form) {
    if (r === result) count++;
    else break;
  }
  return count;
}
