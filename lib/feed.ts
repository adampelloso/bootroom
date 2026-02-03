/**
 * App-facing feed and match types (spec Section 13).
 * Feed returns matches with top 3 insight instances; match detail returns all insights by family.
 */

export interface FeedInsight {
  id: string;
  family: string;
  headline: string;
  supportLabel: string;
  supportValue: string;
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
}

export interface MatchDetailInsight extends FeedInsight {
  narrative: string;
  totalScore: number;
}

export interface MatchDetail {
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
  insightsByFamily: Record<string, MatchDetailInsight[]>;
}
