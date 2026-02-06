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

/** Season hit rate for feed (e.g. 6/10). */
export type SeasonRate = { hits: number; total: number };

/** Feed market row: BTTS, O2.5, or Corners. Max 3 per match. */
export type FeedMarketRow =
  | {
      market: "BTTS";
      homeHits: number;
      awayHits: number;
      combinedHits: number;
      avgGoals?: number;
      seasonHome?: SeasonRate;
      seasonAway?: SeasonRate;
    }
  | {
      market: "O2.5";
      homeHits: number;
      awayHits: number;
      combinedHits: number;
      avgGoals: number;
      seasonHome?: SeasonRate;
      seasonAway?: SeasonRate;
    }
  | {
      market: "Corners";
      homeAvg: number;
      awayAvg: number;
      combinedAvg: number;
      seasonHomeAvg?: number;
      seasonAwayAvg?: number;
    };

export interface FeedMatch {
  id: string;
  providerFixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  /** API-Football league id; used for form/stats filter and odds lookup. */
  leagueId?: number;
  /** Short label for badge (e.g. EPL, UCL). */
  leagueName?: string;
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
  /** Market rows for feed: BTTS, O2.5, Corners (max 3). */
  marketRows: FeedMarketRow[];
  /** Home team avg goals for/against (last 5 home). */
  homeAvgGoalsFor?: number;
  homeAvgGoalsAgainst?: number;
  /** Away team avg goals for/against (last 5 away). */
  awayAvgGoalsFor?: number;
  awayAvgGoalsAgainst?: number;
  highlights: FeedInsight[];
  homeForm?: FormResult[];
  awayForm?: FormResult[];
  h2hSummary?: H2HSummary;
  /** Model probabilities and EV flags (computed on-demand for feed). */
  modelProbs?: {
    home: number;
    draw: number;
    away: number;
    over_2_5?: number;
    edges?: {
      home: number;
      draw: number;
      away: number;
      over_2_5?: number;
    };
    evFlags?: string[];
  };
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
  /** API-Football league id; used for form/stats filter and odds lookup. */
  leagueId?: number;
  /** Short label for badge (e.g. EPL, UCL). */
  leagueName?: string;
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
  /** Decision summary: primary angle (required to show angle). */
  primaryAngle?: string;
  /** Optional secondary angle. */
  secondaryAngle?: string;
  volatility?: "Low" | "Medium" | "High";
  /** 2–3 short statements supporting the angle. */
  supportingStatements?: string[];
  homeForm?: FormResult[];
  awayForm?: FormResult[];
}
