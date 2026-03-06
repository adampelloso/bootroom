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
    env[k] = rest.join('=').replace(/^"|"$/g, '');
  }
  return env;
}
const env = readEnv();
const c = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

const r = await c.execute(`SELECT f.status, COUNT(*) cnt FROM fixture_odds fo JOIN fixture f ON f.id=fo.fixture_id GROUP BY f.status ORDER BY cnt DESC`);
for (const row of r.rows) console.log(row.status, row.cnt);

const r2 = await c.execute(`SELECT COUNT(*) cnt FROM fixture_odds fo JOIN fixture f ON f.id=fo.fixture_id WHERE f.status='FT'`);
console.log('FT count', r2.rows[0].cnt);
