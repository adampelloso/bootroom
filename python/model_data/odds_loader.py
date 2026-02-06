"""
Load and normalize odds from The Odds API into canonical MarketPrice objects.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any, Dict, List

from .schema import MarketPrice


def load_odds_api_snapshot(path: str) -> List[MarketPrice]:
  """
  Load odds from a The Odds API snapshot JSON file and convert to
  canonical MarketPrice objects.
  
  The Odds API format:
  {
    "id": "match_id",
    "sport_key": "...",
    "commence_time": "2025-01-15T15:00:00Z",
    "home_team": "...",
    "away_team": "...",
    "bookmakers": [
      {
        "key": "bookmaker_name",
        "markets": [
          {
            "key": "h2h",  # or "totals", "spreads"
            "outcomes": [
              {"name": "Team A", "price": 2.5},
              {"name": "Team B", "price": 3.0},
              {"name": "Draw", "price": 3.2}  # for h2h
            ]
          }
        ]
      }
    ]
  }
  """
  
  p = pathlib.Path(path)
  raw = json.loads(p.read_text(encoding="utf-8"))
  matches = raw if isinstance(raw, list) else [raw]
  
  prices: List[MarketPrice] = []
  
  for match in matches:
    match_id = str(match.get("id", ""))
    commence_time = match.get("commence_time", "")
    
    for bookmaker in match.get("bookmakers", []):
      bookmaker_name = bookmaker.get("key", "unknown")
      
      for market in bookmaker.get("markets", []):
        market_key = market.get("key", "")
        
        # Map The Odds API market keys to our canonical types
        if market_key == "h2h":
          market_type = "1X2"
          home_team = match.get("home_team", "")
          away_team = match.get("away_team", "")
          
          for outcome in market.get("outcomes", []):
            name = outcome.get("name", "")
            price = float(outcome.get("price", 0))
            
            # Map team names to H/D/A based on match home/away
            if "Draw" in name or name == "Draw":
              outcome_code = "D"
            elif name == home_team:
              outcome_code = "H"
            elif name == away_team:
              outcome_code = "A"
            else:
              # Fallback: use order (first = home, second = away)
              outcomes_list = market.get("outcomes", [])
              idx = outcomes_list.index(outcome)
              if idx == 0:
                outcome_code = "H"
              elif idx == 1:
                outcome_code = "A"
              else:
                outcome_code = "D"  # fallback
            
            prices.append(
              MarketPrice(
                match_id=match_id,
                bookmaker=bookmaker_name,
                market_type=market_type,
                outcome=outcome_code,
                price=price,
                ts_utc=commence_time,
              )
            )
        
        elif market_key == "totals":
          market_type = f"OU_{market.get('outcomes', [{}])[0].get('point', '2.5')}"
          for outcome in market.get("outcomes", []):
            name = outcome.get("name", "")
            price = float(outcome.get("price", 0))
            outcome_code = "Over" if "Over" in name else "Under"
            
            prices.append(
              MarketPrice(
                match_id=match_id,
                bookmaker=bookmaker_name,
                market_type=market_type,
                outcome=outcome_code,
                price=price,
                ts_utc=commence_time,
              )
            )
  
  return prices


def aggregate_market_prices(prices: List[MarketPrice], market_type: str, outcome: str) -> float | None:
  """
  Aggregate prices across bookmakers for a given market/outcome.
  Returns median price, or None if no prices found.
  """
  
  relevant = [p.price for p in prices if p.market_type == market_type and p.outcome == outcome]
  if not relevant:
    return None
  
  sorted_prices = sorted(relevant)
  n = len(sorted_prices)
  if n % 2 == 0:
    return (sorted_prices[n // 2 - 1] + sorted_prices[n // 2]) / 2.0
  return sorted_prices[n // 2]
