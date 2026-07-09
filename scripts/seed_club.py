#!/usr/bin/env python3
"""Seed a club into production DB from your machine (EA blocks datacenter IPs).

Usage:
  export DATABASE_URL=postgresql://...
  python scripts/seed_club.py --club-id 898181 --club-name "Vibe ES"
"""

from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path[:0] = [
    os.path.join(ROOT, "packages/ea-client"),
    os.path.join(ROOT, "packages/shared"),
    os.path.join(ROOT, "packages/ingest"),
    os.path.join(ROOT, "services/api"),
]

from ea_client import FC26API  # noqa: E402
from ingest.sync import SyncService  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync one club into the configured DATABASE_URL")
    parser.add_argument("--club-id", required=True, help="EA club id, e.g. 898181")
    parser.add_argument("--club-name", default="", help="Optional club name hint")
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        sys.exit(1)

    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    api = FC26API()
    sync = SyncService(api, Session)
    added, total = sync.sync_club(args.club_id, club_name=args.club_name or None)
    print(f"Synced club {args.club_id}: added={added}, total={total}")


if __name__ == "__main__":
    main()
