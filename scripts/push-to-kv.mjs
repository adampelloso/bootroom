#!/usr/bin/env node
/**
 * Incremental upload of KV staging files to Cloudflare KV.
 *
 * Computes a content hash for each staging file and compares against
 * a local manifest (data/kv-staging/.manifest.json). Only uploads keys
 * whose content has changed since the last push.
 *
 * Env vars:
 *   KV_NAMESPACE_ID — Cloudflare KV namespace ID (required)
 *
 * Usage:
 *   KV_NAMESPACE_ID=abc123 node scripts/push-to-kv.mjs
 *   KV_NAMESPACE_ID=abc123 node scripts/push-to-kv.mjs --force   # skip diff, upload everything
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { execSync } from "child_process";

const KV_STAGING_DIR = path.join(process.cwd(), "data", "kv-staging");
const MANIFEST_FILE = path.join(KV_STAGING_DIR, ".manifest.json");
const BATCH_SIZE = 500;

function hashContent(content) {
  return createHash("md5").update(content).digest("hex");
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

function main() {
  const namespaceId = process.env.KV_NAMESPACE_ID;
  if (!namespaceId) {
    console.error("Error: KV_NAMESPACE_ID env var is required");
    process.exit(1);
  }

  if (!fs.existsSync(KV_STAGING_DIR)) {
    console.error(`Error: ${KV_STAGING_DIR} does not exist. Run prebuild-stats.mjs first.`);
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const files = fs.readdirSync(KV_STAGING_DIR).filter((f) => f.endsWith(".json") && !f.startsWith(".") && !f.startsWith("_"));
  if (files.length === 0) {
    console.log("No KV staging files found. Nothing to upload.");
    return;
  }

  // Load previous manifest and diff
  const oldManifest = force ? {} : loadManifest();
  const newManifest = {};
  const changedEntries = [];

  for (const file of files) {
    const key = decodeURIComponent(file.replace(/\.json$/, ""));
    const content = fs.readFileSync(path.join(KV_STAGING_DIR, file), "utf-8");
    const hash = hashContent(content);
    newManifest[key] = hash;

    if (oldManifest[key] !== hash) {
      changedEntries.push({ key, value: content });
    }
  }

  console.log(`Found ${files.length} staging files, ${changedEntries.length} changed${force ? " (--force)" : ""}`);

  if (changedEntries.length === 0) {
    console.log("Everything up to date. Nothing to upload.");
    saveManifest(newManifest);
    return;
  }

  // Upload changed entries in batches
  let uploaded = 0;
  const totalBatches = Math.ceil(changedEntries.length / BATCH_SIZE);

  for (let i = 0; i < changedEntries.length; i += BATCH_SIZE) {
    const batch = changedEntries.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const tmpFile = path.join(KV_STAGING_DIR, `_bulk-batch-${batchNum}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(batch));

    console.log(`Uploading batch ${batchNum}/${totalBatches} (${batch.length} keys)...`);

    try {
      execSync(
        `npx wrangler kv bulk put "${tmpFile}" --namespace-id="${namespaceId}" --remote`,
        { stdio: "inherit" },
      );
      uploaded += batch.length;
    } catch (err) {
      console.error(`Batch ${batchNum} failed:`, err.message);
      // Save partial manifest (only keys we successfully uploaded so far)
      // Don't update hashes for keys in this failed batch
      for (const entry of batch) {
        delete newManifest[entry.key];
        if (oldManifest[entry.key]) newManifest[entry.key] = oldManifest[entry.key];
      }
      saveManifest(newManifest);
      process.exit(1);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }

  // Save updated manifest
  saveManifest(newManifest);
  console.log(`Uploaded ${uploaded} changed keys (${files.length - changedEntries.length} unchanged, skipped)`);
}

main();
