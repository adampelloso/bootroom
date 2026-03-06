import type { FeedMatch, FeedPlayerSimEntry } from "@/lib/feed";

export type TodayMarketType =
  | "match_result"
  | "over_under_goals"
  | "btts"
  | "team_totals"
  | "first_half_goals"
  | "corners"
  | "cards"
  | "player_goals_1plus"
  | "player_assists_1plus"
  | "player_shots_2plus"
  | "player_sot_1plus";

export type TodayTier = "STRONG" | "GOOD" | "WATCHLIST";

export interface TodayBestBet {
  id: string;
  fixtureId: number;
  marketType: TodayMarketType;
  marketLabel: string;
  simProbability: number;
  impliedProbability: number;
  edgePct: number;
  bestBetScore: number;
  confidenceTier: TodayTier;
  rationale: string;
  leagueId?: number;
  leagueName?: string;
  kickoffUtc: string;
  homeTeamName: string;
  awayTeamName: string;
  isPlayerProp: boolean;
  playerId?: number;
  playerName?: string;
  hasBookOdds: boolean;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function calcScore(simProbability: number, edgePct: number, confidenceWeight: number): number {
  return (simProbability * 0.6 + edgePct * 0.4) * confidenceWeight;
}

function getTier(score: number): TodayTier {
  if (score >= 0.55) return "STRONG";
  if (score >= 0.45) return "GOOD";
  return "WATCHLIST";
}

function marketRationale(play: {
  marketLabel: string;
  homeTeamName: string;
  awayTeamName: string;
  edgePct: number;
  expectedHomeGoals?: number;
  expectedAwayGoals?: number;
  hasBookOdds: boolean;
}): string {
  const edgePct = Math.round(play.edgePct * 1000) / 10;
  const edgeText = `${edgePct >= 0 ? "+" : ""}${edgePct}%`;
  const totalXg =
    play.expectedHomeGoals != null && play.expectedAwayGoals != null
      ? play.expectedHomeGoals + play.expectedAwayGoals
      : null;

  if (!play.hasBookOdds) {
    if (play.marketLabel.includes("Over 2.5") && totalXg != null) {
      return `${play.homeTeamName} and ${play.awayTeamName} project ${totalXg.toFixed(1)} total xG. Model leans ${play.marketLabel}.`;
    }
    return `Model leans ${play.marketLabel} based on simulated matchup profile.`;
  }

  if (play.marketLabel.includes("Over 2.5") && totalXg != null && totalXg > 3.0) {
    return `${play.homeTeamName} and ${play.awayTeamName} project ${totalXg.toFixed(1)} total xG. Model shows a ${edgeText} edge on ${play.marketLabel}.`;
  }
  if (play.marketLabel.includes("BTTS")) {
    return `Both teams profile as active in chance creation for this matchup. Model shows a ${edgeText} edge on ${play.marketLabel}.`;
  }
  return `Model shows a ${edgeText} edge on ${play.marketLabel}.`;
}

function playerRationale(play: {
  playerName: string;
  marketLabel: string;
  edgePct: number;
  expectedGoals?: number;
  expectedShots?: number;
  expectedSOT?: number;
  hasBookOdds: boolean;
}): string {
  const edgePct = Math.round(play.edgePct * 1000) / 10;
  const edgeText = `${edgePct >= 0 ? "+" : ""}${edgePct}%`;
  if (!play.hasBookOdds) {
    return `${play.playerName} rates as a model lean for ${play.marketLabel}.`;
  }
  if (play.marketLabel.includes("Scorer") && play.expectedGoals != null) {
    return `${play.playerName} projects around ${play.expectedGoals.toFixed(2)} xG-equivalent involvement. Model shows a ${edgeText} edge on ${play.marketLabel}.`;
  }
  if (play.marketLabel.includes("Assist") && play.expectedShots != null) {
    return `${play.playerName} rates strongly in chance creation volume. Model shows a ${edgeText} edge on ${play.marketLabel}.`;
  }
  if (play.marketLabel.includes("SOT") && play.expectedSOT != null) {
    return `${play.playerName} projects ${play.expectedSOT.toFixed(2)} shots on target. Model shows a ${edgeText} edge on ${play.marketLabel}.`;
  }
  return `${play.playerName} shows a ${edgeText} edge on ${play.marketLabel}.`;
}

function confidenceWeightForMatch(match: FeedMatch): number {
  const leagueId = match.leagueId;
  if (leagueId == null) return 0.85;
  // soft quality weighting (no hard cutoff)
  if ([39, 78, 135, 140, 61, 88, 94, 144, 203, 179].includes(leagueId)) return 1.0;
  if ([40, 79, 136, 62].includes(leagueId)) return 0.95;
  return 0.88;
}

function buildMatchMarketPlays(match: FeedMatch): TodayBestBet[] {
  const out: TodayBestBet[] = [];
  const mp = match.modelProbs;
  if (!mp) return out;
  const confidenceWeight = confidenceWeightForMatch(match);

  const expectedHomeGoals = mp.expectedHomeGoals;
  const expectedAwayGoals = mp.expectedAwayGoals;
  const hasBook = mp.marketProbs != null;

  const push = (
    marketType: TodayMarketType,
    marketLabel: string,
    simProbability: number | null | undefined,
    impliedProbability: number | null | undefined,
  ) => {
    if (simProbability == null) return;
    const sim = clamp01(simProbability);
    const imp = clamp01(impliedProbability ?? sim);
    const edge = sim - imp;
    if (hasBook && edge <= 0) return;
    const score = calcScore(sim, edge, confidenceWeight);
    const tier = getTier(score);
    out.push({
      id: `${match.providerFixtureId}:${marketType}:${marketLabel}`,
      fixtureId: match.providerFixtureId,
      marketType,
      marketLabel,
      simProbability: sim,
      impliedProbability: imp,
      edgePct: edge,
      bestBetScore: score,
      confidenceTier: tier,
      rationale: marketRationale({
        marketLabel,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        edgePct: edge,
        expectedHomeGoals,
        expectedAwayGoals,
        hasBookOdds: hasBook,
      }),
      leagueId: match.leagueId,
      leagueName: match.leagueName,
      kickoffUtc: match.kickoffUtc,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      isPlayerProp: false,
      hasBookOdds: hasBook,
    });
  };

  push("match_result", hasBook ? "Home Win" : "Home Win (Model Lean)", mp.home, mp.marketProbs?.home);
  push("match_result", hasBook ? "Draw" : "Draw (Model Lean)", mp.draw, mp.marketProbs?.draw);
  push("match_result", hasBook ? "Away Win" : "Away Win (Model Lean)", mp.away, mp.marketProbs?.away);
  push("over_under_goals", hasBook ? "Over 2.5 Goals" : "Over 2.5 Goals (Model Lean)", mp.over_2_5, mp.marketProbs?.over_2_5);
  if (mp.over_2_5 != null) {
    const underBook = mp.marketProbs?.over_2_5 != null ? 1 - mp.marketProbs.over_2_5 : undefined;
    push("over_under_goals", hasBook ? "Under 2.5 Goals" : "Under 2.5 Goals (Model Lean)", 1 - mp.over_2_5, underBook);
  }
  push("btts", hasBook ? "BTTS Yes" : "BTTS Yes (Model Lean)", mp.btts, mp.marketProbs?.btts);
  if (mp.btts != null) {
    const noBook = mp.marketProbs?.btts != null ? 1 - mp.marketProbs.btts : undefined;
    push("btts", hasBook ? "BTTS No" : "BTTS No (Model Lean)", 1 - mp.btts, noBook);
  }

  return out;
}

function buildPlayerPropPlaysForSide(
  entries: FeedPlayerSimEntry[] | undefined,
  match: FeedMatch,
): TodayBestBet[] {
  if (!entries || entries.length === 0) return [];
  const out: TodayBestBet[] = [];
  const confidenceWeight = confidenceWeightForMatch(match);
  for (const p of entries) {
    const push = (
      marketType: TodayMarketType,
      marketLabel: string,
      simProbability: number | null | undefined,
      impliedProbability: number | null | undefined,
    ) => {
      if (simProbability == null || impliedProbability == null) return;
      const sim = clamp01(simProbability);
      const imp = clamp01(impliedProbability);
      const edge = sim - imp;
      if (edge <= 0) return;
      const score = calcScore(sim, edge, confidenceWeight);
      const tier = getTier(score);
      out.push({
        id: `${match.providerFixtureId}:player:${p.playerId}:${marketLabel}`,
        fixtureId: match.providerFixtureId,
        marketType,
        marketLabel,
        simProbability: sim,
        impliedProbability: imp,
        edgePct: edge,
        bestBetScore: score,
        confidenceTier: tier,
        rationale: playerRationale({
          playerName: p.name,
          marketLabel,
          edgePct: edge,
          expectedGoals: p.expectedGoals,
          expectedShots: p.expectedShots,
          expectedSOT: p.expectedSOT,
          hasBookOdds: true,
        }),
        leagueId: match.leagueId,
        leagueName: match.leagueName,
        kickoffUtc: match.kickoffUtc,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        isPlayerProp: true,
        playerId: p.playerId,
        playerName: p.name,
        hasBookOdds: true,
      });
    };

    push("player_goals_1plus", `${p.name} Anytime Scorer`, p.anytimeScorerProb, p.bookScorerProb);
    push("player_assists_1plus", `${p.name} Anytime Assist`, p.anytimeAssistProb, p.bookAssistProb);
  }
  return out;
}

function buildPlayerPropPlays(match: FeedMatch): TodayBestBet[] {
  if (!match.playerSim) return [];
  return [
    ...buildPlayerPropPlaysForSide(match.playerSim.home, match),
    ...buildPlayerPropPlaysForSide(match.playerSim.away, match),
  ];
}

function uniqueById(plays: TodayBestBet[]): TodayBestBet[] {
  const seen = new Set<string>();
  const out: TodayBestBet[] = [];
  for (const p of plays) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export function buildTodayBestBets(matches: FeedMatch[]): TodayBestBet[] {
  const plays = matches.flatMap((m) => [
    ...buildMatchMarketPlays(m),
    ...buildPlayerPropPlays(m),
  ]);
  plays.sort((a, b) => b.bestBetScore - a.bestBetScore);
  return uniqueById(plays).slice(0, 40);
}
