"""Plotly chart components."""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.components.theme_utils import result_color
from dashboard.i18n import result_label, t

PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(color="#c8d6c8", family="DM Sans"),
    colorway=["#00e676", "#ff5a6a", "#ffb020", "#3742fa", "#a29bfe"],
    margin=dict(l=40, r=40, t=60, b=40),
)


def render_form_chart(matches_df: pd.DataFrame) -> None:
    if matches_df.empty:
        st.info(t("charts.no_form"))
        return

    df = matches_df.sort_values("date").copy()
    df["result_num"] = df["result"].map({"V": 3, "E": 1, "D": 0}).fillna(0)
    df["rolling_form"] = df["result_num"].rolling(5, min_periods=1).mean()

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=df["date"],
            y=df["club_goals"],
            name=t("charts.goals_scored"),
            marker_color="#00e676",
            opacity=0.85,
        )
    )
    fig.add_trace(
        go.Bar(
            x=df["date"],
            y=-df["opponent_goals"],
            name=t("charts.goals_conceded"),
            marker_color="#ff5a6a",
            opacity=0.85,
        )
    )
    fig.add_trace(
        go.Scatter(
            x=df["date"],
            y=df["rolling_form"],
            name=t("charts.form_line"),
            line=dict(color="#ffb020", width=3),
            yaxis="y2",
        )
    )
    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=t("charts.form_title"),
        barmode="relative",
        yaxis=dict(title=t("charts.goals_axis"), gridcolor="#1a3a1a"),
        yaxis2=dict(
            title=t("charts.form_axis"),
            overlaying="y",
            side="right",
            range=[0, 3],
            gridcolor="#1a3a1a",
        ),
        legend=dict(orientation="h", y=1.12),
        height=400,
    )
    st.plotly_chart(fig, use_container_width=True)


def render_results_pie(matches_df: pd.DataFrame) -> None:
    if matches_df.empty:
        return

    counts = matches_df["result"].value_counts().reset_index()
    counts.columns = ["result", "count"]
    label_map = {"V": t("results.win"), "D": t("results.loss"), "E": t("results.draw")}
    counts["label"] = counts["result"].map(label_map)
    colors = [result_color(r) for r in counts["result"]]

    fig = go.Figure(
        go.Pie(
            labels=counts["label"],
            values=counts["count"],
            marker=dict(colors=colors),
            hole=0.58,
            textfont=dict(color="white"),
        )
    )
    fig.update_layout(**PLOTLY_LAYOUT, title=t("charts.results_title"), height=400)
    st.plotly_chart(fig, use_container_width=True)


def render_match_type_chart(matches_df: pd.DataFrame) -> None:
    if matches_df.empty:
        return

    type_labels = {
        "friendlyMatch": t("match_type.friendlyMatch_plural"),
        "leagueMatch": t("match_type.leagueMatch_plural"),
        "playoffMatch": t("match_type.playoffMatch_plural"),
    }
    result_labels = {
        "V": result_label("V"),
        "D": result_label("D"),
        "E": result_label("E"),
    }

    df = matches_df.copy()
    df["tipo"] = df["match_type"].map(type_labels).fillna(df["match_type"])
    df["result_display"] = df["result"].map(result_labels).fillna(df["result"])
    grouped = df.groupby(["tipo", "result", "result_display"]).size().reset_index(name="count")

    fig = px.bar(
        grouped,
        x="tipo",
        y="count",
        color="result",
        color_discrete_map={"V": "#00e676", "D": "#ff5a6a", "E": "#ffb020"},
        labels={
            "tipo": t("charts.type"),
            "count": t("charts.matches"),
            "result": t("charts.result"),
        },
        title=t("charts.match_type_title"),
        hover_data={"result_display": True, "result": False},
    )
    fig.for_each_trace(
        lambda trace: trace.update(
            name=result_labels.get(trace.name, trace.name),
            legendgroup=trace.name,
        )
    )
    fig.update_layout(**PLOTLY_LAYOUT, height=400)
    st.plotly_chart(fig, use_container_width=True)
