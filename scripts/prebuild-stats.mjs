#!/usr/bin/env node
/**
 * Pre-compute team match history from ingested fixture JSONs.
 *
 * Outputs:
 * 1. lib/generated/team-history.json — monolithic file (legacy, for bundled builds)
 * 2. data/kv-staging/ — per-team JSON files + league averages for Cloudflare KV upload
 *
 * Includes ALL seasons (not just 2025) for full historical depth.
 * Run before build: node scripts/prebuild-stats.mjs
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OUT_DIR = path.join(process.cwd(), "lib", "generated");
const OUT_FILE = path.join(OUT_DIR, "team-history.json");
const KV_STAGING_DIR = path.join(DATA_DIR, "kv-staging");

function getStatValue(stats, ...typeCandidates) {
  for (const type of typeCandidates) {
    const s = stats.find((x) => x.type === type);
    if (!s || s.value == null) continue;
    if (typeof s.value === "string") return parseFloat(s.value) || 0;
    return s.value;
  }
  return 0;
}

// Load and deduplicate ALL *-fixtures.json (all seasons)
function loadFixtures() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error("No data/ directory found");
    process.exit(1);
  }
  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith("-fixtures.json"))
    .sort();
  const all = [];
  const seenIds = new Set();
  const seenKeys = new Set();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const el of parsed) {
        if (!el || typeof el.fixture !== "object") continue;
        const fid = el.fixture?.fixture?.id;
        if (fid != null) {
          if (seenIds.has(fid)) continue;
          seenIds.add(fid);
        } else {
          const key = `${el.fixture?.fixture?.date}|${el.fixture?.teams?.home?.name}|${el.fixture?.teams?.away?.name}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
        }
        all.push(el);
      }
    } catch {
      // skip invalid files
    }
  }
  return all;
}

// Build team match rows (mirrors buildTeamMatchHistory in team-stats.ts)
function buildHistory(fixtures) {
  const byTeam = {};
  const sorted = fixtures
    .filter((f) => f.fixture?.goals?.home != null && f.fixture?.goals?.away != null)
    .sort((a, b) => new Date(a.fixture.fixture.date).getTime() - new Date(b.fixture.fixture.date).getTime());

  for (const entry of sorted) {
    const { fixture, stats } = entry;
    const home = fixture.teams?.home?.name;
    const away = fixture.teams?.away?.name;
    const date = fixture.fixture?.date;
    if (!home || !away || !date) continue;

    const gh = fixture.goals?.home ?? 0;
    const ga = fixture.goals?.away ?? 0;
    const btts = gh > 0 && ga > 0;
    const dateMs = new Date(date).getTime();
    const leagueId = entry.league?.id ?? fixture.league?.id;
    const leagueName = entry.league?.name ?? fixture.league?.name;

    const homeStats = stats?.find((s) => s.team?.name === home);
    const awayStats = stats?.find((s) => s.team?.name === away);
    const hArr = homeStats?.statistics ?? [];
    const aArr = awayStats?.statistics ?? [];

    const homeXg = hArr.some((s) => s.type === "expected_goals" && s.value != null) ? getStatValue(hArr, "expected_goals") : null;
    const awayXg = aArr.some((s) => s.type === "expected_goals" && s.value != null) ? getStatValue(aArr, "expected_goals") : null;

    const htHome = fixture.score?.halftime?.home ?? null;
    const htAway = fixture.score?.halftime?.away ?? null;

    const homeRow = {
      date, dateMs, isHome: true, opponentName: away,
      goalsFor: gh, goalsAgainst: ga,
      xgFor: homeXg, xgAgainst: awayXg,
      btts, cleanSheet: ga === 0,
      shotsFor: getStatValue(hArr, "Total Shots"),
      shotsAgainst: getStatValue(aArr, "Total Shots"),
      sotFor: getStatValue(hArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(aArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(hArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(aArr, "Corner Kicks", "Corner kicks"),
      fouls: getStatValue(hArr, "Fouls"),
      yellowCards: getStatValue(hArr, "Yellow Cards"),
      redCards: getStatValue(hArr, "Red Cards"),
      possession: parseFloat(String(getStatValue(hArr, "Ball Possession"))) || 0,
      blockedShots: getStatValue(hArr, "Blocked Shots"),
      htGoalsFor: htHome,
      htGoalsAgainst: htAway,
      leagueId, leagueName,
    };

    const awayRow = {
      date, dateMs, isHome: false, opponentName: home,
      goalsFor: ga, goalsAgainst: gh,
      xgFor: awayXg, xgAgainst: homeXg,
      btts, cleanSheet: gh === 0,
      shotsFor: getStatValue(aArr, "Total Shots"),
      shotsAgainst: getStatValue(hArr, "Total Shots"),
      sotFor: getStatValue(aArr, "Shots on Goal", "Shots on target"),
      sotAgainst: getStatValue(hArr, "Shots on Goal", "Shots on target"),
      cornersFor: getStatValue(aArr, "Corner Kicks", "Corner kicks"),
      cornersAgainst: getStatValue(hArr, "Corner Kicks", "Corner kicks"),
      fouls: getStatValue(aArr, "Fouls"),
      yellowCards: getStatValue(aArr, "Yellow Cards"),
      redCards: getStatValue(aArr, "Red Cards"),
      possession: parseFloat(String(getStatValue(aArr, "Ball Possession"))) || 0,
      blockedShots: getStatValue(aArr, "Blocked Shots"),
      htGoalsFor: htAway,
      htGoalsAgainst: htHome,
      leagueId, leagueName,
    };

    if (!byTeam[home]) byTeam[home] = [];
    byTeam[home].push(homeRow);
    if (!byTeam[away]) byTeam[away] = [];
    byTeam[away].push(awayRow);
  }

  return byTeam;
}

// Compute league goal averages from history
function computeLeagueAverages(history) {
  // Collect per-league stats
  const leagueStats = {}; // leagueId → { homeGoals, homeMatches, awayGoals, awayMatches }
  const allStats = { homeGoals: 0, homeMatches: 0, awayGoals: 0, awayMatches: 0 };

  for (const [, rows] of Object.entries(history)) {
    for (const row of rows) {
      if (row.isHome) {
        allStats.homeGoals += row.goalsFor;
        allStats.homeMatches += 1;
        if (row.leagueId != null) {
          if (!leagueStats[row.leagueId]) {
            leagueStats[row.leagueId] = { homeGoals: 0, homeMatches: 0, awayGoals: 0, awayMatches: 0 };
          }
          leagueStats[row.leagueId].homeGoals += row.goalsFor;
          leagueStats[row.leagueId].homeMatches += 1;
        }
      } else {
        allStats.awayGoals += row.goalsFor;
        allStats.awayMatches += 1;
        if (row.leagueId != null) {
          if (!leagueStats[row.leagueId]) {
            leagueStats[row.leagueId] = { homeGoals: 0, homeMatches: 0, awayGoals: 0, awayMatches: 0 };
          }
          leagueStats[row.leagueId].awayGoals += row.goalsFor;
          leagueStats[row.leagueId].awayMatches += 1;
        }
      }
    }
  }

  const averages = {};

  // Per-league averages
  for (const [leagueId, s] of Object.entries(leagueStats)) {
    averages[leagueId] = {
      homeGoals: s.homeMatches > 0 ? s.homeGoals / s.homeMatches : 0,
      awayGoals: s.awayMatches > 0 ? s.awayGoals / s.awayMatches : 0,
    };
  }

  // All-league aggregate
  averages["all"] = {
    homeGoals: allStats.homeMatches > 0 ? allStats.homeGoals / allStats.homeMatches : 0,
    awayGoals: allStats.awayMatches > 0 ? allStats.awayGoals / allStats.awayMatches : 0,
  };

  return averages;
}

// Write KV staging files (per-team + league averages)
function writeKvStaging(history, leagueAverages) {
  if (fs.existsSync(KV_STAGING_DIR)) {
    fs.rmSync(KV_STAGING_DIR, { recursive: true });
  }
  fs.mkdirSync(KV_STAGING_DIR, { recursive: true });

  let fileCount = 0;

  // Per-team files: team:{teamName} → TeamMatchRow[]
  for (const [teamName, rows] of Object.entries(history)) {
    const key = `team:${teamName}`;
    const filePath = path.join(KV_STAGING_DIR, encodeURIComponent(key) + ".json");
    fs.writeFileSync(filePath, JSON.stringify(rows));
    fileCount++;
  }

  // League averages: league-averages:{id} → { homeGoals, awayGoals }
  for (const [key, avg] of Object.entries(leagueAverages)) {
    const kvKey = `league-averages:${key}`;
    const filePath = path.join(KV_STAGING_DIR, encodeURIComponent(kvKey) + ".json");
    fs.writeFileSync(filePath, JSON.stringify(avg));
    fileCount++;
  }

  // Simulation files: sims:{YYYY-MM-DD} → SimulationFile
  const simsDir = path.join(DATA_DIR, "simulations");
  if (fs.existsSync(simsDir)) {
    const simFiles = fs.readdirSync(simsDir).filter((f) => f.endsWith(".json")).sort();
    for (const file of simFiles) {
      const date = file.replace(/\.json$/, "");
      const kvKey = `sims:${date}`;
      const raw = fs.readFileSync(path.join(simsDir, file), "utf-8");
      const filePath = path.join(KV_STAGING_DIR, encodeURIComponent(kvKey) + ".json");
      fs.writeFileSync(filePath, raw);
      fileCount++;
    }
    console.log(`Staged ${simFiles.length} simulation files`);
  }

  return fileCount;
}

// ── Main ──────────────────────────────────────────────────────────
const fixtures = loadFixtures();
console.log(`Loaded ${fixtures.length} fixtures from ${DATA_DIR}`);

const history = buildHistory(fixtures);
const teamCount = Object.keys(history).length;
const rowCount = Object.values(history).reduce((a, rows) => a + rows.length, 0);

// 1. Legacy monolithic output
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(history));
const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`Written ${OUT_FILE} (${teamCount} teams, ${rowCount} rows, ${sizeMB} MB)`);

// 2. KV staging output
const leagueAverages = computeLeagueAverages(history);
const leagueCount = Object.keys(leagueAverages).length;
const kvFileCount = writeKvStaging(history, leagueAverages);
console.log(`Written ${kvFileCount} KV staging files to ${KV_STAGING_DIR} (${teamCount} teams, ${leagueCount} league averages)`);
