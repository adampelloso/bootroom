import { cookies } from "next/headers";
import { ALL_COMPETITION_IDS } from "@/lib/leagues";

const COOKIE_NAME = "followed_leagues";

/** Read followed league IDs from cookie. Returns all leagues if no preference set. */
export async function getFollowedLeagueIds(): Promise<number[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return ALL_COMPETITION_IDS;

  const ids = raw
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n) && ALL_COMPETITION_IDS.includes(n));

  return ids.length > 0 ? ids : ALL_COMPETITION_IDS;
}
