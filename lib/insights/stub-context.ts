/**
 * Stub context for filling insight templates in staging mode.
 * No real features yet; values are deterministic from fixtureId + insightKey for stable display.
 */

export interface StubContext {
  home: string;
  away: string;
  value: string;
  l5: string;
  l10: string;
  n: string;
  k: string;
  pct: string;
  diff: string;
  against: string;
}

/** Simple deterministic hash: (fixtureId + insightKey) -> 0..1. */
function seed(fixtureId: number, insightKey: string): number {
  let h = 0;
  const s = `${fixtureId}-${insightKey}`;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

/** Pick a value in range [lo, hi] from seed 0..1. */
function inRange(lo: number, hi: number, s: number): number {
  return Math.round((lo + (hi - lo) * s) * 10) / 10;
}

/** Integer in [lo, hi] from seed. */
function intIn(lo: number, hi: number, s: number): number {
  return Math.floor(lo + (hi - lo + 1) * s);
}

/**
 * Build stub context for a fixture and insight type.
 * Used to fill headline/supportValue placeholders in staging.
 */
export function buildStubContext(
  homeTeamName: string,
  awayTeamName: string,
  fixtureId: number,
  insightKey: string
): StubContext {
  const s = seed(fixtureId, insightKey);
  const s2 = seed(fixtureId, insightKey + "2");
  const s3 = seed(fixtureId, insightKey + "3");

  const value = inRange(1.8, 3.2, s);
  const l5 = inRange(2, 15, s2);
  const l10 = inRange(1.8, 12, s3);
  const n = intIn(5, 10, s);
  const k = intIn(3, n, s2);
  const pct = intIn(55, 85, s);
  const diff = inRange(2, 6, s3);
  const against = intIn(4, 12, s);

  return {
    home: homeTeamName,
    away: awayTeamName,
    value: String(value),
    l5: String(l5),
    l10: String(l10),
    n: String(n),
    k: String(k),
    pct: String(pct),
    diff: String(diff),
    against: String(against),
  };
}
