import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...rest] = t.split('=');
    if (!k) continue;
    env[k] = rest.join('=').replace(/^"|"$/g, '');
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
      const xL = xs[mid], xR = xs[mid + 1], yL = ys[mid], yR = ys[mid + 1];
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
  const entry = calibration?.markets?.[market]?.[outcome];
  if (!entry) return p;
  return applyTable(p, entry.xs, entry.ys);
}

const env = readEnv();
const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const calibration = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'modeling', 'calibration-data.json'), 'utf8'));

const fixturesRes = await client.execute(`
  SELECT f.id, f.date, f.league_id, f.home_team_name, f.away_team_name,
         f.home_goals, f.away_goals,
         fo.home_prob, fo.draw_prob, fo.away_prob, fo.over25_prob, fo.btts_prob
  FROM fixture f
  JOIN fixture_odds fo ON fo.fixture_id = f.id
  WHERE f.status = 'FT'
  ORDER BY f.date DESC
`);

const simCache = new Map();
function loadSim(date) {
  if (simCache.has(date)) return simCache.get(date);
  const p = path.join(process.cwd(), 'data', 'simulations', `${date}.json`);
  if (!fs.existsSync(p)) {
    simCache.set(date, null);
    return null;
  }
  try {
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    simCache.set(date, obj);
    return obj;
  } catch {
    simCache.set(date, null);
    return null;
  }
}

const obs = [];
for (const row of fixturesRes.rows) {
  const date = String(row.date).slice(0, 10);
  const simFile = loadSim(date);
  if (!simFile) continue;
  const entry = simFile.fixtures?.[String(row.id)];
  if (!entry?.sim) continue;
  const sim = entry.sim;

  const model = {
    H: applyCalibration(calibration, '1X2', 'H', sim.pHomeWin),
    D: applyCalibration(calibration, '1X2', 'D', sim.pDraw),
    A: applyCalibration(calibration, '1X2', 'A', sim.pAwayWin),
    O25: applyCalibration(calibration, 'OU_2.5', 'Over', sim.pO25),
    BTTS: applyCalibration(calibration, 'BTTS', 'Yes', sim.pBTTS),
  };
  const book = {
    H: Number(row.home_prob),
    D: Number(row.draw_prob),
    A: Number(row.away_prob),
    O25: Number(row.over25_prob),
    BTTS: Number(row.btts_prob),
  };

  const gh = Number(row.home_goals);
  const ga = Number(row.away_goals);
  const actual = {
    H: gh > ga ? 1 : 0,
    D: gh === ga ? 1 : 0,
    A: gh < ga ? 1 : 0,
    O25: gh + ga >= 3 ? 1 : 0,
    BTTS: gh > 0 && ga > 0 ? 1 : 0,
  };

  for (const market of ['H', 'D', 'A', 'O25', 'BTTS']) {
    const m = model[market];
    const b = book[market];
    if (!Number.isFinite(m) || !Number.isFinite(b)) continue;
    obs.push({
      leagueId: Number(row.league_id),
      match: `${row.home_team_name} v ${row.away_team_name}`,
      date,
      market,
      model: m,
      book: b,
      edge: m - b,
      y: actual[market],
    });
  }
}

function summarize(list) {
  const n = list.length;
  if (n === 0) return null;
  const avg = (fn) => list.reduce((s, x) => s + fn(x), 0) / n;
  const avgModel = avg((x) => x.model);
  const avgBook = avg((x) => x.book);
  const actualRate = avg((x) => x.y);
  const calErrModel = avgModel - actualRate;
  const calErrBook = avgBook - actualRate;
  const brierModel = avg((x) => (x.model - x.y) ** 2);
  const brierBook = avg((x) => (x.book - x.y) ** 2);
  const avgEdge = avg((x) => x.edge);

  const edge4 = list.filter((x) => x.edge >= 0.04);
  const edge8 = list.filter((x) => x.edge >= 0.08);

  function edgeStats(items) {
    if (items.length === 0) return { n: 0, actual: null, model: null, book: null, bias: null };
    const actual = items.reduce((s, x) => s + x.y, 0) / items.length;
    const modelP = items.reduce((s, x) => s + x.model, 0) / items.length;
    const bookP = items.reduce((s, x) => s + x.book, 0) / items.length;
    return {
      n: items.length,
      actual,
      model: modelP,
      book: bookP,
      bias: actual - modelP,
    };
  }

  return {
    n,
    avgModel,
    avgBook,
    actualRate,
    calErrModel,
    calErrBook,
    brierModel,
    brierBook,
    avgEdge,
    edge4: edgeStats(edge4),
    edge8: edgeStats(edge8),
  };
}

const overallByMarket = new Map();
for (const market of ['H', 'D', 'A', 'O25', 'BTTS']) {
  overallByMarket.set(market, summarize(obs.filter((o) => o.market === market)));
}

const leagueMarket = [];
const leagueIds = [...new Set(obs.map((o) => o.leagueId))];
for (const lid of leagueIds) {
  for (const market of ['H', 'D', 'A', 'O25', 'BTTS']) {
    const s = summarize(obs.filter((o) => o.leagueId === lid && o.market === market));
    if (s) leagueMarket.push({ leagueId: lid, market, ...s });
  }
}

const worstCal = [...leagueMarket]
  .filter((x) => x.n >= 5)
  .sort((a, b) => Math.abs(b.calErrModel) - Math.abs(a.calErrModel))
  .slice(0, 12);

const worstEdgeBias = [...leagueMarket]
  .filter((x) => x.edge4.n >= 3 && x.n >= 5)
  .sort((a, b) => (a.edge4.bias ?? 0) - (b.edge4.bias ?? 0))
  .slice(0, 12);

function pct(x) { return `${(x * 100).toFixed(1)}%`; }

console.log(`Historical Calibration QA (finished fixtures with odds + sim):`);
console.log(`fixtures=${fixturesRes.rows.length}, observations=${obs.length}, leagues=${leagueIds.length}`);
console.log('');
console.log('Overall by market (model vs actual, with book baseline):');
for (const market of ['H', 'D', 'A', 'O25', 'BTTS']) {
  const s = overallByMarket.get(market);
  if (!s) continue;
  console.log(`${market.padEnd(5)} n=${String(s.n).padStart(3)}  model=${pct(s.avgModel)}  book=${pct(s.avgBook)}  actual=${pct(s.actualRate)}  calErr(model)=${s.calErrModel>=0?'+':''}${pct(s.calErrModel)}  brier(model/book)=${s.brierModel.toFixed(4)}/${s.brierBook.toFixed(4)}`);
}

console.log('\nWorst absolute calibration error by league+market (n>=5):');
for (const x of worstCal) {
  console.log(`L${x.leagueId} ${x.market.padEnd(5)} n=${String(x.n).padStart(2)} model=${pct(x.avgModel)} actual=${pct(x.actualRate)} err=${x.calErrModel>=0?'+':''}${pct(x.calErrModel)} bookErr=${x.calErrBook>=0?'+':''}${pct(x.calErrBook)}`);
}

console.log('\nWhere edge picks are overconfident (edge>=4%, n>=3):');
for (const x of worstEdgeBias) {
  console.log(`L${x.leagueId} ${x.market.padEnd(5)} edgeN=${String(x.edge4.n).padStart(2)} model=${pct(x.edge4.model)} actual=${pct(x.edge4.actual)} bias(actual-model)=${x.edge4.bias>=0?'+':''}${pct(x.edge4.bias)}`);
}
