"""
Build model-vs-market comparison JSON for upcoming fixtures.

This script:
1. Loads odds snapshots
2. For each match, computes model probabilities (from Monte Carlo or Python model)
3. Computes edge and EV
4. Writes JSON file for consumption by Next.js app
"""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Any, Dict, List

from model_data.ev import compute_model_vs_market
from model_data.odds_loader import aggregate_market_prices, load_odds_api_snapshot
from model_data.odds_utils import decimal_to_prob, remove_vig_three_way
from model_data.schema import MarketPrice


def get_market_probs_from_prices(match_id: str, prices: List[MarketPrice]) -> Dict[str, float]:
  """Extract vig-removed market probabilities from MarketPrice list."""
  
  match_prices = [p for p in prices if p.match_id == match_id]
  if not match_prices:
    return {}
  
  probs: Dict[str, float] = {}
  
  # 1X2
  home_price = aggregate_market_prices(match_prices, "1X2", "H")
  draw_price = aggregate_market_prices(match_prices, "1X2", "D")
  away_price = aggregate_market_prices(match_prices, "1X2", "A")
  
  if home_price and draw_price and away_price:
    p_home_raw = decimal_to_prob(home_price)
    p_draw_raw = decimal_to_prob(draw_price)
    p_away_raw = decimal_to_prob(away_price)
    vig_free = remove_vig_three_way(p_home_raw, p_draw_raw, p_away_raw)
    probs["home"] = vig_free["H"]
    probs["draw"] = vig_free["D"]
    probs["away"] = vig_free["A"]
  
  # O/U 2.5
  ou_25_over = aggregate_market_prices(match_prices, "OU_2.5", "Over")
  ou_25_under = aggregate_market_prices(match_prices, "OU_2.5", "Under")
  
  if ou_25_over and ou_25_under:
    p_over_raw = decimal_to_prob(ou_25_over)
    p_under_raw = decimal_to_prob(ou_25_under)
    total = p_over_raw + p_under_raw
    if total > 0:
      probs["over_2_5"] = p_over_raw / total
      probs["under_2_5"] = p_under_raw / total
  
  return probs


def get_market_prices_dict(match_id: str, prices: List[MarketPrice]) -> Dict[str, float]:
  """Extract median prices as dict for EV computation."""
  
  match_prices = [p for p in prices if p.match_id == match_id]
  result: Dict[str, float] = {}
  
  home_price = aggregate_market_prices(match_prices, "1X2", "H")
  draw_price = aggregate_market_prices(match_prices, "1X2", "D")
  away_price = aggregate_market_prices(match_prices, "1X2", "A")
  
  if home_price:
    result["home"] = home_price
  if draw_price:
    result["draw"] = draw_price
  if away_price:
    result["away"] = away_price
  
  ou_25_over = aggregate_market_prices(match_prices, "OU_2.5", "Over")
  ou_25_under = aggregate_market_prices(match_prices, "OU_2.5", "Under")
  
  if ou_25_over:
    result["over_2_5"] = ou_25_over
  if ou_25_under:
    result["under_2_5"] = ou_25_under
  
  return result


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--odds-file", type=str, required=True, help="Path to The Odds API snapshot JSON")
  parser.add_argument("--model-probs-file", type=str, help="Path to JSON with model probabilities per match")
  parser.add_argument("--out", type=str, required=True, help="Output JSON path")
  args = parser.parse_args()
  
  # Load odds
  prices = load_odds_api_snapshot(args.odds_file)
  
  # Load model probabilities (if provided)
  model_probs_by_match: Dict[str, Dict[str, float]] = {}
  if args.model_probs_file:
    model_raw = json.loads(pathlib.Path(args.model_probs_file).read_text(encoding="utf-8"))
    model_probs_by_match = model_raw if isinstance(model_raw, dict) else {}
  
  # Get unique match IDs from odds
  match_ids = set(p.match_id for p in prices)
  
  results: Dict[str, Any] = {}
  
  for match_id in match_ids:
    market_probs = get_market_probs_from_prices(match_id, prices)
    market_prices_dict = get_market_prices_dict(match_id, prices)
    
    if not market_probs:
      continue
    
    # For now, if no model probs provided, skip EV computation
    # In production, you'd call your Monte Carlo engine here
    model_probs = model_probs_by_match.get(match_id, {})
    
    if model_probs:
      comparison = compute_model_vs_market(model_probs, market_probs, market_prices_dict)
      results[match_id] = {
        "model_probs": model_probs,
        "market_probs": market_probs,
        "edges": comparison["edges"],
        "evs": comparison["evs"],
        "model_fair_odds": comparison["model_fair_odds"],
      }
    else:
      # Still include market probs even without model comparison
      results[match_id] = {
        "market_probs": market_probs,
      }
  
  out_path = pathlib.Path(args.out)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
  print(f"Wrote model-vs-market comparison for {len(results)} matches to {out_path}")


if __name__ == "__main__":
  main()
