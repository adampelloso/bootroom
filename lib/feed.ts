/**
 * App-facing feed and match types (spec Section 13).
 * Feed returns matches with top 3 insight instances; match detail returns all insights by family.
 */

import type { InsightPeriod } from "@/lib/insights/catalog";

export type { InsightPeriod };

export interface FeedInsight {
  id: string;
  family: string;
  headline: string;
  supportLabel: string;
  supportValue: string;
  period?: InsightPeriod;
}

export type FormResult = "W" | "D" | "L";

export interface H2HSummary {
  homeWins: number;
  draws: number;
  awayWins: number;
  lastWinner?: string;
}

export interface FeedMatch {
  id: string;
  providerFixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  kickoffUtc: string;
  venueName?: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  highlights: FeedInsight[];
  homeForm?: FormResult[];
  awayForm?: FormResult[];
  h2hSummary?: H2HSummary;
}

export interface MatchDetailInsight extends FeedInsight {
  narrative: string;
  totalScore: number;
}

export interface MatchDetail {
  id: string;
  providerFixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  kickoffUtc: string;
  venueName?: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  insightsByFamily: Record<string, MatchDetailInsight[]>;
}
