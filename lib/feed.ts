/**
 * App-facing feed and match types (spec Section 13).
 * Feed returns matches with top 3 insight instances; match detail returns all insights by family.
 */

import type { InsightPeriod } from "@/lib/insights/catalog";

export type { InsightPeriod };

export type VenueContext = "Home" | "Away" | "Combined";

export type SignalConfidence = "Soft" | "Medium" | "Strong";

export type SignalDirection =
  | "Lean Over"
  | "Lean Under"
  | "Home bias"
  | "Away bias"
  | "BTTS No"
  | "BTTS Yes"
  | "High corners"
  | "Low corners"
  | "Team goals up"
  | "Team goals down"
  | string;

export interface FeedInsight {
  id: string;
  family: string;
  headline: string;
  supportLabel: string;
  supportValue: string;
  period?: InsightPeriod;
  /** Betting: which market this supports (e.g. BTTS, O/U). */
  market: string;
  /** Betting: which side/direction (e.g. Lean Under, BTTS No). */
  direction: SignalDirection;
  /** Betting: strength of signal. */
  confidence: SignalConfidence;
  /** Required: stat is Home, Away, or Combined. */
  venueContext: VenueContext;
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
  /** 3-letter code for feed display (e.g. ARS, MUN). Falls back to name if missing. */
  homeTeamCode?: string;
  awayTeamCode?: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  kickoffUtc: string;
  venueName?: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  highlights: FeedInsight[];
  /** Primary betting angle (e.g. "Under goals"). Always show when available. */
  primaryAngle?: string;
  /** Secondary angle (e.g. "Away corners"). */
  secondaryAngle?: string;
  /** Match volatility for bettors. */
  volatility?: "Low" | "Medium" | "High";
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
  /** 3-letter code for feed display (e.g. ARS, MUN). Falls back to name if missing. */
  homeTeamCode?: string;
  awayTeamCode?: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  kickoffUtc: string;
  venueName?: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  insightsByFamily: Record<string, MatchDetailInsight[]>;
  homeForm?: FormResult[];
  awayForm?: FormResult[];
}
