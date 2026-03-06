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

const env = readEnv();
const c = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

const total = await c.execute("SELECT status, COUNT(*) cnt FROM fixture GROUP BY status ORDER BY cnt DESC");
console.log('Fixture status counts:');
for (const r of total.rows) console.log(`${r.status}: ${r.cnt}`);

const finished = await c.execute("SELECT COUNT(*) cnt FROM fixture WHERE status IN ('FT','AET','PEN')");
console.log(`\nFinished total (FT/AET/PEN): ${finished.rows[0].cnt}`);

const range = await c.execute("SELECT MIN(date) min_date, MAX(date) max_date FROM fixture WHERE status IN ('FT','AET','PEN')");
console.log(`Finished range: ${range.rows[0].min_date} -> ${range.rows[0].max_date}`);

const byMonth = await c.execute(`
  SELECT substr(date,1,7) ym, COUNT(*) cnt
  FROM fixture
  WHERE status IN ('FT','AET','PEN')
  GROUP BY ym
  ORDER BY ym
`);
console.log('\nFinished by month:');
for (const r of byMonth.rows) console.log(`${r.ym}: ${r.cnt}`);

const withOdds = await c.execute(`
  SELECT COUNT(*) cnt
  FROM fixture f
  JOIN fixture_odds fo ON fo.fixture_id = f.id
  WHERE f.status IN ('FT','AET','PEN')
`);
console.log(`\nFinished with odds: ${withOdds.rows[0].cnt}`);
