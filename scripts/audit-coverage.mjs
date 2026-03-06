import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// All configured competitions from leagues.ts
const ALL = [
  { id: 39, label: "EPL", calendar: false },
  { id: 78, label: "Bundesliga", calendar: false },
  { id: 135, label: "Serie A", calendar: false },
  { id: 140, label: "La Liga", calendar: false },
  { id: 61, label: "Ligue 1", calendar: false },
  { id: 88, label: "Eredivisie", calendar: false },
  { id: 94, label: "Liga Portugal", calendar: false },
  { id: 144, label: "Belgian Pro League", calendar: false },
  { id: 203, label: "Süper Lig", calendar: false },
  { id: 179, label: "Scottish Prem", calendar: false },
  { id: 218, label: "Austrian BL", calendar: false },
  { id: 207, label: "Swiss Super League", calendar: false },
  { id: 119, label: "Superliga DK", calendar: false },
  { id: 197, label: "Super League GR", calendar: false },
  { id: 210, label: "HNL", calendar: false },
  { id: 103, label: "Eliteserien", calendar: true },
  { id: 113, label: "Allsvenskan", calendar: true },
  { id: 106, label: "Ekstraklasa", calendar: false },
  { id: 345, label: "Czech Liga", calendar: false },
  { id: 253, label: "MLS", calendar: true },
  { id: 262, label: "Liga MX", calendar: false },
  { id: 71, label: "Série A BR", calendar: true },
  { id: 128, label: "Liga Profesional", calendar: true },
  { id: 307, label: "Saudi Pro", calendar: false },
  { id: 98, label: "J-League", calendar: true },
  { id: 292, label: "K-League 1", calendar: true },
  { id: 188, label: "A-League", calendar: false },
  { id: 40, label: "Championship", calendar: false },
  { id: 41, label: "League One", calendar: false },
  { id: 42, label: "League Two", calendar: false },
  { id: 136, label: "Serie B", calendar: false },
  { id: 79, label: "2. Bundesliga", calendar: false },
  { id: 141, label: "Segunda Div.", calendar: false },
  { id: 62, label: "Ligue 2", calendar: false },
  { id: 2, label: "UCL", calendar: false },
  { id: 3, label: "UEL", calendar: false },
  { id: 848, label: "UECL", calendar: false },
  { id: 48, label: "FA Cup", calendar: false },
  { id: 45, label: "EFL Cup", calendar: false },
  { id: 137, label: "Coppa Italia", calendar: false },
  { id: 143, label: "Copa del Rey", calendar: false },
  { id: 66, label: "Coupe de France", calendar: false },
  { id: 81, label: "DFB-Pokal", calendar: false },
];

// Target seasons: for European-style (Aug-May) leagues: 2023, 2024, 2025
// For calendar-year leagues: 2024, 2025, 2026
function targetSeasons(calendar) {
  return calendar ? [2024, 2025, 2026] : [2023, 2024, 2025];
}

const files = fs.readdirSync(DATA_DIR);

console.log("=== Season Data Coverage Audit ===\n");
console.log("League".padEnd(22) + "  2023/24  2024/25  2025/26  Missing");
console.log("-".repeat(70));

const missingPairs = [];

for (const comp of ALL) {
  const seasons = targetSeasons(comp.calendar);
  const cols = [];
  const missing = [];

  for (const s of seasons) {
    const fname = `${comp.id}-${s}-fixtures.json`;
    const exists = files.includes(fname);
    let count = 0;
    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, fname), "utf-8"));
        count = Array.isArray(data) ? data.length : 0;
      } catch {}
    }
    cols.push(exists ? String(count).padStart(5) : "    -");
    if (!exists || count === 0) {
      missing.push(s);
      missingPairs.push({ id: comp.id, label: comp.label, season: s });
    }
  }

  const label = `${comp.label} (${comp.id})`.padEnd(22);
  const missingStr = missing.length > 0 ? missing.join(", ") : "✓";
  console.log(`${label}  ${cols.join("    ")}  ${missingStr}`);
}

console.log(`\n${missingPairs.length} league-season gaps total`);

// Estimate API calls needed
// Each season: 1 (fixture list) + N finished fixtures * 2 (stats + players)
// Rough estimate: ~300 fixtures per league-season average
console.log(`\nMissing league-seasons:`);
for (const p of missingPairs) {
  console.log(`  ${p.label} (${p.id}) season ${p.season}`);
}
