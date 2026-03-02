#!/usr/bin/env node
/**
 * Upload KV staging files to Cloudflare KV via wrangler.
 *
 * Reads all JSON files from data/kv-staging/, builds a bulk-put payload,
 * and uploads in batches of 500 (Cloudflare bulk put limit is 10,000 but
 * smaller batches are safer for large values).
 *
 * Env vars:
 *   KV_NAMESPACE_ID — Cloudflare KV namespace ID (required)
 *
 * Usage:
 *   KV_NAMESPACE_ID=abc123 node scripts/push-to-kv.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const KV_STAGING_DIR = path.join(process.cwd(), "data", "kv-staging");
const BATCH_SIZE = 500;

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

  const files = fs.readdirSync(KV_STAGING_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No KV staging files found. Nothing to upload.");
    return;
  }

  console.log(`Found ${files.length} KV staging files in ${KV_STAGING_DIR}`);

  // Build key-value pairs
  const entries = [];
  for (const file of files) {
    // Filename is encodeURIComponent(key) + ".json"
    const key = decodeURIComponent(file.replace(/\.json$/, ""));
    const value = fs.readFileSync(path.join(KV_STAGING_DIR, file), "utf-8");
    entries.push({ key, value });
  }

  // Upload in batches
  let uploaded = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

    // Write batch to a temp file for wrangler bulk put
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
      process.exit(1);
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }

  console.log(`Successfully uploaded ${uploaded} keys to KV namespace ${namespaceId}`);
}

main();
