import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  if (!fs.existsSync(envPath)) return env;
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
const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

// Check odds table
const res1 = await client.execute("SELECT COUNT(*) as cnt FROM fixture_odds");
console.log(`Total odds rows: ${res1.rows[0].cnt}`);

// Check odds for today's fixtures
const today = new Date().toISOString().slice(0, 10);
const res2 = await client.execute({
  sql: `SELECT fo.fixture_id, f.home_team_name, f.away_team_name, fo.home_prob, fo.draw_prob, fo.away_prob, fo.over25_prob, fo.btts_prob
        FROM fixture_odds fo
        JOIN fixture f ON f.id = fo.fixture_id
        WHERE f.date = ?
        LIMIT 10`,
  args: [today],
});
console.log(`\nOdds for today (${today}): ${res2.rows.length}`);
for (const row of res2.rows) {
  console.log(`  ${row.home_team_name} vs ${row.away_team_name}: H=${row.home_prob} D=${row.draw_prob} A=${row.away_prob} O25=${row.over25_prob} BTTS=${row.btts_prob}`);
}

// Check what modelProbs look like for a today match
const res3 = await client.execute({
  sql: "SELECT id, home_team_name, away_team_name FROM fixture WHERE date = ? AND status = 'NS' LIMIT 5",
  args: [today],
});
console.log(`\nUpcoming fixtures today: ${res3.rows.length}`);
for (const row of res3.rows) {
  console.log(`  ${row.id}: ${row.home_team_name} vs ${row.away_team_name}`);
}

// Check if sim files exist for today
const simDir = path.join(process.cwd(), "data", "simulations");
if (fs.existsSync(simDir)) {
  const simFiles = fs.readdirSync(simDir).filter(f => f.includes(today));
  console.log(`\nSimulation files for today: ${simFiles.length}`);
  simFiles.forEach(f => console.log(`  ${f}`));
} else {
  console.log("\nNo simulations directory found");
}
