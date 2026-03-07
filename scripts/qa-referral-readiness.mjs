import 'dotenv/config';
import { createClient } from '@libsql/client';

async function main() {
  const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

  const cols = await c.execute('PRAGMA table_info(user)');
  const names = new Set(cols.rows.map((r) => r.name));
  const required = ['referral_code', 'referral_slug', 'referred_by'];
  const missingCols = required.filter((x) => !names.has(x));

  const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('referral_earnings','referral_payouts')");
  const tableNames = new Set(tables.rows.map((r) => String(r.name)));
  const missingTables = ['referral_earnings', 'referral_payouts'].filter((t) => !tableNames.has(t));

  const nullCode = await c.execute("SELECT COUNT(1) AS n FROM user WHERE referral_code IS NULL OR referral_code = ''");
  const nullCodeCount = Number(nullCode.rows[0]?.n || 0);

  const payload = {
    checkedAt: new Date().toISOString(),
    missingCols,
    missingTables,
    usersMissingReferralCode: nullCodeCount,
  };
  console.log(JSON.stringify(payload, null, 2));

  if (missingCols.length || missingTables.length || nullCodeCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[referral-readiness] unhandled:', err);
  process.exit(1);
});
