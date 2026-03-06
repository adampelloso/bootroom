import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getFeedMatches } from "@/lib/build-feed";
import { ALL_COMPETITION_IDS, TODAY_ELIGIBLE_LEAGUE_IDS_PHASE1 } from "@/lib/leagues";
import { buildTodayBestBets } from "@/lib/today-best-bets";

const RESPONSE_CACHE_TTL_MS = 60_000;
const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function isoDate(input?: string | null): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = isoDate(searchParams.get("date"));
  const now = Date.now();
  const cacheKey = `today:${date}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  }

  const primaryMatches = await getFeedMatches(date, date, TODAY_ELIGIBLE_LEAGUE_IDS_PHASE1, {
    includeTeamMeta: false,
    includeH2H: false,
    includeForm: false,
  });
  let plays = buildTodayBestBets(primaryMatches);
  let source = "phase1";

  // Never return empty when there is a playable slate in non-phase1 leagues.
  if (plays.length === 0) {
    const allLeagueMatches = await getFeedMatches(date, date, ALL_COMPETITION_IDS, {
      includeTeamMeta: false,
      includeH2H: false,
      includeForm: false,
    });
    plays = buildTodayBestBets(allLeagueMatches);
    source = "all_leagues_fallback";
  }

  const pickFields = (play: (typeof plays)[number]) => ({
    id: play.id,
    fixtureId: play.fixtureId,
    marketType: play.marketType,
    marketLabel: play.marketLabel,
    simProbability: play.simProbability,
    impliedProbability: play.impliedProbability,
    edgePct: play.edgePct,
    confidenceTier: play.confidenceTier,
    rationale: play.rationale,
    leagueName: play.leagueName,
    kickoffUtc: play.kickoffUtc,
    homeTeamName: play.homeTeamName,
    awayTeamName: play.awayTeamName,
    hasBookOdds: play.hasBookOdds,
  });

  const featured = plays.slice(0, 3).map(pickFields);
  const remainder = plays.slice(3).map(pickFields);
  const payload = {
    date,
    play_count: plays.length,
    source,
    featured,
    plays: remainder,
  };

  responseCache.set(cacheKey, {
    expiresAt: now + RESPONSE_CACHE_TTL_MS,
    payload,
  });

  return NextResponse.json(
    payload,
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
