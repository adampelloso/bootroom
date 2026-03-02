import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";
import { getEnvVar } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const client = createClient({
      url: getEnvVar("TURSO_DATABASE_URL")!,
      authToken: getEnvVar("TURSO_AUTH_TOKEN"),
    });
    _db = drizzle(client);
  }
  return _db;
}
