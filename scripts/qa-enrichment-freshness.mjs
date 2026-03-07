import fs from "fs";
import path from "path";

function collectFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(dir, name));
}

function hoursSince(tsMs) {
  return (Date.now() - tsMs) / (1000 * 60 * 60);
}

function summarizeAge(files) {
  if (files.length === 0) {
    return { count: 0, newestHours: null, oldestHours: null, staleCount: 0 };
  }
  const ages = files.map((f) => hoursSince(fs.statSync(f).mtimeMs));
  return {
    count: files.length,
    newestHours: Math.min(...ages),
    oldestHours: Math.max(...ages),
    staleCount: 0,
    ages,
  };
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return "-";
  return `${v.toFixed(1)}h`;
}

async function main() {
  const maxAgeHours = Number(process.env.ENRICHMENT_MAX_AGE_HOURS ?? 48);
  const dataDir = path.join(process.cwd(), "data");
  const fixtureFiles = collectFiles(dataDir, "-fixtures.json");
  const playerFiles = collectFiles(dataDir, "-players.json");

  const fixtureAge = summarizeAge(fixtureFiles);
  const playerAge = summarizeAge(playerFiles);

  const staleFixtures = fixtureFiles.filter((f) => hoursSince(fs.statSync(f).mtimeMs) > maxAgeHours);
  const stalePlayers = playerFiles.filter((f) => hoursSince(fs.statSync(f).mtimeMs) > maxAgeHours);

  const payload = {
    maxAgeHours,
    fixtures: {
      count: fixtureAge.count,
      newest: fmt(fixtureAge.newestHours),
      oldest: fmt(fixtureAge.oldestHours),
      staleCount: staleFixtures.length,
    },
    players: {
      count: playerAge.count,
      newest: fmt(playerAge.newestHours),
      oldest: fmt(playerAge.oldestHours),
      staleCount: stalePlayers.length,
    },
  };
  console.log(JSON.stringify(payload, null, 2));

  const staleTotal = staleFixtures.length + stalePlayers.length;
  if (staleTotal > 0) {
    console.error(
      `[qa-enrichment] WARNING: ${staleTotal} enrichment files exceed ${maxAgeHours}h freshness window`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[qa-enrichment] Unhandled error:", err);
  process.exit(1);
});
