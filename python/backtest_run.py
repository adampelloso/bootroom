#!/usr/bin/env python3
"""
Backtest driver for the baseline goals model.

Given a season fixtures JSON (from scripts/season-ingest.mjs), this script:
  - Reconstructs simple pre-match goal expectations per team (venue-specific).
  - Uses a Poisson model to derive probabilities for:
      * 1X2 (home/draw/away)
      * BTTS
      * O/U 2.5
  - Logs model probabilities and realized outcomes per match.

Outputs a CSV (and optionally parquet) under data/backtests/.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
from dataclasses import dataclass
from typing import Dict, List, Tuple

import pandas as pd


@dataclass
class TeamVenueStats:
  home_goals_for: float = 0.0
  home_matches: int = 0
  away_goals_for: float = 0.0
  away_matches: int = 0


def poisson_pmf(k: int, lam: float) -> float:
  """Poisson probability mass function."""
  if k < 0:
    return 0.0
  return math.exp(-lam) * lam**k / math.factorial(k)


def build_goal_distribution(lam: float, max_goals: int = 8) -> List[float]:
  """Return probabilities P(0..max_goals); mass above max_goals is truncated."""
  probs = [poisson_pmf(k, lam) for k in range(max_goals + 1)]
  total = sum(probs)
  if total <= 0:
    return probs
  # Renormalize to sum to 1 (approximate, but fine for our ranges).
  return [p / total for p in probs]


def compute_match_probs(lambda_home: float, lambda_away: float, max_goals: int = 8) -> Dict[str, float]:
  """
  Compute 1X2, BTTS, and O/U 2.5 probabilities from Poisson goal rates.
  """
  home_dist = build_goal_distribution(lambda_home, max_goals)
  away_dist = build_goal_distribution(lambda_away, max_goals)

  p_home = 0.0
  p_draw = 0.0
  p_away = 0.0
  p_btts = 0.0
  p_over_2_5 = 0.0

  for h, p_h in enumerate(home_dist):
    for a, p_a in enumerate(away_dist):
      p = p_h * p_a
      if h > a:
        p_home += p
      elif h == a:
        p_draw += p
      else:
        p_away += p

      total_goals = h + a
      if h > 0 and a > 0:
        p_btts += p
      if total_goals >= 3:
        p_over_2_5 += p

  return {
    "p_home": p_home,
    "p_draw": p_draw,
    "p_away": p_away,
    "p_btts": p_btts,
    "p_over_2_5": p_over_2_5,
  }


def load_fixtures(path: str) -> List[dict]:
  """
  Load fixtures from epl-YYYY-fixtures.json produced by season-ingest.mjs.
  Each element has at least:
    { "fixture": {...}, "stats": [...], "players": [...] }
  """
  p = pathlib.Path(path)
  raw = json.loads(p.read_text(encoding="utf-8"))
  return raw if isinstance(raw, list) else [raw]


def extract_finished_fixtures(raw_fixtures: List[dict]) -> List[dict]:
  """
  Keep only fixtures with full-time scores.

  Each entry is of the form produced by season-ingest.mjs:
    { "fixture": { fixture: {...}, teams: {...}, goals: {...}, ... },
      "stats": [...],
      "players": [...]
    }
  """
  finished: List[dict] = []
  for entry in raw_fixtures:
    api_fixture = entry.get("fixture", {})  # API-Football fixture object
    goals = api_fixture.get("goals") or {}
    if goals.get("home") is None or goals.get("away") is None:
      continue
    finished.append(entry)
  return finished


def run_backtest(fixtures_path: str, out_path: str) -> None:
  raw = load_fixtures(fixtures_path)
  finished = extract_finished_fixtures(raw)

  if not finished:
    raise SystemExit(f"No finished fixtures found in {fixtures_path}")

  # Precompute league-wide home/away averages for priors.
  league_home_goals = 0.0
  league_away_goals = 0.0
  league_matches = 0

  for entry in finished:
    api_fixture = entry.get("fixture", {})
    goals = api_fixture.get("goals") or {}
    gh = goals.get("home") or 0
    ga = goals.get("away") or 0
    league_home_goals += gh
    league_away_goals += ga
    league_matches += 1

  league_lambda_home = league_home_goals / league_matches
  league_lambda_away = league_away_goals / league_matches

  # Venue-specific team stats (running, pre-match).
  team_stats: Dict[str, TeamVenueStats] = {}

  def get_team_stats(team_name: str) -> TeamVenueStats:
    if team_name not in team_stats:
      team_stats[team_name] = TeamVenueStats()
    return team_stats[team_name]

  # Sort fixtures chronologically to avoid lookahead.
  finished_sorted = sorted(
    finished,
    key=lambda e: (e.get("fixture", {}).get("date") or "")
  )

  rows = []

  for entry in finished_sorted:
    api_fixture = entry.get("fixture", {})
    f_meta = api_fixture.get("fixture") or {}
    teams = api_fixture.get("teams") or {}
    goals = api_fixture.get("goals") or {}

    fixture_id = f_meta.get("id")
    kickoff_utc = f_meta.get("date") or ""
    home_name = (teams.get("home") or {}).get("name") or ""
    away_name = (teams.get("away") or {}).get("name") or ""
    gh = goals.get("home") or 0
    ga = goals.get("away") or 0

    if not fixture_id or not home_name or not away_name:
      continue

    home_stats = get_team_stats(home_name)
    away_stats = get_team_stats(away_name)

    # Pre-match lambdas (based on prior matches for each team, or league average).
    if home_stats.home_matches > 0:
      lambda_home = home_stats.home_goals_for / home_stats.home_matches
    else:
      lambda_home = league_lambda_home

    if away_stats.away_matches > 0:
      lambda_away = away_stats.away_goals_for / away_stats.away_matches
    else:
      lambda_away = league_lambda_away

    probs = compute_match_probs(lambda_home, lambda_away)

    # Realized outcomes.
    if gh > ga:
      result_1x2 = "H"
    elif gh == ga:
      result_1x2 = "D"
    else:
      result_1x2 = "A"

    total_goals = gh + ga
    result_ou_2_5 = "Over" if total_goals >= 3 else "Under"
    result_btts = "Yes" if (gh > 0 and ga > 0) else "No"

    rows.append(
      {
        "fixture_id": fixture_id,
        "kickoff_utc": kickoff_utc,
        "home_team": home_name,
        "away_team": away_name,
        "goals_home": gh,
        "goals_away": ga,
        "lambda_home": lambda_home,
        "lambda_away": lambda_away,
        "p_home": probs["p_home"],
        "p_draw": probs["p_draw"],
        "p_away": probs["p_away"],
        "p_btts": probs["p_btts"],
        "p_over_2_5": probs["p_over_2_5"],
        "result_1x2": result_1x2,
        "result_ou_2_5": result_ou_2_5,
        "result_btts": result_btts,
      }
    )

    # Post-match update of team stats.
    home_stats.home_goals_for += gh
    home_stats.home_matches += 1
    away_stats.away_goals_for += ga
    away_stats.away_matches += 1

  df = pd.DataFrame.from_records(rows)
  out = pathlib.Path(out_path)
  out.parent.mkdir(parents=True, exist_ok=True)

  if out.suffix == ".csv":
    df.to_csv(out, index=False)
  elif out.suffix == ".parquet":
    df.to_parquet(out, index=False)
  else:
    # Default to CSV if extension is missing or unknown.
    csv_path = out.with_suffix(".csv")
    df.to_csv(csv_path, index=False)
    out = csv_path

  print(f"Wrote backtest results for {len(df)} matches to {out}")


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument(
    "--fixtures-file",
    type=str,
    default="data/epl-2020-fixtures.json",
    help="Path to season fixtures JSON from season-ingest.mjs",
  )
  parser.add_argument(
    "--out",
    type=str,
    default="data/backtests/epl-2020-baseline.csv",
    help="Output CSV or parquet path",
  )
  args = parser.parse_args()
  run_backtest(args.fixtures_file, args.out)


if __name__ == "__main__":
  main()

