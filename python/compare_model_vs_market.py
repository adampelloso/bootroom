"""
Compare model predictions vs market-implied probabilities.

This script demonstrates how to:
1. Load model λ estimates (from your TS baseline or Python ML models)
2. Load market odds from The Odds API snapshots
3. Compute model vs market deltas for key markets
"""

from __future__ import annotations

import argparse
import json
import pathlib

from model_data.odds_loader import load_odds_api_snapshot, aggregate_market_prices
from model_data.odds_utils import decimal_to_prob, remove_vig_three_way


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--odds-file", type=str, required=True, help="Path to The Odds API snapshot JSON")
  parser.add_argument("--match-id", type=str, required=True, help="Match ID to analyze")
  parser.add_argument("--model-home-lambda", type=float, required=True, help="Model λ for home goals")
  parser.add_argument("--model-away-lambda", type=float, required=True, help="Model λ for away goals")
  args = parser.parse_args()
  
  # Load market prices
  prices = load_odds_api_snapshot(args.odds_file)
  match_prices = [p for p in prices if p.match_id == args.match_id]
  
  if not match_prices:
    print(f"No odds found for match {args.match_id}")
    return
  
  # Get market-implied probabilities (median across bookmakers)
  home_price = aggregate_market_prices(match_prices, "1X2", "H")
  draw_price = aggregate_market_prices(match_prices, "1X2", "D")
  away_price = aggregate_market_prices(match_prices, "1X2", "A")
  
  if home_price and draw_price and away_price:
    p_home_market = decimal_to_prob(home_price)
    p_draw_market = decimal_to_prob(draw_price)
    p_away_market = decimal_to_prob(away_price)
    
    # Remove vig
    market_probs = remove_vig_three_way(p_home_market, p_draw_market, p_away_market)
    
    print(f"Match {args.match_id}")
    print(f"Model λ: Home {args.model_home_lambda:.2f}, Away {args.model_away_lambda:.2f}")
    print(f"Market implied (vig-removed):")
    print(f"  Home: {market_probs['H']:.1%}, Draw: {market_probs['D']:.1%}, Away: {market_probs['A']:.1%}")
    print(f"\nNote: To get model probabilities, run your Monte Carlo simulation with these λs.")
  
  # Check totals markets
  ou_25_over = aggregate_market_prices(match_prices, "OU_2.5", "Over")
  ou_25_under = aggregate_market_prices(match_prices, "OU_2.5", "Under")
  
  if ou_25_over and ou_25_under:
    p_over_market = decimal_to_prob(ou_25_over)
    p_under_market = decimal_to_prob(ou_25_under)
    total = p_over_market + p_under_market
    if total > 0:
      p_over_clean = p_over_market / total
      print(f"\nO2.5 market:")
      print(f"  Over: {p_over_clean:.1%}, Under: {1 - p_over_clean:.1%}")


if __name__ == "__main__":
  main()
