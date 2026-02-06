import { getTeamStats, getMatchStats } from "@/lib/insights/team-stats";

export interface TeamRollingFeatures {
  goalsForL5: number;
  goalsAgainstL5: number;
  goalsForL10: number;
  goalsAgainstL10: number;
  goalsForSeason: number;
  goalsAgainstSeason: number;
  shotsForL5: number;
  shotsAgainstL5: number;
  shotsForSeason: number;
  shotsAgainstSeason: number;
  sotForL5: number;
  sotAgainstL5: number;
  cornersForL5: number;
  cornersAgainstL5: number;
  cornersForSeason: number;
  cornersAgainstSeason: number;
  bttsL5: number;
  bttsL10: number;
  o25L5: number;
  o25L10: number;
}

export interface CombinedFeatures {
  combinedL5Goals: number;
  combinedL10Goals: number;
  combinedL5BTTS: number;
  combinedL10BTTS: number;
  combinedL5Corners: number;
  combinedL10Corners: number;
}

export interface MatchFeatures {
  homeTeamName: string;
  awayTeamName: string;
  fixtureDate?: string;
  home: TeamRollingFeatures | null;
  away: TeamRollingFeatures | null;
  combined: CombinedFeatures | null;
}

function buildTeamRollingFeatures(teamName: string, fixtureDate?: string): TeamRollingFeatures | null {
  const stats = getTeamStats(teamName, fixtureDate, { venue: "all" });
  if (!stats) return null;

  const { l5, l10, season } = stats;

  const safeDiv = (num: number, den: number): number => (den > 0 ? num / den : 0);

  return {
    goalsForL5: l5.goalsFor,
    goalsAgainstL5: l5.goalsAgainst,
    goalsForL10: l10.goalsFor,
    goalsAgainstL10: l10.goalsAgainst,
    goalsForSeason: season.goalsFor,
    goalsAgainstSeason: season.goalsAgainst,
    shotsForL5: l5.shotsFor,
    shotsAgainstL5: l5.shotsAgainst,
    shotsForSeason: season.shotsFor,
    shotsAgainstSeason: season.shotsAgainst,
    sotForL5: l5.sotFor,
    sotAgainstL5: l5.sotAgainst,
    cornersForL5: l5.cornersFor,
    cornersAgainstL5: l5.cornersAgainst,
    cornersForSeason: season.cornersFor,
    cornersAgainstSeason: season.cornersAgainst,
    bttsL5: l5.bttsCount,
    bttsL10: l10.bttsCount,
    o25L5: safeDiv(stats.l5.o25Count, l5.matchCount),
    o25L10: safeDiv(stats.l10.o25Count, l10.matchCount),
  };
}

/**
 * Build a feature snapshot for a match using current rolling stats.
 * Intended for both pre-match inference and offline training (when iterated over historical fixtures).
 */
export function buildMatchFeatures(
  homeTeamName: string,
  awayTeamName: string,
  fixtureDate?: string
): MatchFeatures {
  const home = buildTeamRollingFeatures(homeTeamName, fixtureDate);
  const away = buildTeamRollingFeatures(awayTeamName, fixtureDate);

  const matchStats = getMatchStats(homeTeamName, awayTeamName, fixtureDate, { venue: "all" });

  const combined: CombinedFeatures | null = matchStats
    ? {
        combinedL5Goals: matchStats.combinedL5Goals,
        combinedL10Goals: matchStats.combinedL10Goals,
        combinedL5BTTS: matchStats.combinedL5BTTS,
        combinedL10BTTS: matchStats.combinedL10BTTS,
        combinedL5Corners: matchStats.combinedL5Corners,
        combinedL10Corners: matchStats.combinedL10Corners,
      }
    : null;

  return {
    homeTeamName,
    awayTeamName,
    fixtureDate,
    home,
    away,
    combined,
  };
}

