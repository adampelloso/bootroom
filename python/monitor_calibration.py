#!/usr/bin/env python3
"""
Simple live calibration monitor.

Given a backtest CSV (or rolling log of predictions), compute:
  - Brier score for 1X2
  - Outcome frequencies vs predicted probabilities in a few buckets

Intended to be run periodically and stats written to data/monitoring/.
"""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Dict

import numpy as np
import pandas as pd


def brier_score_1x2(df: pd.DataFrame) -> float:
  y_true = np.zeros((len(df), 3), dtype=float)
  y_pred = np.stack(
    [df["p_home"].to_numpy(float), df["p_draw"].to_numpy(float), df["p_away"].to_numpy(float)],
    axis=1,
  )
  mapping = {"H": 0, "D": 1, "A": 2}
  for i, res in enumerate(df["result_1x2"]):
    j = mapping.get(res)
    if j is not None:
      y_true[i, j] = 1.0
  return float(np.mean(np.sum((y_pred - y_true) ** 2, axis=1)))


def bucket_calibration(df: pd.DataFrame, col_prob: str, col_outcome: str, outcome_value: str) -> Dict[str, float]:
  """
  Compute average predicted vs empirical frequency in coarse buckets for a single outcome.
  """
  bins = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
  labels = ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]
  df = df.copy()
  df["bucket"] = pd.cut(df[col_prob], bins=bins, labels=labels, include_lowest=True)
  stats: Dict[str, float] = {}
  for label in labels:
    mask = df["bucket"] == label
    if not mask.any():
      continue
    sub = df.loc[mask]
    p_mean = sub[col_prob].mean()
    freq = (sub[col_outcome] == outcome_value).mean()
    stats[label] = float(freq - p_mean)
  return stats


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument(
    "--backtest-file",
    type=str,
    default="data/backtests/epl-2020-baseline.csv",
    help="Backtest or recent predictions log CSV",
  )
  parser.add_argument(
    "--out",
    type=str,
    default="data/monitoring/epl-2020-baseline.json",
    help="Output JSON with monitoring stats",
  )
  args = parser.parse_args()

  df = pd.read_csv(args.backtest_file)

  metrics = {
    "brier_1x2": brier_score_1x2(df),
    "calibration_home": bucket_calibration(df, "p_home", "result_1x2", "H"),
    "calibration_draw": bucket_calibration(df, "p_draw", "result_1x2", "D"),
    "calibration_away": bucket_calibration(df, "p_away", "result_1x2", "A"),
  }

  out_path = pathlib.Path(args.out)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  out_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
  print(f"Wrote monitoring stats to {out_path}")


if __name__ == "__main__":
  main()

