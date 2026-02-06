"""
Ingest StatsBomb open-data events into the canonical event format.

This script assumes you have downloaded StatsBomb open-data JSON locally.
It walks a directory of event files and writes a flattened JSONL under
data/events/statsbomb/{competition}/{season}.jsonl.

Because StatsBomb open data has its own license and distribution, this
script does not fetch from the internet directly; it just reshapes local
files into a form that the modeling layer can consume.
"""

import argparse
import json
import pathlib
from typing import Any, Dict


def iter_event_files(root: pathlib.Path):
  for path in root.rglob("*.json"):
    if path.name.lower().endswith("events.json"):
      yield path


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--statsbomb-root", type=str, required=True, help="Path to root of StatsBomb open-data tree")
  parser.add_argument("--competition", type=str, required=True, help="Competition code (e.g. 'epl', 'laliga')")
  parser.add_argument("--season", type=str, required=True, help="Season label (e.g. '1819')")
  args = parser.parse_args()

  root = pathlib.Path(args.statsbomb_root)
  out_dir = pathlib.Path("data") / "events" / "statsbomb" / args.competition / args.season
  out_dir.mkdir(parents=True, exist_ok=True)
  out_path = out_dir / "events.jsonl"

  with out_path.open("w", encoding="utf-8") as f_out:
    for ev_file in iter_event_files(root):
      raw = json.loads(ev_file.read_text(encoding="utf-8"))
      if isinstance(raw, list):
        for ev in raw:
          f_out.write(json.dumps(ev) + "\n")
      else:
        f_out.write(json.dumps(raw) + "\n")

  print(f"Wrote StatsBomb events JSONL to {out_path}")


if __name__ == "__main__":
  main()

