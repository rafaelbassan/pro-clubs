"""Club header component."""

from __future__ import annotations

from typing import Any, Dict

import streamlit as st

from dashboard.i18n import t


def render_club_header(summary: Dict[str, Any]) -> None:
    name = summary.get("name") or t("club.fallback_name")
    club_id = summary.get("club_id", "—")
    division = summary.get("current_division", "—")
    stadium = summary.get("stadium") or "—"

    st.markdown(
        f"""
        <div class="pc-club-header">
            <div class="pc-club-name">{name}</div>
            <div class="pc-club-meta">
                {t("club.id")}: <span>{club_id}</span>
                &nbsp;·&nbsp;
                {t("club.division")}: <span>{division}</span>
                &nbsp;·&nbsp;
                {t("club.stadium")}: <span>{stadium}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
