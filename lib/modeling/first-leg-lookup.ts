/**
 * Look up the first-leg result for a second-leg cup fixture.
 * Reads ingested fixture data from disk to find the reversed-teams match.
 */

import fs from "fs";
import path from "path";

export interface FirstLegResult {
  /** Goals scored by the team that is HOME in leg 2 (they were AWAY in leg 1). */
  leg2HomeGoalsInLeg1: number;
  /** Goals scored by the team that is AWAY in leg 2 (they were HOME in leg 1). */
  leg2AwayGoalsInLeg1: number;
  /** From leg-2 home team's POV: positive = trailing, negative = leading, 0 = level. */
  aggregateDeficit: number;
}

interface FixtureDataItem {
  fixture: {
    fixture: { id: number; date: string; status: { short: string } };
    league: { id: number; round: string; season: number };
    teams: { home: { id: number; name: string }; away: { id: number; name: string } };
    goals: { home: number | null; away: number | null };
  };
}

// Module-level cache for fixture files (leagueId-season → parsed data)
const fixtureFileCache = new Map<string, FixtureDataItem[]>();

function loadFixtureFile(leagueId: number, season: number): FixtureDataItem[] | null {
  const cacheKey = `${leagueId}-${season}`;
  if (fixtureFileCache.has(cacheKey)) return fixtureFileCache.get(cacheKey)!;

  const filePath = path.join(process.cwd(), "data", `${leagueId}-${season}-fixtures.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const items: FixtureDataItem[] = Array.isArray(raw) ? raw : raw.response ?? [];
    fixtureFileCache.set(cacheKey, items);
    return items;
  } catch {
    return null;
  }
}

/**
 * Find the first-leg result for a second-leg cup fixture.
 *
 * In 2-leg ties, the same round name appears for both legs, but
 * home/away teams are reversed. The first leg has an earlier date.
 *
 * Returns null if no first leg is found (single-leg round, first leg
 * not yet played, data not ingested, or 0-0 draw detection via aggregateDeficit=0).
 */
export function findFirstLegResult(
  leagueId: number,
  season: number,
  round: string,
  leg2HomeTeamName: string,
  leg2AwayTeamName: string,
  leg2KickoffUtc: string,
): FirstLegResult | null {
  const items = loadFixtureFile(leagueId, season);
  if (!items) return null;

  const leg2Date = new Date(leg2KickoffUtc).getTime();

  for (const item of items) {
    const f = item.fixture;
    if (f.league.round !== round) continue;

    // First leg has reversed teams: leg-2's home was away in leg 1, and vice versa
    if (f.teams.home.name !== leg2AwayTeamName) continue;
    if (f.teams.away.name !== leg2HomeTeamName) continue;

    // Must be before leg 2
    const fDate = new Date(f.fixture.date).getTime();
    if (fDate >= leg2Date) continue;

    // Must have a final score
    if (f.goals.home == null || f.goals.away == null) continue;
    if (f.fixture.status.short !== "FT" && f.fixture.status.short !== "AET" && f.fixture.status.short !== "PEN") continue;

    // In leg 1: home scored f.goals.home, away scored f.goals.away
    // Leg-2 home team was AWAY in leg 1 → they scored f.goals.away
    // Leg-2 away team was HOME in leg 1 → they scored f.goals.home
    const leg2HomeGoalsInLeg1 = f.goals.away;
    const leg2AwayGoalsInLeg1 = f.goals.home;

    // Positive deficit = leg-2 home team is trailing on aggregate
    const aggregateDeficit = leg2AwayGoalsInLeg1 - leg2HomeGoalsInLeg1;

    return {
      leg2HomeGoalsInLeg1,
      leg2AwayGoalsInLeg1,
      aggregateDeficit,
    };
  }

  return null;
}
