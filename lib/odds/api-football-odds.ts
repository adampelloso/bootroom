/**
 * Extract market probabilities from API-Football /odds response.
 * Reuses MarketProbabilities from the-odds-api.ts for compatibility.
 */

import type { ApiFootballOddsResponse } from "@/lib/api-football-types";
import type { MarketProbabilities } from "./the-odds-api";

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Parse an API-Football odds response into fair market probabilities.
 * Collects median decimal odds across all bookmakers, removes vig.
 */
export function extractMarketProbsFromApiFootball(
  response: ApiFootballOddsResponse,
): MarketProbabilities | null {
  const item = response.response?.[0];
  if (!item || !item.bookmakers || item.bookmakers.length === 0) return null;

  const h2hPrices = { home: [] as number[], draw: [] as number[], away: [] as number[] };
  const totalsPrices = { over: [] as number[], under: [] as number[] };
  const bttsPrices = { yes: [] as number[], no: [] as number[] };

  for (const book of item.bookmakers) {
    for (const bet of book.bets) {
      const name = bet.name;

      if (name === "Match Winner") {
        for (const v of bet.values) {
          const odd = parseFloat(v.odd);
          if (!odd || odd <= 0) continue;
          if (v.value === "Home") h2hPrices.home.push(odd);
          else if (v.value === "Draw") h2hPrices.draw.push(odd);
          else if (v.value === "Away") h2hPrices.away.push(odd);
        }
      } else if (name === "Goals Over/Under") {
        for (const v of bet.values) {
          const odd = parseFloat(v.odd);
          if (!odd || odd <= 0) continue;
          if (v.value === "Over 2.5") totalsPrices.over.push(odd);
          else if (v.value === "Under 2.5") totalsPrices.under.push(odd);
        }
      } else if (name === "Both Teams Score") {
        for (const v of bet.values) {
          const odd = parseFloat(v.odd);
          if (!odd || odd <= 0) continue;
          if (v.value === "Yes") bttsPrices.yes.push(odd);
          else if (v.value === "No") bttsPrices.no.push(odd);
        }
      }
    }
  }

  // 1X2: require all three
  const homePrice = median(h2hPrices.home);
  const drawPrice = median(h2hPrices.draw);
  const awayPrice = median(h2hPrices.away);
  if (!homePrice || !drawPrice || !awayPrice) return null;

  // Remove vig: normalize implied probabilities to sum to 1
  const pHomeRaw = 1 / homePrice;
  const pDrawRaw = 1 / drawPrice;
  const pAwayRaw = 1 / awayPrice;
  const total = pHomeRaw + pDrawRaw + pAwayRaw;

  const result: MarketProbabilities = {
    home: pHomeRaw / total,
    draw: pDrawRaw / total,
    away: pAwayRaw / total,
  };

  // O/U 2.5
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

  // BTTS
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
