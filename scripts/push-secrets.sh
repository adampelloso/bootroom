#!/bin/bash
# Push all env vars from .env to Cloudflare Workers as secrets.
# Usage: bash scripts/push-secrets.sh
#
# Requires: wrangler logged in (run `npx wrangler login` first)

set -euo pipefail

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

echo "Pushing secrets from $ENV_FILE to Cloudflare Worker 'bootroom' (encrypted)..."
echo ""

count=0
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  # Split on first '='
  key="${line%%=*}"
  value="${line#*=}"

  # Trim whitespace from key and value
  key="$(echo "$key" | xargs)"
  value="$(echo "$value" | xargs)"

  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue

  echo "  → $key"
  echo "$value" | npx wrangler secret put "$key" 2>&1 | grep -v "^$" || true
  count=$((count + 1))
done < "$ENV_FILE"

echo ""
echo "Done. Pushed $count secrets."
