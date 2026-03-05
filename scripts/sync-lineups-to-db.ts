/**
 * Extract per-match lineup data from ingested fixture JSON files
 * and push to the fixture_lineup table in Turso.
 *
 * Usage: npx tsx scripts/sync-lineups-to-db.ts [--league=39]
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { upsertFixtureLineups, type FixtureLineupRow } from "./lib/db-writer";

// Position short code → full name
const POS_MAP: Record<string, string> = { G: "Goalkeeper", D: "Defender", M: "Midfielder", F: "Attacker" };

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    out[key] = value ?? true;
  }
  return out;
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }

  const args = parseArgs();
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) { console.error("No data/ directory"); process.exit(1); }

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith("-fixtures.json"));
  if (typeof args.league === "string") {
    const prefix = `${args.league}-`;
    const filtered = files.filter((f) => f.startsWith(prefix));
    if (filtered.length === 0) { console.log(`No fixture files for league ${args.league}`); return; }
    files.length = 0;
    files.push(...filtered);
  }

  let totalRows = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let data: any[];
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!Array.isArray(data)) continue;
    } catch { continue; }

    const rows: FixtureLineupRow[] = [];

    for (const entry of data) {
      const players = entry.players;
      if (!Array.isArray(players) || players.length === 0) continue;

      // Get fixture ID from the nested structure
      const fixtureId = entry.fixture?.fixture?.id ?? entry.fixture?.id;
      if (!fixtureId) continue;

      for (const teamBlock of players) {
        const teamId = teamBlock.team?.id;
        if (!teamId || !Array.isArray(teamBlock.players)) continue;

        for (const p of teamBlock.players) {
          const playerId = p.player?.id;
          const playerName = p.player?.name;
          if (!playerId || !playerName) continue;

          const stats = p.statistics?.[0]?.games;
          if (!stats) continue;

          const started = stats.substitute === false ? 1 : 0;
          const position = POS_MAP[stats.position] ?? stats.position ?? null;
          const minutes = stats.minutes ?? null;

          rows.push({
            fixtureId,
            teamId,
            playerId,
            playerName,
            position,
            started,
            minutes,
          });
        }
      }
    }

    if (rows.length > 0) {
      process.stdout.write(`${file}: ${rows.length} player rows... `);
      await upsertFixtureLineups(rows);
      console.log("done");
      totalRows += rows.length;
    }
  }

  console.log(`\nTotal: ${totalRows} lineup rows synced to DB.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
