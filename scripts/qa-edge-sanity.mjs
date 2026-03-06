import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    env[key] = rest.join('=').replace(/^"|"$/g, '');
  }
  return env;
}

function applyTable(raw, xs, ys) {
  if (!Number.isFinite(raw) || raw < 0 || raw > 1 || !xs?.length || !ys?.length) return raw;
  const x0 = xs[0];
  const xN = xs[xs.length - 1];
  if (raw <= x0) return ys[0];
  if (raw >= xN) return ys[ys.length - 1];
  let lo = 0;
  let hi = xs.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= raw && raw <= xs[mid + 1]) {
      const xL = xs[mid];
      const xR = xs[mid + 1];
      const yL = ys[mid];
      const yR = ys[mid + 1];
      if (xR === xL) return yL;
      const t = (raw - xL) / (xR - xL);
      return yL + t * (yR - yL);
    }
    if (raw < xs[mid]) hi = mid - 1;
    else lo = mid + 1;
  }
  return raw;
}

function applyCalibration(calibration, market, outcome, p) {
  const table = calibration?.markets?.[market]?.[outcome];
  if (!table) return p;
  return applyTable(p, table.xs, table.ys);
}

const env = readEnv();
const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const simDate = '2026-03-06';
const simFilePath = path.join(process.cwd(), 'data', 'simulations', `${simDate}.json`);
const calibrationPath = path.join(process.cwd(), 'lib', 'modeling', 'calibration-data.json');

if (!fs.existsSync(simFilePath)) {
  console.error(`Missing simulation file: ${simFilePath}`);
  process.exit(1);
}

const simFile = JSON.parse(fs.readFileSync(simFilePath, 'utf8'));
const calibration = JSON.parse(fs.readFileSync(calibrationPath, 'utf8'));

const oddsRes = await client.execute({
  sql: `SELECT f.id, f.date, f.league_id, f.home_team_name, f.away_team_name,
               fo.home_prob, fo.draw_prob, fo.away_prob, fo.over25_prob, fo.btts_prob
        FROM fixture f
        JOIN fixture_odds fo ON fo.fixture_id = f.id
        WHERE f.status='NS' AND f.date = ?
        ORDER BY f.league_id, f.id`,
  args: [simDate],
});

const W_OLD_BLEND = 0.76; // from previous odds-blend confidence with hardcoded sample sizes

const rows = [];
for (const o of oddsRes.rows) {
  const fixtureId = String(o.id);
  const entry = simFile.fixtures?.[fixtureId];
  if (!entry?.sim) continue;

  const sim = entry.sim;
  const modelHome = applyCalibration(calibration, '1X2', 'H', sim.pHomeWin);
  const modelDraw = applyCalibration(calibration, '1X2', 'D', sim.pDraw);
  const modelAway = applyCalibration(calibration, '1X2', 'A', sim.pAwayWin);
  const modelO25 = applyCalibration(calibration, 'OU_2.5', 'Over', sim.pO25);
  const modelBtts = applyCalibration(calibration, 'BTTS', 'Yes', sim.pBTTS);

  const markets = [
    { key: 'HOME', model: modelHome, book: Number(o.home_prob) },
    { key: 'DRAW', model: modelDraw, book: Number(o.draw_prob) },
    { key: 'AWAY', model: modelAway, book: Number(o.away_prob) },
    { key: 'O2.5', model: modelO25, book: Number(o.over25_prob) },
    { key: 'BTTS', model: modelBtts, book: Number(o.btts_prob) },
  ].filter((m) => Number.isFinite(m.book));

  const best = markets
    .map((m) => {
      const edgeAfter = m.model - m.book;
      const edgeBefore = W_OLD_BLEND * (m.model - m.book);
      return { ...m, edgeAfter, edgeBefore };
    })
    .sort((a, b) => b.edgeAfter - a.edgeAfter)[0];

  rows.push({
    fixtureId,
    match: `${o.home_team_name} v ${o.away_team_name}`,
    leagueId: o.league_id,
    market: best.key,
    book: best.book,
    model: best.model,
    edgeBefore: best.edgeBefore,
    edgeAfter: best.edgeAfter,
  });
}

const preferred = [
  rows.find((r) => r.match.toLowerCase().includes('bayern') && r.match.toLowerCase().includes('gladbach')),
  rows.find((r) => r.match.toLowerCase().includes('paris saint germain') && r.match.toLowerCase().includes('monaco')),
  rows.find((r) => r.match.toLowerCase().includes('napoli') && r.match.toLowerCase().includes('torino')),
].filter(Boolean);

const top = rows
  .filter((r) => !preferred.some((p) => p.fixtureId === r.fixtureId))
  .sort((a, b) => b.edgeAfter - a.edgeAfter)
  .slice(0, 7);

const finalRows = [...preferred, ...top].slice(0, 10);

function pct(x) { return `${(x * 100).toFixed(1)}%`; }

console.log(`QA Edge Sanity — ${simDate}`);
console.log('Fixture | Market | Book% | Model% | Edge (Before blended) | Edge (After pure model)');
console.log('---');
for (const r of finalRows) {
  console.log(`${r.match} | ${r.market} | ${pct(r.book)} | ${pct(r.model)} | ${r.edgeBefore >= 0 ? '+' : ''}${pct(r.edgeBefore)} | ${r.edgeAfter >= 0 ? '+' : ''}${pct(r.edgeAfter)}`);
}

const bayern = finalRows.find((r) => r.match.toLowerCase().includes('bayern') && r.match.toLowerCase().includes('gladbach'));
if (bayern) {
  console.log('\nBayern/Gladbach focused check:');
  console.log(`Best market=${bayern.market}, book=${pct(bayern.book)}, model=${pct(bayern.model)}, old=${bayern.edgeBefore >= 0 ? '+' : ''}${pct(bayern.edgeBefore)}, new=${bayern.edgeAfter >= 0 ? '+' : ''}${pct(bayern.edgeAfter)}`);
}
