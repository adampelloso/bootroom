"""
Ingest basic odds for major competitions into a canonical markets format.

Uses The Odds API (the-odds-api.com) to fetch pre-match odds for football.
"""

import argparse
import json
import os
import pathlib
from typing import Any, Dict, List

import requests


def read_env() -> Dict[str, str]:
  env_path = pathlib.Path(".env")
  vals: Dict[str, str] = {}
  if not env_path.exists():
    return vals
  for line in env_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
      continue
    if "=" in line:
      k, v = line.split("=", 1)
      vals[k] = v.strip().strip("\"'")
  return vals


# Mapping from our competition codes to The Odds API sport keys.
# Competitions in lib/leagues.ts with oddsKey null are not listed here (fixtures/stats only).
SPORT_MAP = {
  # Big 5
  "epl": "soccer_epl",
  "laliga": "soccer_spain_la_liga",
  "seriea": "soccer_italy_serie_a",
  "bundesliga": "soccer_germany_bundesliga",
  "ligue1": "soccer_france_ligue_one",
  # European tier 1.5
  "eredivisie": "soccer_netherlands_eredivisie",
  "portugal": "soccer_portugal_primeira_liga",
  "belgium": "soccer_belgium_first_div",
  "turkey": "soccer_turkey_super_league",
  "scotland": "soccer_spl",
  # Americas
  "mls": "soccer_usa_mls",
  "ligamx": "soccer_mexico_ligamx",
  "brazil_serie_a": "soccer_brazil_serie_a",
  # Asia / Middle East
  "saudi": "soccer_saudi_professional_league",
  # European cups
  "ucl": "soccer_uefa_champions_league",
  "uel": "soccer_uefa_europa_league",
  "uecl": "soccer_uefa_europa_conference_league",
  # Domestic cups
  "fa_cup": "soccer_england_fa_cup",
  "efl_cup": "soccer_england_league_cup",
}


def fetch_odds_snapshot(competition: str, date: str, api_key: str) -> List[Dict[str, Any]]:
  """
  Fetch odds from The Odds API for a given competition and date.
  
  Returns raw API response (list of match objects with bookmakers and markets).
  """
  
  sport_key = SPORT_MAP.get(competition.lower())
  if not sport_key:
    raise ValueError(f"Unknown competition: {competition}. Supported: {list(SPORT_MAP.keys())}")
  
  # The Odds API endpoint
  base_url = "https://api.the-odds-api.com/v4"
  url = f"{base_url}/sports/{sport_key}/odds"
  
  params = {
    "apiKey": api_key,
    "regions": "us,uk",  # US and UK bookmakers
    "markets": "h2h,totals,both_teams_to_score",  # 1X2, totals, BTTS
    "dateFormat": "iso",
  }
  
  # If date is provided, filter (The Odds API supports date filtering)
  if date:
    params["commenceTimeFrom"] = f"{date}T00:00:00Z"
    params["commenceTimeTo"] = f"{date}T23:59:59Z"
  
  resp = requests.get(url, params=params, timeout=30)
  resp.raise_for_status()
  
  data = resp.json()
  return data if isinstance(data, list) else []


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--competition", type=str, required=True, help="Competition code (e.g. 'epl')")
  parser.add_argument("--date", type=str, default="", help="Date YYYY-MM-DD (optional, fetches upcoming if omitted)")
  args = parser.parse_args()

  env = read_env()
  api_key = env.get("ODDS_API_KEY") or os.getenv("ODDS_API_KEY")
  if not api_key:
    raise SystemExit("Missing ODDS_API_KEY in .env or environment")

  snapshot = fetch_odds_snapshot(args.competition, args.date, api_key)
  out_dir = pathlib.Path("data") / "odds" / args.competition
  out_dir.mkdir(parents=True, exist_ok=True)
  
  if args.date:
    out_path = out_dir / f"{args.date}.json"
  else:
    from datetime import datetime
    out_path = out_dir / f"upcoming_{datetime.now().strftime('%Y%m%d')}.json"
  
  out_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
  print(f"Wrote {len(snapshot)} matches with odds to {out_path}")
  
  if snapshot:
    print(f"\nSample match IDs:")
    for match in snapshot[:3]:
      print(f"  {match.get('id')}: {match.get('home_team')} v {match.get('away_team')} ({match.get('commence_time')})")


if __name__ == "__main__":
  main()

