import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getEnvVar } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | null = null;

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    const url = getEnvVar("TURSO_DATABASE_URL")!;
    const authToken = getEnvVar("TURSO_AUTH_TOKEN");
    // The @libsql/hrana-client creates node-fetch Request objects via cross-fetch.
    // On Cloudflare Workers, native fetch doesn't understand node-fetch Request.
    // This wrapper extracts URL + options so native fetch can handle them.
    const workerFetch: typeof globalThis.fetch = (input, init) => {
      if (typeof input === "object" && "url" in input && "method" in input) {
        return globalThis.fetch(input.url, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          ...init,
        });
      }
      return globalThis.fetch(input, init);
    };
    _client = createClient({ url, authToken, fetch: workerFetch });
  }
  return _client;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient());
  }
  return _db;
}

