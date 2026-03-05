/**
 * Market probability types used across the codebase.
 * Formerly also contained disk-based odds snapshot readers (now replaced by Turso DB).
 */

export interface MarketProbabilities {
  home: number;
  draw: number;
  away: number;
  over_2_5?: number;
  under_2_5?: number;
  btts?: number;
}

export interface ModelVsMarket {
  model_probs?: MarketProbabilities;
  market_probs: MarketProbabilities;
  edges?: {
    home: number;
    draw: number;
    away: number;
    over_2_5?: number;
    under_2_5?: number;
  };
  evs?: {
    home: number;
    draw: number;
    away: number;
    over_2_5?: number;
    under_2_5?: number;
  };
}
