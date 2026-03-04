/**
 * Read-only helpers for loading The Odds API snapshots and matching to fixtures.
 */

import fs from "fs";
import path from "path";

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

function normalizeTeamName(name: string): string {
  let n = name.toLowerCase().trim();
  for (const suffix of [" fc", " football club", " united", " city"]) {
    if (n.endsWith(suffix)) {
      n = n.slice(0, -suffix.length);
    }
  }
  return n;
}

function findOddsMatch(
  oddsSnapshot: any[],
  homeTeamName: string,
  awayTeamName: string,
  kickoffUtc: string,
  toleranceHours: number = 2
): any | null {
  const homeNorm = normalizeTeamName(homeTeamName);
  const awayNorm = normalizeTeamName(awayTeamName);
  const kickoff = new Date(kickoffUtc).getTime();

  for (const match of oddsSnapshot) {
    const oddsHome = normalizeTeamName(match.home_team || "");
    const oddsAway = normalizeTeamName(match.away_team || "");
    const oddsTime = new Date(match.commence_time || "").getTime();

    const timeDiffHours = Math.abs((kickoff - oddsTime) / (1000 * 60 * 60));

    if (
      ((oddsHome === homeNorm && oddsAway === awayNorm) ||
        (oddsHome === awayNorm && oddsAway === homeNorm)) &&
      timeDiffHours <= toleranceHours
    ) {
      return match;
    }
  }

  return null;
}

function extractMarketProbs(match: any): MarketProbabilities | null {
  if (!match.bookmakers || match.bookmakers.length === 0) return null;

  const h2hPrices: { home: number[]; draw: number[]; away: number[] } = {
    home: [],
    draw: [],
    away: [],
  };
  const totalsPrices: { over: number[]; under: number[] } = {
    over: [],
    under: [],
  };
  const bttsPrices: { yes: number[]; no: number[] } = {
    yes: [],
    no: [],
  };

  for (const book of match.bookmakers) {
    for (const market of book.markets || []) {
      if (market.key === "h2h") {
        for (const outcome of market.outcomes || []) {
          const name = outcome.name || "";
          const price = parseFloat(outcome.price) || 0;
          if (name === match.home_team) {
            h2hPrices.home.push(price);
          } else if (name === match.away_team) {
            h2hPrices.away.push(price);
          } else if (name.toLowerCase().includes("draw")) {
            h2hPrices.draw.push(price);
          }
        }
      } else if (market.key === "totals") {
        const point = market.outcomes?.[0]?.point;
        if (point === 2.5) {
          for (const outcome of market.outcomes || []) {
            const name = outcome.name || "";
            const price = parseFloat(outcome.price) || 0;
            if (name.toLowerCase().includes("over")) {
              totalsPrices.over.push(price);
            } else if (name.toLowerCase().includes("under")) {
              totalsPrices.under.push(price);
            }
          }
        }
      } else if (market.key === "both_teams_to_score") {
        for (const outcome of market.outcomes || []) {
          const name = (outcome.name || "").toLowerCase();
          const price = parseFloat(outcome.price) || 0;
          if (name === "yes") {
            bttsPrices.yes.push(price);
          } else if (name === "no") {
            bttsPrices.no.push(price);
          }
        }
      }
    }
  }

  // Compute median prices
  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const homePrice = median(h2hPrices.home);
  const drawPrice = median(h2hPrices.draw);
  const awayPrice = median(h2hPrices.away);

  if (!homePrice || !drawPrice || !awayPrice) return null;

  // Convert to probabilities and remove vig
  const pHomeRaw = 1 / homePrice;
  const pDrawRaw = 1 / drawPrice;
  const pAwayRaw = 1 / awayPrice;
  const total = pHomeRaw + pDrawRaw + pAwayRaw;

  const result: MarketProbabilities = {
    home: pHomeRaw / total,
    draw: pDrawRaw / total,
    away: pAwayRaw / total,
  };

  const overPrice = median(totalsPrices.over);
  const underPrice = median(totalsPrices.under);
  if (overPrice && underPrice) {
    const pOverRaw = 1 / overPrice;
    const pUnderRaw = 1 / underPrice;
    const totalsTotal = pOverRaw + pUnderRaw;
    if (totalsTotal > 0) {
      result.over_2_5 = pOverRaw / totalsTotal;
      result.under_2_5 = pUnderRaw / totalsTotal;
    }
  }

  const bttsYesPrice = median(bttsPrices.yes);
  const bttsNoPrice = median(bttsPrices.no);
  if (bttsYesPrice && bttsNoPrice) {
    const pYesRaw = 1 / bttsYesPrice;
    const pNoRaw = 1 / bttsNoPrice;
    const bttsTotal = pYesRaw + pNoRaw;
    if (bttsTotal > 0) {
      result.btts = pYesRaw / bttsTotal;
    }
  }

  return result;
}

/**
 * Load odds snapshot for a competition and find market probabilities for a specific match.
 */
export function getMarketProbsForMatch(
  competition: string,
  homeTeamName: string,
  awayTeamName: string,
  kickoffUtc: string
): MarketProbabilities | null {
  const dataDir = path.join(process.cwd(), "data", "odds", competition);
  if (!fs.existsSync(dataDir)) return null;

  // Try to find the most recent snapshot
  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

  for (const file of jsonFiles) {
    const filePath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const snapshot = JSON.parse(raw);
      const matches = Array.isArray(snapshot) ? snapshot : [snapshot];

      const oddsMatch = findOddsMatch(matches, homeTeamName, awayTeamName, kickoffUtc);
      if (oddsMatch) {
        return extractMarketProbs(oddsMatch);
      }
    } catch {
      // Skip invalid files
    }
  }

  return null;
}

/**
 * Load pre-computed model-vs-market comparison JSON if available.
 */
export function loadModelVsMarket(date: string): Record<string, ModelVsMarket> | null {
  const filePath = path.join(process.cwd(), "data", "model_vs_market", `${date}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
