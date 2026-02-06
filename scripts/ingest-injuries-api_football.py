"""
Ingest structured injury/squad information from API-Football.

This takes a light-touch approach: fetches squad or injury endpoints and
stores raw JSON under data/news/api_football/, so downstream modeling
and feature code can derive simple \"key player out\" or \"squad thin\" flags.
"""

import argparse
import json
import pathlib
from typing import Any, Dict

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


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--team-id", type=int, required=True, help="Team ID in API-Football")
  parser.add_argument("--season", type=int, required=True, help="Season year, e.g. 2025")
  args = parser.parse_args()

  env = read_env()
  base_url = env.get("API_FOOTBALL_BASE_URL", "https://v3.football.api-sports.io")
  host = env.get("API_FOOTBALL_HOST")
  key = env.get("API_FOOTBALL_KEY")
  if not key:
    raise SystemExit("Missing API_FOOTBALL_KEY in .env")

  headers = {"x-apisports-key": key}
  if host:
    headers["x-rapidapi-host"] = host

  url = f"{base_url}/injuries?team={args.team_id}&season={args.season}"
  resp = requests.get(url, headers=headers, timeout=30)
  resp.raise_for_status()
  data: Dict[str, Any] = resp.json()

  out_dir = pathlib.Path("data") / "news" / "api_football"
  out_dir.mkdir(parents=True, exist_ok=True)
  out_path = out_dir / f"injuries_team{args.team_id}_{args.season}.json"
  out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
  print(f"Wrote injuries snapshot to {out_path}")


if __name__ == "__main__":
  main()

