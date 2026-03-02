import { getMatchDetail } from "@/lib/build-feed";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(match);
}
