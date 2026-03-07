import 'dotenv/config';

const base = (process.env.BOOTROOM_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const date = new Date().toISOString().slice(0, 10);
const retries = Number(process.env.SMOKE_RETRIES || 5);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 5000);

const checks = [
  `${base}/login`,
  `${base}/images/cover.png`,
  `${base}/today`,
  `${base}/matches`,
  `${base}/api/feed?from=${date}&to=${date}&league=all`,
  `${base}/api/today/best-bets?date=${date}`,
];

async function check(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'bootroom-smoke/1.0' } });
  const ok = res.status >= 200 && res.status < 500;
  return { url, status: res.status, ok };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let bad = [];
  let results = [];
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    results = [];
    for (const url of checks) results.push(await check(url));
    bad = results.filter((r) => !r.ok);
    if (bad.length === 0) break;
    if (attempt < retries) await sleep(delayMs);
  }
  console.log(JSON.stringify({ base, checkedAt: new Date().toISOString(), retries, results }, null, 2));
  if (bad.length > 0) {
    console.error(`[smoke] failed checks after ${retries} attempts: ${bad.length}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[smoke] unhandled:', err);
  process.exit(1);
});
