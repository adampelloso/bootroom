"use client";

import { useEffect, useMemo, useState } from "react";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function makeApiCacheKey(url: string): string {
  return `api-cache:${url}`;
}

function readStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, entry: CacheEntry<T>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage quota / availability issues
  }
}

export function useCachedApi<T>(url: string, ttlMs: number = 60_000) {
  const storageKey = useMemo(() => makeApiCacheKey(url), [url]);
  const initial = useMemo(() => {
    if (typeof window === "undefined") return null as CacheEntry<T> | null;
    const now = Date.now();
    const mem = memCache.get(storageKey) as CacheEntry<T> | undefined;
    if (mem && mem.expiresAt > now) return mem;
    const st = readStorage<T>(storageKey);
    if (st && st.expiresAt > now) {
      memCache.set(storageKey, st as CacheEntry<unknown>);
      return st;
    }
    return null;
  }, [storageKey]);

  const [data, setData] = useState<T | null>(initial?.data ?? null);
  const [loading, setLoading] = useState(initial == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();

    const mem = memCache.get(storageKey) as CacheEntry<T> | undefined;
    let hasFreshCache = false;
    if (mem && mem.expiresAt > now) {
      setData(mem.data);
      setLoading(false);
      hasFreshCache = true;
    } else {
      const st = readStorage<T>(storageKey);
      if (st && st.expiresAt > now) {
        memCache.set(storageKey, st as CacheEntry<unknown>);
        setData(st.data);
        setLoading(false);
        hasFreshCache = true;
      }
    }

    if (hasFreshCache) {
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        let request = inFlight.get(storageKey) as Promise<T> | undefined;
        if (!request) {
          request = (async () => {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            return (await res.json()) as T;
          })();
          inFlight.set(storageKey, request as Promise<unknown>);
        }
        const json = await request;
        if (cancelled) return;
        setData(json);
        setError(null);
        setLoading(false);
        const entry: CacheEntry<T> = { data: json, expiresAt: Date.now() + ttlMs };
        memCache.set(storageKey, entry as CacheEntry<unknown>);
        writeStorage(storageKey, entry);
      } catch (err) {
        if (cancelled) return;
        if (data == null) setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        inFlight.delete(storageKey);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, ttlMs, url]);

  return { data, loading, error };
}

export function primeCachedApi<T>(url: string, data: T, ttlMs: number = 60_000) {
  if (typeof window === "undefined") return;
  const key = makeApiCacheKey(url);
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
  memCache.set(key, entry as CacheEntry<unknown>);
  writeStorage(key, entry);
}
