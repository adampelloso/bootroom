/**
 * KV access helper for Cloudflare Workers.
 * On Workers: reads from env.BOOTROOM_DATA via getCloudflareContext().
 * On local dev: returns null (falls through to existing fs-based code).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface KVNamespace {
  get(key: string, options?: { type?: string }): Promise<string | null>;
}

function getKV(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    const kv = (env as Record<string, unknown>).BOOTROOM_DATA as KVNamespace | undefined;
    return kv ?? null;
  } catch {
    // Not running on Workers (local dev) — return null
    return null;
  }
}

/**
 * Read a single key from KV. Returns null if not on Workers or key not found.
 */
export async function kvGet<T>(key: string): Promise<T | null> {
  const kv = getKV();
  if (!kv) return null;
  const raw = await kv.get(key, { type: "text" });
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Read multiple keys from KV in parallel. Returns a Map of key → value.
 * Missing keys are omitted from the result.
 */
export async function kvGetMany<T>(keys: string[]): Promise<Map<string, T>> {
  const kv = getKV();
  if (!kv) return new Map();

  const results = await Promise.all(
    keys.map(async (key) => {
      const raw = await kv.get(key, { type: "text" });
      if (!raw) return [key, null] as const;
      return [key, JSON.parse(raw) as T] as const;
    }),
  );

  const map = new Map<string, T>();
  for (const [key, val] of results) {
    if (val != null) map.set(key, val);
  }
  return map;
}

/**
 * Check if we're running on Cloudflare Workers (KV is available).
 */
export function isWorkersRuntime(): boolean {
  return getKV() !== null;
}
