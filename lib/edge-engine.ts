/**
 * Centralized edge computation engine.
 * Computes model-vs-book probability edges per market for a match.
 */
import type { FeedMatch } from "@/lib/feed";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "SPECULATIVE";

export interface MarketEdge {
  market: string;
  modelProb: number;
  bookProb: number;
  edge: number;
  tier: ConfidenceTier;
}

export interface MatchEdges {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  leagueId?: number;
  leagueName?: string;
  kickoffUtc: string;
  markets: MarketEdge[];
  bestMarket: string;
  bestEdge: number;
  bestTier: ConfidenceTier;
}

/** >15% = HIGH, 8-15% = MEDIUM, 4-8% = SPECULATIVE, <4% = suppress (null). */
export function getConfidenceTier(edge: number): ConfidenceTier | null {
  if (edge > 0.15) return "HIGH";
  if (edge >= 0.08) return "MEDIUM";
  if (edge >= 0.04) return "SPECULATIVE";
  return null;
}

export function computeMatchEdges(match: FeedMatch): MatchEdges | null {
  const mp = match.modelProbs;
  if (!mp?.edges || !mp.marketProbs) return null;

  const edges = mp.edges;
  const bookProbs = mp.marketProbs;
  const candidates: MarketEdge[] = [];

  // Direct markets: HOME, DRAW, AWAY
  const directMarkets: { market: string; edgeKey: keyof typeof edges; modelKey: keyof typeof mp; bookKey: keyof typeof bookProbs }[] = [
    { market: "HOME", edgeKey: "home", modelKey: "home", bookKey: "home" },
    { market: "DRAW", edgeKey: "draw", modelKey: "draw", bookKey: "draw" },
    { market: "AWAY", edgeKey: "away", modelKey: "away", bookKey: "away" },
  ];

  for (const { market, modelKey, bookKey } of directMarkets) {
    const modelProb = mp[modelKey] as number | undefined;
    const bookProb = bookProbs[bookKey];
    if (modelProb == null || bookProb == null) continue;
    const edge = modelProb - bookProb;
    if (edge >= 0.04) {
      const tier = getConfidenceTier(edge);
      if (tier) candidates.push({ market, modelProb, bookProb, edge, tier });
    }
  }

  // O2.5
  if (mp.over_2_5 != null && bookProbs.over_2_5 != null) {
    const edge = mp.over_2_5 - bookProbs.over_2_5;
    if (edge >= 0.04) {
      const tier = getConfidenceTier(edge);
      if (tier) candidates.push({ market: "O2.5", modelProb: mp.over_2_5, bookProb: bookProbs.over_2_5, edge, tier });
    }
  }

  // U2.5 (inverse of O2.5)
  if (mp.over_2_5 != null && bookProbs.over_2_5 != null) {
    const modelU25 = 1 - mp.over_2_5;
    const bookU25 = 1 - bookProbs.over_2_5;
    const edge = modelU25 - bookU25;
    if (edge >= 0.04) {
      const tier = getConfidenceTier(edge);
      if (tier) candidates.push({ market: "U2.5", modelProb: modelU25, bookProb: bookU25, edge, tier });
    }
  }

  // BTTS YES
  if (mp.btts != null && bookProbs.btts != null) {
    const edge = mp.btts - bookProbs.btts;
    if (edge >= 0.04) {
      const tier = getConfidenceTier(edge);
      if (tier) candidates.push({ market: "BTTS", modelProb: mp.btts, bookProb: bookProbs.btts, edge, tier });
    }
  }

  // BTTS NO (inverse)
  if (mp.btts != null && bookProbs.btts != null) {
    const modelNo = 1 - mp.btts;
    const bookNo = 1 - bookProbs.btts;
    const edge = modelNo - bookNo;
    if (edge >= 0.04) {
      const tier = getConfidenceTier(edge);
      if (tier) candidates.push({ market: "BTTS NO", modelProb: modelNo, bookProb: bookNo, edge, tier });
    }
  }

  // O3.5: only if we have model prob and book prob
  // Book prob for O3.5 is not typically available, so skip if missing
  const modelO35 = (mp as Record<string, unknown>).over_3_5 as number | undefined;
  if (modelO35 != null) {
    // No book prob for O3.5 available in current data — skip
  }

  if (candidates.length === 0) return null;

  // Sort by edge descending
  candidates.sort((a, b) => b.edge - a.edge);

  const best = candidates[0];
  return {
    matchId: match.id,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
    kickoffUtc: match.kickoffUtc,
    markets: candidates,
    bestMarket: best.market,
    bestEdge: best.edge,
    bestTier: best.tier,
  };
}
