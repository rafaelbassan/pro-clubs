"""Metric cards and KPI rows."""

from __future__ import annotations

from typing import Any, Dict

import pandas as pd
import streamlit as st

from dashboard.i18n import t


def metric_card_html(label: str, value: Any, icon: str = "") -> str:
    display = f"{icon} {value}".strip() if icon else str(value)
    return f"""
    <div class="metric-card">
        <div class="metric-value">{display}</div>
        <div class="metric-label">{label}</div>
    </div>
    """


def render_stats_row(summary: Dict[str, Any]) -> None:
    cols = st.columns(6)
    stats = [
        (t("metrics.wins"), summary.get("wins", 0)),
        (t("metrics.losses"), summary.get("losses", 0)),
        (t("metrics.ties"), summary.get("ties", 0)),
        (t("metrics.goals"), summary.get("goals", 0)),
        (t("metrics.goals_against"), summary.get("goals_against", 0)),
        (t("metrics.clean_sheets"), summary.get("clean_sheets", 0)),
    ]
    for col, (label, value) in zip(cols, stats):
        with col:
            st.markdown(metric_card_html(label, value), unsafe_allow_html=True)


def render_extra_metrics(matches_df: pd.DataFrame) -> None:
    if matches_df.empty:
        return

    goal_diff = int(matches_df["club_goals"].sum() - matches_df["opponent_goals"].sum())
    win_rate = (
        (matches_df["result"] == "V").sum() / len(matches_df) * 100 if len(matches_df) else 0
    )
    cols = st.columns(2)
    with cols[0]:
        st.markdown(
            metric_card_html(t("metrics.goal_diff"), goal_diff),
            unsafe_allow_html=True,
        )
    with cols[1]:
        st.markdown(
            metric_card_html(t("metrics.win_rate"), f"{win_rate:.0f}%"),
            unsafe_allow_html=True,
        )
