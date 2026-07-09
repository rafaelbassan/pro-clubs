"""Match history table."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from dashboard.components.theme_utils import result_color
from dashboard.i18n import get_locale, result_label, t


def render_matches_table(matches_df: pd.DataFrame) -> None:
    if matches_df.empty:
        st.info(t("table.empty"))
        return

    display = matches_df.sort_values("date", ascending=False).copy()
    date_fmt = "%d/%m/%Y %H:%M" if get_locale() == "pt" else "%Y-%m-%d %H:%M"
    display[t("table.date")] = pd.to_datetime(display["date"]).dt.strftime(date_fmt)

    type_map = {
        "friendlyMatch": t("match_type.friendlyMatch"),
        "leagueMatch": t("match_type.leagueMatch"),
        "playoffMatch": t("match_type.playoffMatch"),
    }
    display[t("table.type")] = display["match_type"].map(type_map).fillna(display["match_type"])
    display[t("table.opponent")] = display["opponent_name"]
    display[t("table.score")] = display["score"]
    display[t("table.result")] = display["result"].map(
        lambda code: result_label(code) if code in ("V", "D", "E") else code
    )
    display[t("table.stadium")] = display["stadium"]

    cols = [
        t("table.date"),
        t("table.type"),
        t("table.opponent"),
        t("table.score"),
        t("table.result"),
        t("table.stadium"),
    ]
    table = display[cols]
    result_col = t("table.result")

    # Map display codes back to internal colors via reverse lookup
    reverse = {result_label(c): c for c in ("V", "D", "E")}

    def style_result(val: str) -> str:
        internal = reverse.get(val, val)
        color = result_color(internal)
        return f"color: {color}; font-weight: 700"

    styled = table.style.map(style_result, subset=[result_col])
    st.dataframe(styled, use_container_width=True, hide_index=True)
