import { getFeedMatches } from "@/lib/build-feed";
import { ALL_COMPETITION_IDS } from "@/lib/leagues";
import { computeMatchEdges } from "@/lib/edge-engine";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const leagueParam = searchParams.get("league") ?? "all";
  const leagueIds =
    leagueParam === "all"
      ? ALL_COMPETITION_IDS
      : leagueParam.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n));

  const matches = await getFeedMatches(date, undefined, leagueIds);
  const edges = matches
    .map((m) => computeMatchEdges(m))
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.bestEdge - a.bestEdge);

  return NextResponse.json(
    { edges },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
