"""
Expected value (EV) computation: compare model probabilities vs market.
"""

from __future__ import annotations

from typing import Dict, Optional


def compute_edge_prob(p_model: float, p_market: float) -> float:
  """Edge in probability space: how much higher/lower is model vs market."""
  return p_model - p_market


def compute_ev(p_model: float, decimal_odds: float) -> float:
  """
  Expected value per unit stake.
  
  EV = p_model * (decimal_odds - 1) - (1 - p_model)
     = p_model * decimal_odds - 1
  """
  if p_model <= 0 or decimal_odds <= 0:
    return 0.0
  return p_model * decimal_odds - 1.0


def compute_model_vs_market(
  model_probs: Dict[str, float],
  market_probs: Dict[str, float],
  market_prices: Optional[Dict[str, float]] = None,
) -> Dict[str, any]:
  """
  Compute edge and EV for model vs market comparison.
  
  Args:
    model_probs: { "home": 0.45, "draw": 0.25, "away": 0.30, "over_2_5": 0.55, ... }
    market_probs: { "home": 0.43, "draw": 0.29, "away": 0.28, "over_2_5": 0.52, ... }
    market_prices: optional { "home": 2.20, "draw": 3.25, ... } for EV computation
  
  Returns:
    {
      "edges": { "home": 0.02, "draw": -0.04, "away": 0.02, ... },
      "evs": { "home": 0.05, "draw": -0.10, "away": 0.08, ... },
      "model_fair_odds": { "home": 2.22, "draw": 4.00, ... }
    }
  """
  
  edges: Dict[str, float] = {}
  evs: Dict[str, float] = {}
  model_fair_odds: Dict[str, float] = {}
  
  for key in model_probs:
    p_model = model_probs.get(key, 0.0)
    p_market = market_probs.get(key, 0.0)
    
    edges[key] = compute_edge_prob(p_model, p_market)
    
    if p_model > 0:
      model_fair_odds[key] = 1.0 / p_model
    
    if market_prices and key in market_prices:
      evs[key] = compute_ev(p_model, market_prices[key])
    elif p_market > 0:
      # Use implied odds from market prob as proxy
      implied_odds = 1.0 / p_market
      evs[key] = compute_ev(p_model, implied_odds)
  
  return {
    "edges": edges,
    "evs": evs,
    "model_fair_odds": model_fair_odds,
  }
