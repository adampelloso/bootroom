import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { applyCalibration } from '@/lib/modeling/calibration';
import { estimateMatchGoalLambdas } from '@/lib/modeling/baseline-params';
import { simulateMatch } from '@/lib/modeling/mc-engine';

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env: Record<string, string> = {};
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

type Obs = {
  leagueId: number;
  market: 'H' | 'D' | 'A' | 'O25' | 'BTTS';
  model: number;
  book: number;
  edge: number;
  y: number;
};

type Summary = {
  n: number;
  avgModel: number;
  avgBook: number;
  actualRate: number;
  calErrModel: number;
  calErrBook: number;
  brierModel: number;
  brierBook: number;
  avgEdge: number;
  edge4: { n: number; actual: number | null; model: number | null; book: number | null; bias: number | null };
};

function summarize(list: Obs[]): Summary | null {
  const n = list.length;
  if (n === 0) return null;
  const avg = (fn: (x: Obs) => number) => list.reduce((s, x) => s + fn(x), 0) / n;
  const avgModel = avg((x) => x.model);
  const avgBook = avg((x) => x.book);
  const actualRate = avg((x) => x.y);
  const calErrModel = avgModel - actualRate;
  const calErrBook = avgBook - actualRate;
  const brierModel = avg((x) => (x.model - x.y) ** 2);
  const brierBook = avg((x) => (x.book - x.y) ** 2);
  const avgEdge = avg((x) => x.edge);

  const edge4Rows = list.filter((x) => x.edge >= 0.04);
  const edge4 = edge4Rows.length === 0
    ? { n: 0, actual: null, model: null, book: null, bias: null }
    : {
        n: edge4Rows.length,
        actual: edge4Rows.reduce((s, x) => s + x.y, 0) / edge4Rows.length,
        model: edge4Rows.reduce((s, x) => s + x.model, 0) / edge4Rows.length,
        book: edge4Rows.reduce((s, x) => s + x.book, 0) / edge4Rows.length,
        bias: (edge4Rows.reduce((s, x) => s + x.y, 0) / edge4Rows.length) - (edge4Rows.reduce((s, x) => s + x.model, 0) / edge4Rows.length),
      };

  return { n, avgModel, avgBook, actualRate, calErrModel, calErrBook, brierModel, brierBook, avgEdge, edge4 };
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

async function main() {
  const env = readEnv();
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

  const simDir = path.join(process.cwd(), 'data', 'simulations');
  const simCache = new Map<string, any | null>();
  const loadSimFile = (date: string) => {
    if (simCache.has(date)) return simCache.get(date)!;
    const p = path.join(simDir, `${date}.json`);
    if (!fs.existsSync(p)) {
      simCache.set(date, null);
      return null;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      simCache.set(date, parsed);
      return parsed;
    } catch {
      simCache.set(date, null);
      return null;
    }
  };

  const fixturesRes = await client.execute(`
    SELECT f.id, f.date, f.league_id, f.home_team_name, f.away_team_name,
           f.home_goals, f.away_goals,
           fo.home_prob, fo.draw_prob, fo.away_prob, fo.over25_prob, fo.btts_prob
    FROM fixture f
    JOIN fixture_odds fo ON fo.fixture_id = f.id
    WHERE f.status = 'FT'
    ORDER BY f.date DESC
  `);

  const obs: Obs[] = [];
  let fromPrecomputed = 0;
  let fromRuntime = 0;
  let skipped = 0;

  for (const row of fixturesRes.rows as any[]) {
    const date = String(row.date).slice(0, 10);
    const fixtureId = String(row.id);
    const leagueId = Number(row.league_id);
    const home = String(row.home_team_name);
    const away = String(row.away_team_name);

    let sim: { pHomeWin: number; pDraw: number; pAwayWin: number; pO25: number; pBTTS: number } | null = null;

    const file = loadSimFile(date);
    const entry = file?.fixtures?.[fixtureId];
    if (entry?.sim) {
      sim = entry.sim;
      fromPrecomputed += 1;
    } else {
      const lambdas = estimateMatchGoalLambdas(home, away, date, leagueId);
      if (!lambdas) {
        skipped += 1;
        continue;
      }
      sim = simulateMatch({
        lambdaHomeGoals: lambdas.lambdaHomeGoals,
        lambdaAwayGoals: lambdas.lambdaAwayGoals,
        simulations: 30000,
        randomSeed: Number(row.id),
        tempoStd: 0.15,
      });
      fromRuntime += 1;
    }
    if (!sim) {
      skipped += 1;
      continue;
    }

    const model = {
      H: applyCalibration('1X2', 'H', sim.pHomeWin),
      D: applyCalibration('1X2', 'D', sim.pDraw),
      A: applyCalibration('1X2', 'A', sim.pAwayWin),
      O25: applyCalibration('OU_2.5', 'Over', sim.pO25),
      BTTS: applyCalibration('BTTS', 'Yes', sim.pBTTS),
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

    (['H', 'D', 'A', 'O25', 'BTTS'] as const).forEach((market) => {
      const m = model[market];
      const b = book[market];
      if (!Number.isFinite(m) || !Number.isFinite(b)) return;
      obs.push({
        leagueId,
        market,
        model: m,
        book: b,
        edge: m - b,
        y: actual[market],
      });
    });
  }

  const overallByMarket = new Map<string, Summary>();
  for (const market of ['H', 'D', 'A', 'O25', 'BTTS'] as const) {
    const s = summarize(obs.filter((o) => o.market === market));
    if (s) overallByMarket.set(market, s);
  }

  const leagueMarket: Array<{ leagueId: number; market: string } & Summary> = [];
  const leagueIds = [...new Set(obs.map((o) => o.leagueId))];
  for (const lid of leagueIds) {
    for (const market of ['H', 'D', 'A', 'O25', 'BTTS'] as const) {
      const s = summarize(obs.filter((o) => o.leagueId === lid && o.market === market));
      if (s) leagueMarket.push({ leagueId: lid, market, ...s });
    }
  }

  const worstCal = [...leagueMarket]
    .filter((x) => x.n >= 8)
    .sort((a, b) => Math.abs(b.calErrModel) - Math.abs(a.calErrModel))
    .slice(0, 12);

  const worstEdgeBias = [...leagueMarket]
    .filter((x) => x.edge4.n >= 5 && x.n >= 8)
    .sort((a, b) => (a.edge4.bias ?? 0) - (b.edge4.bias ?? 0))
    .slice(0, 12);

  console.log('Historical Calibration QA (finished fixtures with odds; precomputed+runtime sims):');
  console.log(`fixturesWithOdds=${fixturesRes.rows.length}, observations=${obs.length}, leagues=${leagueIds.length}`);
  console.log(`simSource: precomputed=${fromPrecomputed}, runtime=${fromRuntime}, skipped=${skipped}`);

  console.log('\nOverall by market (model vs actual, with book baseline):');
  for (const market of ['H', 'D', 'A', 'O25', 'BTTS'] as const) {
    const s = overallByMarket.get(market);
    if (!s) continue;
    console.log(`${market.padEnd(5)} n=${String(s.n).padStart(3)}  model=${pct(s.avgModel)}  book=${pct(s.avgBook)}  actual=${pct(s.actualRate)}  calErr(model)=${s.calErrModel>=0?'+':''}${pct(s.calErrModel)}  brier(model/book)=${s.brierModel.toFixed(4)}/${s.brierBook.toFixed(4)}`);
  }

  console.log('\nWorst absolute calibration error by league+market (n>=8):');
  for (const x of worstCal) {
    console.log(`L${x.leagueId} ${x.market.padEnd(5)} n=${String(x.n).padStart(2)} model=${pct(x.avgModel)} actual=${pct(x.actualRate)} err=${x.calErrModel>=0?'+':''}${pct(x.calErrModel)} bookErr=${x.calErrBook>=0?'+':''}${pct(x.calErrBook)}`);
  }

  console.log('\nWhere edge picks are overconfident (edge>=4%, n>=5):');
  for (const x of worstEdgeBias) {
    if (x.edge4.actual == null || x.edge4.model == null || x.edge4.bias == null) continue;
    console.log(`L${x.leagueId} ${x.market.padEnd(5)} edgeN=${String(x.edge4.n).padStart(2)} model=${pct(x.edge4.model)} actual=${pct(x.edge4.actual)} bias(actual-model)=${x.edge4.bias>=0?'+':''}${pct(x.edge4.bias)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
