"""
Utilities for working with odds and implied probabilities.
"""

from __future__ import annotations

from typing import Dict


def decimal_to_prob(price: float) -> float:
  return 0.0 if price <= 0 else 1.0 / price


def remove_vig_three_way(p_home: float, p_draw: float, p_away: float) -> Dict[str, float]:
  """
  Remove bookmaker margin from three-way odds (1X2).
  """

  total = p_home + p_draw + p_away
  if total <= 0:
    return {"H": 0.0, "D": 0.0, "A": 0.0}
  return {"H": p_home / total, "D": p_draw / total, "A": p_away / total}

