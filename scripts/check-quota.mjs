import fs from "fs";
import path from "path";

function readEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
  return env;
}

const env = readEnv();
const base = env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const res = await fetch(`${base}/status`, {
  headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
});
const data = await res.json();
const r = data.response;
console.log(`Plan: ${r.subscription.plan} | Used: ${r.requests.current}/${r.requests.limit_day} | Remaining: ${r.requests.limit_day - r.requests.current}`);
