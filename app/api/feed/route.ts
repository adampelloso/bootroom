import { getFeedMatches } from "@/lib/build-feed";
import { DEFAULT_LEAGUE_ID, ALL_COMPETITION_IDS } from "@/lib/leagues";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

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

  const matches = await getFeedMatches(from, to, leagueIds);
  return NextResponse.json({ matches });
}
