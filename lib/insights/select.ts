/**
 * Select 3 insight types for a match with diversity: max 2 per family.
 * Random by default; deterministic when a seed is provided.
 */

import type { InsightType } from "./catalog";
import { getInsightType } from "./catalog";

/** Fisher-Yates shuffle. */
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick 3 insight types with max 2 from the same family.
 * Random on every call unless a seed is provided.
 * If seed is provided, selection is deterministic for that seed.
 */
export function selectThreeForMatch(poolKeys: string[], seed?: number): InsightType[] {
  const staging = poolKeys
    .map((key) => getInsightType(key))
    .filter(Boolean) as InsightType[];
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const shuffled = shuffle(staging, rng);
  const picked: InsightType[] = [];
  const familyCount: Record<string, number> = {};

  for (const t of shuffled) {
    if (picked.length >= 3) break;
    const count = familyCount[t.family] ?? 0;
    if (count >= 2) continue;
    picked.push(t);
    familyCount[t.family] = count + 1;
  }

  return picked;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
