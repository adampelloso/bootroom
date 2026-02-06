"""
Feature-building utilities for modeling.

This module is intentionally minimal: it expects pre-joined match-level
DataFrames (home/away) plus event summaries, and constructs tabular
features suitable for tree-based models or as inputs to deeper nets.
"""

from __future__ import annotations

from typing import Dict, List, Optional

import pandas as pd

from .odds_loader import aggregate_market_prices
from .odds_utils import decimal_to_prob, remove_vig_three_way
from .schema import MarketPrice


def compute_odds_features(
  match_id: str, prices: List[MarketPrice]
) -> Dict[str, float]:
  """
  Compute vig-removed market probabilities and aggregated metrics from MarketPrice list.
  
  Returns dict with keys:
    - p_market_home, p_market_draw, p_market_away
    - p_market_over_2_5, p_market_under_2_5
    - spread_h2h (best - worst price spread for home)
    - median_price_home, median_price_draw, median_price_away
  """
  
  match_prices = [p for p in prices if p.match_id == match_id]
  if not match_prices:
    return {}
  
  # Aggregate 1X2 prices
  home_price = aggregate_market_prices(match_prices, "1X2", "H")
  draw_price = aggregate_market_prices(match_prices, "1X2", "D")
  away_price = aggregate_market_prices(match_prices, "1X2", "A")
  
  features: Dict[str, float] = {}
  
  if home_price and draw_price and away_price:
    p_home_raw = decimal_to_prob(home_price)
    p_draw_raw = decimal_to_prob(draw_price)
    p_away_raw = decimal_to_prob(away_price)
    
    probs = remove_vig_three_way(p_home_raw, p_draw_raw, p_away_raw)
    features["p_market_home"] = probs["H"]
    features["p_market_draw"] = probs["D"]
    features["p_market_away"] = probs["A"]
    features["median_price_home"] = home_price
    features["median_price_draw"] = draw_price
    features["median_price_away"] = away_price
    
    # Compute spread (best - worst)
    home_prices = [p.price for p in match_prices if p.market_type == "1X2" and p.outcome == "H"]
    if home_prices:
      features["spread_h2h"] = max(home_prices) - min(home_prices)
  
  # O/U 2.5
  ou_25_over = aggregate_market_prices(match_prices, "OU_2.5", "Over")
  ou_25_under = aggregate_market_prices(match_prices, "OU_2.5", "Under")
  
  if ou_25_over and ou_25_under:
    p_over_raw = decimal_to_prob(ou_25_over)
    p_under_raw = decimal_to_prob(ou_25_under)
    total = p_over_raw + p_under_raw
    if total > 0:
      features["p_market_over_2_5"] = p_over_raw / total
      features["p_market_under_2_5"] = p_under_raw / total
  
  return features


def build_goal_model_features(
  matches: pd.DataFrame, odds_prices: Optional[List[MarketPrice]] = None, match_id_col: str = "fixture_id"
) -> pd.DataFrame:
  """
  Given a match-level DataFrame with columns like:
    - goals_home, goals_away
    - rolling_goals_for_home_L5, rolling_goals_against_home_L5, ...
    - rolling_shots_for_home_L5, ...
  produce a feature matrix X and ensure target columns exist.
  
  If odds_prices is provided, adds odds-derived features (p_market_*, spread_*, etc.).
  """

  feats = matches.copy()

  # Simple schedule features if dates are available.
  if "kickoff_utc" in feats.columns and "home_team" in feats.columns and "away_team" in feats.columns:
    feats["kickoff_dt"] = pd.to_datetime(feats["kickoff_utc"], errors="coerce")

    feats_sorted = feats.sort_values("kickoff_dt")
    for side, col_team in [("home", "home_team"), ("away", "away_team")]:
      # Days since last match per team.
      group = feats_sorted.groupby(col_team)["kickoff_dt"]
      days_since_last = group.diff().dt.total_seconds().div(86400)
      feats_sorted[f"{side}_days_since_last"] = days_since_last
      # Simple match count so far in season as a proxy for workload.
      match_count = group.cumcount()
      feats_sorted[f"{side}_matches_played"] = match_count

    # Re-align to original index.
    feats = feats.join(
      feats_sorted[
        [
          "home_days_since_last",
          "home_matches_played",
          "away_days_since_last",
          "away_matches_played",
        ]
      ],
      how="left",
      rsuffix="_dup",
    )
    feats.drop(columns=[c for c in feats.columns if c.endswith("_dup")], inplace=True)

    feats.drop(columns=["kickoff_dt"], inplace=True)
  
  if odds_prices and match_id_col in feats.columns:
    odds_feat_rows = []
    for _, row in feats.iterrows():
      match_id = str(row[match_id_col])
      odds_feats = compute_odds_features(match_id, odds_prices)
      odds_feat_rows.append(odds_feats)
    
    odds_df = pd.DataFrame.from_records(odds_feat_rows)
    feats = pd.concat([feats, odds_df], axis=1)
  
  return feats

