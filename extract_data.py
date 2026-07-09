#!/usr/bin/env python3
"""
Extrai dados completos de um clube Pro Clubs e salva em JSON/CSV.

Uso:
    python extract_data.py --club-name "Real Madrid"
    python extract_data.py --club-id 240
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from ea_client import FC26API, MATCH_TYPES
from ingest.parser import club_summary_from_search, parse_match

OUTPUT_DIR = Path("data/extracted")


def resolve_club_id(club_name: Optional[str], club_id: Optional[str], api: FC26API) -> str:
    if club_id:
        return str(club_id)

    if not club_name:
        raise ValueError("Informe --club-name ou --club-id")

    results = api.search_club_by_name(club_name)
    if results is None or results.empty:
        raise ValueError(f"Nenhum clube encontrado com o nome '{club_name}'")

    return str(results.iloc[0].get("clubInfoclubId", results.iloc[0].get("clubId")))


def extract_club_data(
    club_name: Optional[str] = None,
    club_id: Optional[str] = None,
    output_dir: Path = OUTPUT_DIR,
) -> Dict[str, Any]:
    api = FC26API()
    resolved_id = resolve_club_id(club_name, club_id, api)

    search_df = api.search_club_by_name(club_name) if club_name else None
    if search_df is None or search_df.empty:
        search_df = api.search_club_by_name(club_id or resolved_id)

    summary = club_summary_from_search(search_df.iloc[0]) if search_df is not None and not search_df.empty else {
        "club_id": resolved_id,
        "name": club_name or resolved_id,
    }

    details_df = api.get_club_details(resolved_id)
    details: Dict[str, Any] = {}
    if details_df is not None and not details_df.empty:
        details = details_df.iloc[0].to_dict()

    all_matches: List[Dict[str, Any]] = []
    matches_by_type: Dict[str, List[Dict[str, Any]]] = {}

    for match_type in MATCH_TYPES:
        raw_matches = api.get_club_matches(resolved_id, match_type)
        parsed: List[Dict[str, Any]] = []
        if raw_matches is not None and not raw_matches.empty:
            for _, row in raw_matches.iterrows():
                record = parse_match(row.to_dict(), resolved_id)
                record["match_type"] = match_type
                parsed.append(record)
        matches_by_type[match_type] = parsed
        all_matches.extend(parsed)

    payload = {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "club_id": resolved_id,
        "summary": summary,
        "details": details,
        "matches": all_matches,
        "matches_by_type": matches_by_type,
        "stats": {
            "total_matches_extracted": len(all_matches),
            "friendly_matches": len(matches_by_type.get("friendlyMatch", [])),
            "league_matches": len(matches_by_type.get("leagueMatch", [])),
            "playoff_matches": len(matches_by_type.get("playoffMatch", [])),
        },
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    safe_name = summary.get("name", resolved_id).replace(" ", "_").lower()
    base = output_dir / f"{safe_name}_{resolved_id}"

    with open(f"{base}.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, default=str)

    if all_matches:
        pd.DataFrame(all_matches).to_csv(f"{base}_matches.csv", index=False)

    pd.DataFrame([summary]).to_csv(f"{base}_summary.csv", index=False)

    print(f"✓ Dados extraídos para {summary.get('name', resolved_id)} (ID: {resolved_id})")
    print(f"  JSON: {base}.json")
    print(f"  Partidas: {len(all_matches)} registros")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrair dados de clube Pro Clubs")
    parser.add_argument("--club-name", type=str, help="Nome do clube para buscar")
    parser.add_argument("--club-id", type=str, help="ID do clube (pula busca por nome)")
    parser.add_argument("--output-dir", type=str, default="data/extracted")
    args = parser.parse_args()

    extract_club_data(
        club_name=args.club_name,
        club_id=args.club_id,
        output_dir=Path(args.output_dir),
    )


if __name__ == "__main__":
    main()
