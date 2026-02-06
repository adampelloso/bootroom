"""
Match/odds alignment: join API-Football fixtures with The Odds API snapshots.
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd


def normalize_team_name(name: str) -> str:
  """Normalize team names for matching (lowercase, remove common suffixes)."""
  n = name.lower().strip()
  # Remove common suffixes that might differ between providers
  for suffix in [" fc", " football club", " united", " city"]:
    if n.endswith(suffix):
      n = n[: -len(suffix)]
  return n


def match_fixture_to_odds(
  fixture: Dict[str, Any], odds_matches: List[Dict[str, Any]], time_tolerance_hours: int = 2
) -> Optional[str]:
  """
  Match an API-Football fixture to a The Odds API match ID.
  
  Returns The Odds API match ID if found, None otherwise.
  """
  
  fixture_home = normalize_team_name(fixture.get("teams", {}).get("home", {}).get("name", ""))
  fixture_away = normalize_team_name(fixture.get("teams", {}).get("away", {}).get("name", ""))
  fixture_time_str = fixture.get("fixture", {}).get("date", "")
  
  if not fixture_time_str:
    return None
  
  try:
    fixture_time = datetime.fromisoformat(fixture_time_str.replace("Z", "+00:00"))
  except (ValueError, AttributeError):
    return None
  
  for odds_match in odds_matches:
    odds_home = normalize_team_name(odds_match.get("home_team", ""))
    odds_away = normalize_team_name(odds_match.get("away_team", ""))
    odds_time_str = odds_match.get("commence_time", "")
    
    if not odds_time_str:
      continue
    
    try:
      odds_time = datetime.fromisoformat(odds_time_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
      continue
    
    time_diff = abs((fixture_time - odds_time).total_seconds() / 3600)
    
    if (
      (fixture_home == odds_home and fixture_away == odds_away)
      or (fixture_home == odds_away and fixture_away == odds_home)
    ) and time_diff <= time_tolerance_hours:
      return odds_match.get("id")
  
  return None


def build_match_odds_index(
  fixtures_path: str, odds_snapshot_path: str
) -> pd.DataFrame:
  """
  Build a DataFrame linking API-Football fixture IDs to The Odds API match IDs.
  
  Returns DataFrame with columns: fixture_id, odds_match_id, home_team, away_team, kickoff_utc.
  """
  
  fixtures_raw = json.loads(pathlib.Path(fixtures_path).read_text(encoding="utf-8"))
  fixtures = fixtures_raw.get("response", fixtures_raw if isinstance(fixtures_raw, list) else [])
  
  odds_raw = json.loads(pathlib.Path(odds_snapshot_path).read_text(encoding="utf-8"))
  odds_matches = odds_raw if isinstance(odds_raw, list) else [odds_raw]
  
  rows = []
  for fixture in fixtures:
    f = fixture.get("fixture", {})
    fixture_id = f.get("id")
    if not fixture_id:
      continue
    
    odds_id = match_fixture_to_odds(fixture, odds_matches)
    if odds_id:
      rows.append(
        {
          "fixture_id": fixture_id,
          "odds_match_id": odds_id,
          "home_team": fixture.get("teams", {}).get("home", {}).get("name", ""),
          "away_team": fixture.get("teams", {}).get("away", {}).get("name", ""),
          "kickoff_utc": f.get("date", ""),
        }
      )
  
  return pd.DataFrame.from_records(rows)
