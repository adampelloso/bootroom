import { getFeedMatches } from "@/lib/build-feed";
import { DEFAULT_LEAGUE_ID, ALL_COMPETITION_IDS } from "@/lib/leagues";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

const RESPONSE_CACHE_TTL_MS = 60_000;
const responseCache = new Map<string, { expiresAt: number; payload: { matches: Awaited<ReturnType<typeof getFeedMatches>> } }>();

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const leagueParam = searchParams.get("league") ?? `${DEFAULT_LEAGUE_ID}`;
  const leagueIds =
    leagueParam === "all"
      ? ALL_COMPETITION_IDS
      : leagueParam.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n));

  const cacheKey = `${from ?? ""}|${to ?? ""}|${leagueParam}`;
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  }

  const matches = await getFeedMatches(from, to, leagueIds);
  const payload = { matches };
  responseCache.set(cacheKey, { expiresAt: now + RESPONSE_CACHE_TTL_MS, payload });
  return NextResponse.json(
    payload,
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
