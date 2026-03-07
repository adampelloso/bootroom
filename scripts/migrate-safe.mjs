import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function genCode() {
  let s = '';
  for (let i = 0; i < 8; i += 1) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function tableExists(name) {
  const r = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
    args: [name],
  });
  return r.rows.length > 0;
}

async function hasColumn(table, col) {
  const r = await client.execute(`PRAGMA table_info(${table})`);
  return r.rows.some((x) => x.name === col);
}

async function ensureMigrationTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

async function isApplied(id) {
  const r = await client.execute({
    sql: 'SELECT id FROM schema_migrations WHERE id = ? LIMIT 1',
    args: [id],
  });
  return r.rows.length > 0;
}

async function markApplied(id) {
  await client.execute({
    sql: 'INSERT INTO schema_migrations (id) VALUES (?)',
    args: [id],
  });
}

async function applyReferralMigration() {
  const migrationId = '2026-03-07-referrals-core';
  if (await isApplied(migrationId)) {
    console.log(`[migrate] already applied: ${migrationId}`);
    return;
  }

  if (!(await hasColumn('user', 'referral_code'))) {
    await client.execute('ALTER TABLE user ADD COLUMN referral_code TEXT');
    console.log('[migrate] added user.referral_code');
  }
  if (!(await hasColumn('user', 'referral_slug'))) {
    await client.execute('ALTER TABLE user ADD COLUMN referral_slug TEXT');
    console.log('[migrate] added user.referral_slug');
  }
  if (!(await hasColumn('user', 'referred_by'))) {
    await client.execute('ALTER TABLE user ADD COLUMN referred_by TEXT');
    console.log('[migrate] added user.referred_by');
  }

  const users = await client.execute('SELECT id, referral_code FROM user');
  const used = new Set();
  for (const row of users.rows) {
    if (row.referral_code) used.add(String(row.referral_code));
  }
  for (const row of users.rows) {
    if (row.referral_code) continue;
    let code = genCode();
    while (used.has(code)) code = genCode();
    used.add(code);
    await client.execute({
      sql: 'UPDATE user SET referral_code = ? WHERE id = ?',
      args: [code, row.id],
    });
  }
  console.log('[migrate] backfilled user.referral_code');

  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS user_referral_code_unique ON user(referral_code)');
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS user_referral_slug_unique ON user(referral_slug)');

  if (!(await tableExists('referral_earnings'))) {
    await client.execute(`
      CREATE TABLE referral_earnings (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        stripe_invoice_id TEXT NOT NULL UNIQUE,
        payment_amount INTEGER NOT NULL,
        commission_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        paid_at INTEGER
      )
    `);
    console.log('[migrate] created referral_earnings');
  }
  if (!(await tableExists('referral_payouts'))) {
    await client.execute(`
      CREATE TABLE referral_payouts (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        method TEXT,
        note TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('[migrate] created referral_payouts');
  }

  await client.execute('CREATE INDEX IF NOT EXISTS idx_referral_earning_referrer ON referral_earnings(referrer_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_referral_earning_referred_user ON referral_earnings(referred_user_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_referral_earning_status ON referral_earnings(status)');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_referral_payout_referrer ON referral_payouts(referrer_id)');

  await markApplied(migrationId);
  console.log(`[migrate] applied: ${migrationId}`);
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('[migrate] Missing TURSO_DATABASE_URL');
    process.exit(1);
  }
  await ensureMigrationTable();
  await applyReferralMigration();
}

main().catch((err) => {
  console.error('[migrate] unhandled:', err);
  process.exit(1);
});
