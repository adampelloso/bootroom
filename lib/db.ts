import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getEnvVar } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | null = null;

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    const url = getEnvVar("TURSO_DATABASE_URL")!;
    const authToken = getEnvVar("TURSO_AUTH_TOKEN");
    _client = createClient({ url, authToken });
  }
  return _client;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient());
  }
  return _db;
}
