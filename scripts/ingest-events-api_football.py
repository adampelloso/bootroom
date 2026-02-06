"""
Ingest event-level data from API-Football into a canonical JSONL format.

This script is intentionally simple and freemium-friendly:
- Reads API_FOOTBALL_* values from the existing .env.
- Pulls /fixtures/events for requested competitions and seasons.
- Writes JSONL files under data/events/api_football/{competition}/{season}.jsonl

NOTE: This is scaffolding only. You will need to:
- Set API_FOOTBALL_KEY (and optionally host/base URL) in .env.
- Decide which competitions/seasons to run.
"""

import argparse
import json
import os
import pathlib
from typing import Any, Dict, Iterable

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


def fetch_events_for_fixture(base_url: str, key: str, host: str | None, fixture_id: int) -> Iterable[Dict[str, Any]]:
  headers = {"x-apisports-key": key}
  if host:
    headers["x-rapidapi-host"] = host
  url = f"{base_url}/fixtures/events?fixture={fixture_id}"
  resp = requests.get(url, headers=headers, timeout=30)
  resp.raise_for_status()
  data = resp.json()
  return data.get("response", [])


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--league", type=int, required=True, help="League ID (e.g. 39 for EPL)")
  parser.add_argument("--season", type=int, required=True, help="Season year, e.g. 2025")
  parser.add_argument("--fixtures-file", type=str, required=True, help="Path to JSON fixtures file with API-Football response")
  args = parser.parse_args()

  env = read_env()
  base_url = env.get("API_FOOTBALL_BASE_URL", "https://v3.football.api-sports.io")
  host = env.get("API_FOOTBALL_HOST")
  key = env.get("API_FOOTBALL_KEY")
  if not key:
    raise SystemExit("Missing API_FOOTBALL_KEY in .env")

  fixtures_raw = json.loads(pathlib.Path(args.fixtures_file).read_text(encoding="utf-8"))
  fixtures = fixtures_raw.get("response", fixtures_raw if isinstance(fixtures_raw, list) else [])

  out_dir = pathlib.Path("data") / "events" / "api_football" / str(args.league) / str(args.season)
  out_dir.mkdir(parents=True, exist_ok=True)
  out_path = out_dir / "events.jsonl"

  with out_path.open("w", encoding="utf-8") as f_out:
    for f in fixtures:
      fixture = f.get("fixture", {})
      fid = fixture.get("id")
      if fid is None:
        continue
      events = fetch_events_for_fixture(base_url, key, host, int(fid))
      for ev in events:
        f_out.write(json.dumps(ev) + "\n")

  print(f"Wrote events to {out_path}")


if __name__ == "__main__":
  main()

