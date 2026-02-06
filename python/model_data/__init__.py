"""
model_data
==========

Shared Python-side data access and schema definitions for the match
prediction engine. This module is intentionally backend-agnostic: it
works with local files (JSON/JSONL/Parquet) or a database, but exposes
tidy DataFrame-style interfaces to modeling code.
"""

from .schema import (
    Competition,
    Season,
    Team,
    Player,
    Match,
    LineupEntry,
    Event,
    MarketPrice,
)

__all__ = [
    "Competition",
    "Season",
    "Team",
    "Player",
    "Match",
    "LineupEntry",
    "Event",
    "MarketPrice",
]

