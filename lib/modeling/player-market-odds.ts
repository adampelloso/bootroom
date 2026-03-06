import type { ApiFootballOddsResponse } from "@/lib/api-football-types";
import type { FeedPlayerSimEntry } from "@/lib/feed";

type MarketKind = "scorer" | "assist";

interface MarketAggregate {
  fairProbs: number[];
  odds: number[];
  books: Set<string>;
}

interface PlayerMarketRow {
  fairProb: number;
  medianOdds: number;
  bookCount: number;
  nameScore: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function normalizeName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function initialAndLast(name: string): { initial: string; last: string } {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  if (parts.length === 0) return { initial: "", last: "" };
  return { initial: parts[0][0] ?? "", last: parts[parts.length - 1] ?? "" };
}

function classifyBetName(name: string): MarketKind | null {
  const n = name.toLowerCase();

  // Anytime scorer markets only.
  const isAnytimeScorer =
    (n.includes("anytime") && n.includes("score")) ||
    n.includes("anytime goalscorer") ||
    n.includes("player to score");
  const isNonAnytimeScorer =
    n.includes("first goalscorer") ||
    n.includes("last goalscorer") ||
    n.includes("2+ goals") ||
    n.includes("3+ goals");
  if (isAnytimeScorer && !isNonAnytimeScorer) return "scorer";

  const isAssist =
    (n.includes("anytime") && n.includes("assist")) ||
    n.includes("player assists") ||
    n.includes("to provide an assist") ||
    n.includes("to record an assist");
  if (isAssist) return "assist";

  return null;
}

function normalizeOutcomeToPlayer(raw: string): string | null {
  const n = normalizeName(raw);
  if (!n) return null;

  // Ignore generic outcomes.
  const generic = new Set([
    "home",
    "away",
    "draw",
    "yes",
    "no",
    "over",
    "under",
    "no goalscorer",
    "none",
  ]);
  if (generic.has(n)) return null;
  if (n.startsWith("over ") || n.startsWith("under ")) return null;

  return n;
}

function isLikelyNameMatch(playerName: string, marketName: string): number {
  const pNorm = normalizeName(playerName);
  const mNorm = normalizeName(marketName);
  if (!pNorm || !mNorm) return 0;
  if (pNorm === mNorm) return 1;

  const p = initialAndLast(playerName);
  const m = initialAndLast(marketName);
  if (p.last && p.last === m.last && p.initial && p.initial === m.initial) return 0.92;

  if (p.last && mNorm.includes(p.last)) return 0.72;
  if (m.last && pNorm.includes(m.last)) return 0.72;
  return 0;
}

function extractPlayerMarkets(response: ApiFootballOddsResponse): {
  scorer: Map<string, MarketAggregate>;
  assist: Map<string, MarketAggregate>;
} {
  const scorer = new Map<string, MarketAggregate>();
  const assist = new Map<string, MarketAggregate>();

  const fixture = response.response?.[0];
  if (!fixture) return { scorer, assist };

  for (const bookmaker of fixture.bookmakers ?? []) {
    for (const bet of bookmaker.bets ?? []) {
      const kind = classifyBetName(bet.name ?? "");
      if (!kind) continue;

      const rows: Array<{ player: string; odd: number }> = [];
      for (const v of bet.values ?? []) {
        const odd = Number.parseFloat(v.odd);
        const player = normalizeOutcomeToPlayer(v.value ?? "");
        if (!player || !Number.isFinite(odd) || odd <= 1.01) continue;
        rows.push({ player, odd });
      }
      if (rows.length === 0) continue;

      const targetMap = kind === "scorer" ? scorer : assist;
      for (const r of rows) {
        // Anytime scorer/assist prices are per-player binary markets,
        // not mutually exclusive across all players in the list.
        // Use per-player implied probability directly.
        const fairProb = clamp(1 / r.odd, 0.001, 0.95);
        let agg = targetMap.get(r.player);
        if (!agg) {
          agg = { fairProbs: [], odds: [], books: new Set() };
          targetMap.set(r.player, agg);
        }
        agg.fairProbs.push(fairProb);
        agg.odds.push(r.odd);
        agg.books.add(String(bookmaker.id ?? bookmaker.name ?? "book"));
      }
    }
  }

  return { scorer, assist };
}

function mapMarketToPlayers(
  players: FeedPlayerSimEntry[],
  market: Map<string, MarketAggregate>
): Map<number, PlayerMarketRow> {
  const out = new Map<number, PlayerMarketRow>();
  if (players.length === 0 || market.size === 0) return out;

  for (const [marketName, agg] of market.entries()) {
    let best: FeedPlayerSimEntry | null = null;
    let bestScore = 0;

    for (const p of players) {
      const score = isLikelyNameMatch(p.name, marketName);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    if (!best || bestScore < 0.7) continue;

    const fairProb = median(agg.fairProbs);
    const medianOdds = median(agg.odds);
    if (fairProb == null || medianOdds == null) continue;

    const existing = out.get(best.playerId);
    if (!existing || bestScore > existing.nameScore) {
      out.set(best.playerId, {
        fairProb,
        medianOdds,
        bookCount: agg.books.size,
        nameScore: bestScore,
      });
    }
  }
  return out;
}

export function attachPlayerMarketComparison(
  playerSim: { home: FeedPlayerSimEntry[]; away: FeedPlayerSimEntry[] },
  oddsResponse: ApiFootballOddsResponse | null | undefined
): { home: FeedPlayerSimEntry[]; away: FeedPlayerSimEntry[] } {
  if (!oddsResponse || !oddsResponse.response || oddsResponse.response.length === 0) {
    return playerSim;
  }

  const allPlayers = [...playerSim.home, ...playerSim.away];
  const extracted = extractPlayerMarkets(oddsResponse);
  const scorerByPlayer = mapMarketToPlayers(allPlayers, extracted.scorer);
  const assistByPlayer = mapMarketToPlayers(allPlayers, extracted.assist);

  const apply = (p: FeedPlayerSimEntry): FeedPlayerSimEntry => {
    let next = { ...p };

    const scorerMarket = scorerByPlayer.get(p.playerId);
    if (scorerMarket) {
      next.bookScorerProb = scorerMarket.fairProb;
      next.bookScorerOdds = scorerMarket.medianOdds;
      next.scorerEdgeProb = p.anytimeScorerProb - scorerMarket.fairProb;
      next.scorerEdgeEv = p.anytimeScorerProb * scorerMarket.medianOdds - 1;
    }

    const assistMarket = assistByPlayer.get(p.playerId);
    if (assistMarket) {
      next.bookAssistProb = assistMarket.fairProb;
      next.bookAssistOdds = assistMarket.medianOdds;
      next.assistEdgeProb = p.anytimeAssistProb - assistMarket.fairProb;
      next.assistEdgeEv = p.anytimeAssistProb * assistMarket.medianOdds - 1;
    }

    return next;
  };

  return {
    home: playerSim.home.map(apply),
    away: playerSim.away.map(apply),
  };
}
