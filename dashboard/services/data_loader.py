"""Load and extract club data for the dashboard."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
PACKAGES = [
    ROOT_DIR / "packages" / "ea-client",
    ROOT_DIR / "packages" / "shared",
    ROOT_DIR / "packages" / "ingest",
]
for path in [ROOT_DIR, *PACKAGES]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from extract_data import extract_club_data  # noqa: E402


def root_dir() -> Path:
    return ROOT_DIR


def extracted_dir() -> Path:
    return ROOT_DIR / "data" / "extracted"


def extract_club(club_name: Optional[str] = None, club_id: Optional[str] = None) -> Dict[str, Any]:
    return extract_club_data(club_name=club_name, club_id=club_id, output_dir=extracted_dir())


def list_saved_files() -> List[Path]:
    data_dir = extracted_dir()
    if not data_dir.exists():
        return []
    return sorted(data_dir.glob("*.json"))


def load_saved_file(filename: str) -> Dict[str, Any]:
    path = extracted_dir() / filename
    return json.loads(path.read_text(encoding="utf-8"))
