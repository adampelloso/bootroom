-- Reference migration for referral program schema (applied via scripts/migrate-safe.mjs)
-- This file documents target schema state and is kept in-repo for auditability.

-- user columns expected:
-- referral_code TEXT UNIQUE NOT NULL (backfilled for existing users)
-- referral_slug TEXT UNIQUE NULL
-- referred_by TEXT NULL (self-FK to user.id)

CREATE TABLE IF NOT EXISTS referral_earnings (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  payment_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS referral_payouts (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
