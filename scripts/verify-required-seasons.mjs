import fs from 'fs';
import path from 'path';
import { ALL_COMPETITION_IDS } from '../lib/leagues.ts';

const winterSeasons = [2023, 2024, 2025];
const calendarSeasons = [2024, 2025, 2026];
const calendarLeagues = new Set([253, 71, 128, 98, 292, 103, 113]);

const missing = [];
for (const leagueId of ALL_COMPETITION_IDS) {
  const seasons = calendarLeagues.has(leagueId) ? calendarSeasons : winterSeasons;
  for (const season of seasons) {
    const file = path.join(process.cwd(), 'data', `${leagueId}-${season}-fixtures.json`);
    if (!fs.existsSync(file)) {
      missing.push({ leagueId, season, reason: 'missing-file' });
      continue;
    }
    try {
      const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(arr) || arr.length === 0) {
        missing.push({ leagueId, season, reason: 'empty-file' });
      }
    } catch {
      missing.push({ leagueId, season, reason: 'invalid-json' });
    }
  }
}

const payload = {
  checkedAt: new Date().toISOString(),
  totalChecks: ALL_COMPETITION_IDS.length,
  missingCount: missing.length,
  missing: missing.slice(0, 200),
};
console.log(JSON.stringify(payload, null, 2));
if (missing.length > 0) process.exit(1);
