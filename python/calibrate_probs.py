#!/usr/bin/env python3
"""
Fit calibration mappings for baseline model probabilities.

Reads a backtest CSV produced by backtest_run.py and fits monotonic
calibration curves (isotonic regression) for:
  - 1X2: H, D, A
  - O/U 2.5: Over, Under

Writes calibration parameters to lib/modeling/calibration-data.json so
they can be consumed by the Next.js app.
"""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression


def fit_isotonic(x: np.ndarray, y: np.ndarray) -> Tuple[List[float], List[float]]:
  """
  Fit isotonic regression and return the unique (x, y) knots.
  """
  # Sort by x to enforce monotonicity in the domain.
  order = np.argsort(x)
  x_sorted = x[order]
  y_sorted = y[order]

  ir = IsotonicRegression(out_of_bounds="clip")
  y_fit = ir.fit_transform(x_sorted, y_sorted)

  # Compress into unique x with representative y (take mean where x duplicates).
  xs: List[float] = []
  ys: List[float] = []

  last_x = None
  bucket_y: List[float] = []
  for xv, yv in zip(x_sorted, y_fit):
    if last_x is None or float(xv) != float(last_x):
      if bucket_y:
        xs.append(float(last_x))
        ys.append(float(np.mean(bucket_y)))
      last_x = float(xv)
      bucket_y = [float(yv)]
    else:
      bucket_y.append(float(yv))
  if bucket_y:
    xs.append(float(last_x))
    ys.append(float(np.mean(bucket_y)))

  return xs, ys


def fit_market_calibration(df: pd.DataFrame) -> Dict[str, Dict[str, Dict[str, List[float]]]]:
  """
  Fit calibration for 1X2 and OU_2.5 from backtest DataFrame.
  """
  calib: Dict[str, Dict[str, Dict[str, List[float]]]] = {}

  # 1X2
  market_1x2: Dict[str, Dict[str, List[float]]] = {}
  for outcome, prob_col in [("H", "p_home"), ("D", "p_draw"), ("A", "p_away")]:
    p = df[prob_col].to_numpy(dtype=float)
    if outcome == "H":
      y = (df["result_1x2"] == "H").to_numpy(dtype=float)
    elif outcome == "D":
      y = (df["result_1x2"] == "D").to_numpy(dtype=float)
    else:
      y = (df["result_1x2"] == "A").to_numpy(dtype=float)

    # Filter out degenerate values
    mask = (p >= 0.0) & (p <= 1.0)
    p = p[mask]
    y = y[mask]
    if len(p) < 10:
      continue
    xs, ys = fit_isotonic(p, y)
    market_1x2[outcome] = {"xs": xs, "ys": ys}

  if market_1x2:
    calib["1X2"] = market_1x2

  # O/U 2.5
  if "p_over_2_5" in df.columns and "result_ou_2_5" in df.columns:
    p_over = df["p_over_2_5"].to_numpy(dtype=float)
    mask = (p_over >= 0.0) & (p_over <= 1.0)
    p_over = p_over[mask]
    y_over = (df.loc[mask, "result_ou_2_5"] == "Over").to_numpy(dtype=float)
    if len(p_over) >= 10:
      xs_over, ys_over = fit_isotonic(p_over, y_over)
      # Under can be modeled as 1 - Over, but we still record a mirror mapping for completeness.
      xs_under = xs_over
      ys_under = [1.0 - v for v in ys_over]
      calib["OU_2.5"] = {
        "Over": {"xs": xs_over, "ys": ys_over},
        "Under": {"xs": xs_under, "ys": ys_under},
      }

  return calib


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument(
    "--backtest-file",
    type=str,
    default="data/backtests/epl-2020-baseline.csv",
    help="Backtest CSV produced by backtest_run.py",
  )
  parser.add_argument(
    "--out",
    type=str,
    default="lib/modeling/calibration-data.json",
    help="Output JSON path for calibration data (consumed by TS)",
  )
  args = parser.parse_args()

  df = pd.read_csv(args.backtest_file)
  calib = fit_market_calibration(df)

  out_path = pathlib.Path(args.out)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  out_path.write_text(json.dumps({"markets": calib}, indent=2), encoding="utf-8")
  print(f"Wrote calibration data to {out_path}")


if __name__ == "__main__":
  main()

