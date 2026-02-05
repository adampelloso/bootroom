/**
 * Derive up to 3 "What stands out" bullets from rolling stats for the match detail page.
 * Uses simple rules; league baseline can be added in v2.
 */

import type { MatchStatsResult } from "./team-stats";

type SampleRef = "l5" | "l10" | "season";

export function getWhatStandsOut(
  rollingStats: MatchStatsResult | null,
  sample: "L5" | "L10" | "Season"
): string[] {
  if (!rollingStats) return [];
  const ref: SampleRef = sample === "L5" ? "l5" : sample === "Season" ? "season" : "l10";
  const home = rollingStats.home[ref];
  const away = rollingStats.away[ref];
  const combinedGoals =
    (home.goalsFor + home.goalsAgainst + away.goalsFor + away.goalsAgainst) / 2;
  const combinedCorners =
    (home.cornersFor + home.cornersAgainst + away.cornersFor + away.cornersAgainst) / 2;
  const bullets: string[] = [];

  if (combinedGoals < 2.5) {
    bullets.push("Under goals favored (combined form).");
  } else if (combinedGoals > 2.8) {
    bullets.push("Over goals favored (combined form).");
  }

  const homeAttack = home.goalsFor;
  const awayAttack = away.goalsFor;
  if (homeAttack > awayAttack + 0.3) {
    bullets.push("Home attack stronger recently.");
  } else if (awayAttack > homeAttack + 0.3) {
    bullets.push("Away attack stronger recently.");
  }

  if (combinedCorners > 11) {
    bullets.push("Corner volume elevated (combined).");
  } else if (combinedCorners < 8 && bullets.length < 3) {
    bullets.push("Corner volume below average (combined).");
  }

  return bullets.slice(0, 3);
}
