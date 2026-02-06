#!/usr/bin/env python3
"""
EV backtest: simulate betting strategies over historical matches.

Uses:
  - Backtest CSV with model probabilities (from backtest_run.py)
  - Optional odds file (The Odds API snapshot) mapped to fixtures externally

For now, this script:
  - Computes simple EV for 1X2 using model probabilities and median market odds.
  - Simulates flat-stake betting where EV > threshold.
"""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Dict

import numpy as np
import pandas as pd


def compute_ev(p_model: float, decimal_odds: float) -> float:
  if p_model <= 0 or decimal_odds <= 0:
    return 0.0
  return p_model * decimal_odds - 1.0


def simulate_flat_strategy(df: pd.DataFrame, ev_threshold: float = 0.0) -> Dict[str, float]:
  """
  Given a DataFrame with columns:
    - p_home, p_draw, p_away
    - odds_home, odds_draw, odds_away
    - result_1x2
  simulate flat 1-unit bets on any outcome with EV > ev_threshold.
  """
  bankroll = 0.0
  stakes = 0.0
  bets = 0

  for _, row in df.iterrows():
    for outcome, p_col, o_col in [
      ("H", "p_home", "odds_home"),
      ("D", "p_draw", "odds_draw"),
      ("A", "p_away", "odds_away"),
    ]:
      p_model = float(row.get(p_col, np.nan))
      odds = float(row.get(o_col, np.nan))
      if not np.isfinite(p_model) or not np.isfinite(odds):
        continue
      ev = compute_ev(p_model, odds)
      if ev <= ev_threshold:
        continue
      bets += 1
      stakes += 1.0
      if row.get("result_1x2") == outcome:
        bankroll += odds - 1.0
      else:
        bankroll -= 1.0

  roi = bankroll / stakes if stakes > 0 else 0.0
  return {"bets": bets, "stakes": stakes, "bankroll": bankroll, "roi": roi}


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument(
    "--backtest-file",
    type=str,
    default="data/backtests/epl-2020-baseline.csv",
    help="Backtest CSV with model probabilities and outcomes",
  )
  parser.add_argument(
    "--ev-threshold",
    type=float,
    default=0.0,
    help="Minimum EV to bet (e.g. 0.02 for 2%)",
  )
  args = parser.parse_args()

  df = pd.read_csv(args.backtest_file)

  # For now, assume pseudo-odds derived from implied probabilities for demonstration.
  # In production, join real odds here.
  df["odds_home"] = 1.0 / df["p_home"].clip(lower=1e-6)
  df["odds_draw"] = 1.0 / df["p_draw"].clip(lower=1e-6)
  df["odds_away"] = 1.0 / df["p_away"].clip(lower=1e-6)

  stats = simulate_flat_strategy(df, ev_threshold=args.ev_threshold)
  print(json.dumps(stats, indent=2))


if __name__ == "__main__":
  main()

