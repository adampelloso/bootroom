#!/usr/bin/env node
/**
 * Debug script: load fixture files the same way team-stats does and print
 * last-10 rows for a team so we can verify values (goalsFor, shotsFor, etc.).
 * Run: node scripts/debug-team-stats.mjs [teamName]
 * Example: node scripts/debug-team-stats.mjs Liverpool
 */

import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  console.error("No data/ directory");
  process.exit(1);
}

const files = fs.readdirSync(dataDir).filter((f) => f.startsWith("epl-") && f.endsWith("-fixtures.json"));
console.log("Fixture files found:", files);

const all = [];
for (const file of files.sort()) {
  const p = path.join(dataDir, file);
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    all.push(...parsed);
    console.log(`  ${file}: ${parsed.length} fixtures`);
  }
}

console.log("Total fixtures:", all.length);

const sorted = all
  .filter((f) => f.fixture?.goals?.home != null && f.fixture?.goals?.away != null)
  .sort((a, b) => new Date(a.fixture.fixture.date).getTime() - new Date(b.fixture.fixture.date).getTime());

console.log("Fixtures with goals:", sorted.length);

const byTeam = new Map();
for (const entry of sorted) {
  const { fixture, stats } = entry;
  const home = fixture?.teams?.home?.name;
  const away = fixture?.teams?.away?.name;
  const date = fixture?.fixture?.date;
  if (!home || !away || !date) continue;

  const gh = fixture.goals?.home ?? 0;
  const ga = fixture.goals?.away ?? 0;

  function getStat(arr, type) {
    const s = arr?.find((x) => x.type === type);
    if (!s || s.value == null) return 0;
    if (typeof s.value === "string") return parseFloat(s.value) || 0;
    return s.value;
  }

  const homeStats = stats?.find((s) => s.team?.name === home);
  const awayStats = stats?.find((s) => s.team?.name === away);
  const homeStatArr = homeStats?.statistics ?? [];
  const awayStatArr = awayStats?.statistics ?? [];

  const homeRow = {
    date,
    goalsFor: gh,
    goalsAgainst: ga,
    opponentName: away,
    shotsFor: getStat(homeStatArr, "Total Shots"),
    cornersFor: getStat(homeStatArr, "Corner Kicks"),
  };
  const awayRow = {
    date,
    goalsFor: ga,
    goalsAgainst: gh,
    opponentName: home,
    shotsFor: getStat(awayStatArr, "Total Shots"),
    cornersFor: getStat(awayStatArr, "Corner Kicks"),
  };

  if (!byTeam.has(home)) byTeam.set(home, []);
  byTeam.get(home).push(homeRow);
  if (!byTeam.has(away)) byTeam.set(away, []);
  byTeam.get(away).push(awayRow);
}

const teamNames = [...byTeam.keys()].sort();
console.log("\nTeams in map (" + teamNames.length + "):", teamNames.slice(0, 15).join(", ") + (teamNames.length > 15 ? "..." : ""));

const teamName = process.argv[2] || teamNames[0] || "Liverpool";
const rows = byTeam.get(teamName);
if (!rows) {
  console.error("\nTeam not found:", teamName);
  console.log("Available:", teamNames.join(", "));
  process.exit(1);
}

const last10 = rows.slice(-10);
console.log("\nLast 10 for", teamName, "(total rows:", rows.length + "):");
console.table(last10.map((r) => ({ date: r.date.slice(0, 10), opponent: r.opponentName, goalsFor: r.goalsFor, shotsFor: r.shotsFor, cornersFor: r.cornersFor })));

const avgGoals = last10.reduce((a, r) => a + r.goalsFor, 0) / last10.length;
console.log("\nAvg goals for (L10):", avgGoals.toFixed(2));
if (last10.every((r) => r.goalsFor === 0 && r.shotsFor === 0)) {
  console.log("\n*** All zeros - check that fixture entries have 'stats' array with statistics. ***");
}
