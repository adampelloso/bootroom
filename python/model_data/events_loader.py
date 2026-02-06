"""
Helpers for reading provider-specific event JSONL into the canonical
Event schema and into DataFrames for modeling.
"""

from __future__ import annotations

import json
import pathlib
from typing import Iterable, List

import pandas as pd

from .schema import Event


def load_api_football_events(path: str) -> List[Event]:
  """
  Load events from data/events/api_football/.../events.jsonl into
  the canonical Event representation.

  This expects raw API-Football event objects and maps a subset of
  fields (fixture id, time, team, player, type, location).
  """

  events: List[Event] = []
  p = pathlib.Path(path)
  for line in p.read_text(encoding="utf-8").splitlines():
    if not line.strip():
      continue
    raw = json.loads(line)
    match_id = str(raw.get("fixture", {}).get("id") or raw.get("fixture_id"))
    team = raw.get("team", {}) or {}
    player = raw.get("player", {}) or {}
    time = raw.get("time", {}) or {}
    detail = raw.get("detail")
    event_type = raw.get("type") or detail or "unknown"

    e = Event(
      match_id=match_id,
      period=int(time.get("elapsed") or 0),
      timestamp=float(time.get("elapsed") or 0),
      team_id=str(team.get("id") or ""),
      player_id=str(player.get("id")) if player.get("id") is not None else None,
      event_type=str(event_type),
      x=None,
      y=None,
      qualifiers=raw,
    )
    events.append(e)
  return events


def events_to_dataframe(events: Iterable[Event]) -> pd.DataFrame:
  """
  Convert an iterable of Event objects to a pandas DataFrame suitable
  for feature engineering.
  """

  rows = []
  for e in events:
    rows.append(
      {
        "match_id": e.match_id,
        "period": e.period,
        "timestamp": e.timestamp,
        "team_id": e.team_id,
        "player_id": e.player_id,
        "event_type": e.event_type,
      }
    )
  return pd.DataFrame.from_records(rows)

