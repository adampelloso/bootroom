import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
  return env;
}

const env = readEnv();
const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

// Check the Coupe de France fixture
const res = await client.execute({
  sql: "SELECT id, home_team_name, away_team_name, league_id, status FROM fixture WHERE id = 1519245",
  args: [],
});
console.log("Coupe de France fixture:", res.rows[0]);

// Check if the team name matches what disk has
// Disk has "Lyon" and "Lens" — does DB use same names?
const res2 = await client.execute({
  sql: `SELECT DISTINCT home_team_name FROM fixture WHERE home_team_name LIKE '%Lyon%'
        UNION
        SELECT DISTINCT away_team_name FROM fixture WHERE away_team_name LIKE '%Lyon%'`,
  args: [],
});
console.log("\nAll Lyon-like team names in DB:", res2.rows.map(r => r.home_team_name));

const res3 = await client.execute({
  sql: `SELECT DISTINCT home_team_name FROM fixture WHERE home_team_name LIKE '%Lens%'
        UNION
        SELECT DISTINCT away_team_name FROM fixture WHERE away_team_name LIKE '%Lens%'`,
  args: [],
});
console.log("All Lens-like team names in DB:", res3.rows.map(r => r.home_team_name));
