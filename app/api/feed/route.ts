import { getFeedMatches } from "@/lib/build-feed";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const matches = await getFeedMatches(from, to);
  return NextResponse.json({ matches });
}
