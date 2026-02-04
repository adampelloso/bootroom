/**
 * Select 3 insight types for a match with diversity: max 2 per family.
 * Avoids contradictory pairs (e.g. BTTS high vs clean sheets high).
 * Deterministic when seed is provided.
 */

import type { InsightType } from "./catalog";
import { getInsightType } from "./catalog";

/** Pairs of insight keys that are contradictory and should not appear together. */
const CONTRADICTORY_PAIRS: [string, string][] = [
  ["btts_tendency_high", "btts_tendency_low"],
  ["high_total_goals_environment", "low_total_goals_environment"],
  ["high_total_corners_environment", "low_total_corners_environment"],
];

const EXCLUDED_BY_KEY = new Map<string, Set<string>>();
for (const [a, b] of CONTRADICTORY_PAIRS) {
  if (!EXCLUDED_BY_KEY.has(a)) EXCLUDED_BY_KEY.set(a, new Set());
  if (!EXCLUDED_BY_KEY.has(b)) EXCLUDED_BY_KEY.set(b, new Set());
  EXCLUDED_BY_KEY.get(a)!.add(b);
  EXCLUDED_BY_KEY.get(b)!.add(a);
}

function isExcludedByPicked(key: string, pickedKeys: Set<string>): boolean {
  const excluded = EXCLUDED_BY_KEY.get(key);
  if (!excluded) return false;
  for (const p of pickedKeys) {
    if (excluded.has(p)) return true;
  }
  return false;
}

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
 * Excludes contradictory pairs (e.g. BTTS high + clean sheets high).
 * Deterministic when seed is provided.
 */
export function selectThreeForMatch(poolKeys: string[], seed?: number): InsightType[] {
  const staging = poolKeys
    .map((key) => getInsightType(key))
    .filter(Boolean) as InsightType[];
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const shuffled = shuffle(staging, rng);
  const picked: InsightType[] = [];
  const pickedKeys = new Set<string>();
  const familyCount: Record<string, number> = {};

  for (const t of shuffled) {
    if (picked.length >= 3) break;
    const count = familyCount[t.family] ?? 0;
    if (count >= 2) continue;
    if (isExcludedByPicked(t.key, pickedKeys)) continue;
    picked.push(t);
    pickedKeys.add(t.key);
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
