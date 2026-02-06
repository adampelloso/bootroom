"""
Derive simple injury/news flags from structured API snapshots.
"""

from __future__ import annotations

from typing import Dict, Any


def key_player_out(injuries_payload: Dict[str, Any]) -> bool:
  """
  Very rough heuristic: return True if the payload shows at least one
  injured/sidelined player. Modeling code can refine this to weight by
  minutes, rating, or role.
  """

  resp = injuries_payload.get("response") or []
  return len(resp) > 0

