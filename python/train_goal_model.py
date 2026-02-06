"""
Train a simple tabular model to predict match goals (λ_home, λ_away).

This is a starter script that:
- Loads a pre-built match-level dataset from a Parquet/CSV file.
- Builds features using model_data.features.
- Trains two GradientBoostingRegressor models (home and away goals).
- Writes model artefacts to python/models/.

You can iterate on the feature set and model choice without touching
the rest of the app.
"""

from __future__ import annotations

import argparse
import pathlib
import pickle

import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

from model_data.features import build_goal_model_features


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--data", type=str, required=True, help="Path to match-level CSV/Parquet dataset")
  parser.add_argument("--outdir", type=str, default="python/models", help="Directory to write model artefacts")
  args = parser.parse_args()

  data_path = pathlib.Path(args.data)
  if data_path.suffix == ".parquet":
    df = pd.read_parquet(data_path)
  else:
    df = pd.read_csv(data_path)

  df = df.dropna(subset=["goals_home", "goals_away"])

  feats = build_goal_model_features(df)

  # Naive column selection: drop obvious non-feature columns.
  drop_cols = {"goals_home", "goals_away", "match_id"}
  feature_cols = [c for c in feats.columns if c not in drop_cols]

  X = feats[feature_cols]
  y_home = df["goals_home"]
  y_away = df["goals_away"]

  X_train, X_val, y_home_train, y_home_val = train_test_split(X, y_home, test_size=0.2, random_state=42)
  _, _, y_away_train, y_away_val = train_test_split(X, y_away, test_size=0.2, random_state=42)

  model_home = GradientBoostingRegressor(random_state=42)
  model_home.fit(X_train, y_home_train)
  home_pred = model_home.predict(X_val)
  home_rmse = mean_squared_error(y_home_val, home_pred, squared=False)

  model_away = GradientBoostingRegressor(random_state=43)
  model_away.fit(X_train, y_away_train)
  away_pred = model_away.predict(X_val)
  away_rmse = mean_squared_error(y_away_val, away_pred, squared=False)

  outdir = pathlib.Path(args.outdir)
  outdir.mkdir(parents=True, exist_ok=True)

  with (outdir / "goal_model_home.pkl").open("wb") as f:
    pickle.dump({"model": model_home, "feature_cols": feature_cols, "rmse": home_rmse}, f)

  with (outdir / "goal_model_away.pkl").open("wb") as f:
    pickle.dump({"model": model_away, "feature_cols": feature_cols, "rmse": away_rmse}, f)

  print(f"Trained home model, RMSE={home_rmse:.3f}")
  print(f"Trained away model, RMSE={away_rmse:.3f}")
  print(f"Saved models to {outdir}")


if __name__ == "__main__":
  main()

