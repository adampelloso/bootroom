import type { FeedMatch } from "@/lib/feed";

export function generateNarrative(match: FeedMatch): string {
  const mp = match.modelProbs;
  const homeCode = match.homeTeamCode ?? match.homeTeamName;
  const awayCode = match.awayTeamCode ?? match.awayTeamName;
  const totalXg = (mp?.expectedHomeGoals ?? 0) + (mp?.expectedAwayGoals ?? 0);
  const homeXg = mp?.expectedHomeGoals ?? 0;
  const awayXg = mp?.expectedAwayGoals ?? 0;
  const bttsProb = mp?.btts ?? mp?.mcBtts ?? null;
  const o25Prob = mp?.over_2_5 ?? mp?.mcOver25 ?? null;

  // Try templates in priority order — first match wins

  // 1. Strong home dominance
  if (homeXg > 2.0 && awayXg < 1.0) {
    return `${homeCode} are projected to dominate at home with ${homeXg.toFixed(1)} xG, while ${awayCode} struggle to create — projections sit at just ${awayXg.toFixed(1)} xG.`;
  }

  // 2. High-scoring clash
  if (totalXg > 3.5) {
    return `A high-scoring affair is projected here. Combined xG of ${totalXg.toFixed(1)} suggests goals are likely, with both attacks showing strong form.`;
  }

  // 3. Defensive battle
  if (totalXg > 0 && totalXg < 1.8) {
    return `This one looks tight. Combined xG of just ${totalXg.toFixed(1)} points to a disciplined, low-scoring contest between these two sides.`;
  }

  // 4. BTTS backed by trends
  if (bttsProb != null && bttsProb > 0.65 && o25Prob != null && o25Prob > 0.60) {
    return `Both sides have been finding the net regularly, and the model rates both BTTS and over 2.5 as strong outcomes in this matchup.`;
  }

  // 5. Form divergence
  const homeForm = match.homeForm ?? [];
  const awayForm = match.awayForm ?? [];
  const homeWins = homeForm.filter(r => r === "W").length;
  const awayLosses = awayForm.filter(r => r === "L").length;
  if (homeWins >= 7 && awayLosses >= 5) {
    return `Form is sharply divided. ${homeCode} have won ${homeWins} of their last 10 while ${awayCode} have lost ${awayLosses} — a real gulf in momentum.`;
  }

  // 6. Edge-driven play
  if (match.edgeSummary && match.edgeSummary.bestEdge > 0.15) {
    return `The model identifies a significant edge of +${Math.round(match.edgeSummary.bestEdge * 100)}% on ${match.edgeSummary.bestMarket}. This is one of the standout projections of the day.`;
  }

  // 7. Strong BTTS signal
  if (bttsProb != null && bttsProb > 0.70) {
    return `Both teams scoring is the headline angle here. Both attacks are creating enough to trouble the opposition.`;
  }

  // 8. Over 2.5 strong
  if (o25Prob != null && o25Prob > 0.70) {
    return `Over 2.5 goals grades as a strong outcome here. Recent form from both sides supports the expectation of a multi-goal game.`;
  }

  // 9. Corners highlight
  const cornersRow = match.marketRows.find(r => r.market === "Corners");
  if (cornersRow && cornersRow.market === "Corners" && cornersRow.combinedAvg > 11) {
    return `This fixture averages ${cornersRow.combinedAvg.toFixed(1)} corners per match from recent games. Both teams are generating set-piece opportunities consistently.`;
  }

  // 10. Large xG gap
  if (Math.abs(homeXg - awayXg) > 1.2) {
    const favTeam = homeXg > awayXg ? homeCode : awayCode;
    const gap = Math.abs(homeXg - awayXg).toFixed(1);
    return `${favTeam} hold a ${gap} xG advantage in projections. The numbers suggest a clear quality gap between these two sides.`;
  }

  // 11. Moderate edge
  if (match.edgeSummary && match.edgeSummary.bestEdge > 0.08) {
    return `The model spots a +${Math.round(match.edgeSummary.bestEdge * 100)}% edge on ${match.edgeSummary.bestMarket}, making this a fixture worth watching closely.`;
  }

  // 12. Balanced matchup
  if (totalXg >= 2.0 && totalXg <= 3.0 && Math.abs(homeXg - awayXg) < 0.5) {
    return `An evenly matched contest is projected. With combined xG of ${totalXg.toFixed(1)} and little separating the two sides, this could go either way.`;
  }

  // 13. Home advantage
  if (homeXg > awayXg * 1.5 && homeXg > 1.3) {
    return `${homeCode} should enjoy home advantage here, with projections giving them the edge in expected goal creation.`;
  }

  // 14. Away resilience
  if (awayXg > homeXg && awayXg > 1.3) {
    return `${awayCode} are projected to carry a slight edge despite being away from home — a potential value opportunity.`;
  }

  // 15. Default
  return `${homeCode} host ${awayCode} with combined xG of ${totalXg > 0 ? totalXg.toFixed(1) : "TBD"} from the model projections.`;
}
