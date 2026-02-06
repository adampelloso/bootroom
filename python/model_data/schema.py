from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class Competition:
  id: str
  name: str
  country: Optional[str] = None


@dataclass
class Season:
  competition_id: str
  season: int


@dataclass
class Team:
  id: str
  name: str
  country: Optional[str] = None


@dataclass
class Player:
  id: str
  name: str
  team_id: str
  position: Optional[str] = None


@dataclass
class Match:
  id: str
  competition_id: str
  season: int
  round: Optional[str]
  kickoff_utc: str
  home_team_id: str
  away_team_id: str
  home_goals: Optional[int]
  away_goals: Optional[int]


@dataclass
class LineupEntry:
  match_id: str
  team_id: str
  player_id: str
  is_starting: bool
  minutes: Optional[int] = None
  position: Optional[str] = None


@dataclass
class Event:
  """
  Canonical event row shared across providers.
  """

  match_id: str
  period: int
  timestamp: float
  team_id: str
  player_id: Optional[str]
  event_type: str
  x: Optional[float] = None
  y: Optional[float] = None
  qualifiers: Optional[Dict[str, Any]] = None


@dataclass
class MarketPrice:
  """
  Canonical odds/market row.
  """

  match_id: str
  bookmaker: str
  market_type: str  # e.g. \"1X2\", \"OU_2.5\"
  outcome: str      # e.g. \"H\", \"D\", \"A\", \"Over\", \"Under\"
  price: float
  ts_utc: str

