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

for (const team of ["Lyon", "Lens"]) {
  const res = await client.execute({
    sql: `SELECT id, date, home_team_name, away_team_name, home_goals, away_goals, league_id, status
          FROM fixture
          WHERE (home_team_name = ? OR away_team_name = ?)
            AND status = 'FT'
            AND date < '2026-03-05'
          ORDER BY date DESC LIMIT 10`,
    args: [team, team],
  });
  console.log(`\n${team} last 10 from DB:`);
  for (const r of res.rows.reverse()) {
    const isHome = r.home_team_name === team;
    const gf = isHome ? r.home_goals : r.away_goals;
    const ga = isHome ? r.away_goals : r.home_goals;
    const result = gf > ga ? "W" : gf < ga ? "L" : "D";
    console.log(`  ${r.date} ${r.home_team_name} ${r.home_goals}-${r.away_goals} ${r.away_team_name} [${result}] league=${r.league_id}`);
  }
}
