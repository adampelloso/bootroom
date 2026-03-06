#!/usr/bin/env node
/**
 * Upload simulation snapshots only to Cloudflare KV.
 *
 * Keys written:
 *   sims:{YYYY-MM-DD} -> contents of data/simulations/{YYYY-MM-DD}.json
 *
 * This avoids overwriting team/player/history KV keys during intraday refreshes.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data", "simulations");
const TMP_FILE = path.join(process.cwd(), "data", "_sims-kv-bulk.json");

function main() {
  const namespaceId = process.env.KV_NAMESPACE_ID;
  if (!namespaceId) {
    console.error("Error: KV_NAMESPACE_ID env var is required");
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Error: simulations directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  const simFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  if (simFiles.length === 0) {
    console.log("No simulation files found. Nothing to upload.");
    return;
  }

  const entries = simFiles.map((file) => {
    const date = file.replace(/\.json$/, "");
    const value = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    return { key: `sims:${date}`, value };
  });

  fs.writeFileSync(TMP_FILE, JSON.stringify(entries));
  console.log(`Uploading ${entries.length} simulation keys to KV...`);

  try {
    execSync(
      `npx wrangler kv bulk put "${TMP_FILE}" --namespace-id="${namespaceId}" --remote`,
      { stdio: "inherit" },
    );
    console.log("Simulation KV upload complete.");
  } finally {
    try {
      fs.unlinkSync(TMP_FILE);
    } catch {
      // ignore cleanup errors
    }
  }
}

main();

