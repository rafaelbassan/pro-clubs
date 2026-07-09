"""
Dashboard Pro Clubs — EA FC 26
Legacy Streamlit UI. The main app is now Next.js at apps/web.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, Optional

DASHBOARD_DIR = Path(__file__).resolve().parent
ROOT_DIR = DASHBOARD_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
import streamlit as st

from dashboard.components.charts import (
    render_form_chart,
    render_match_type_chart,
    render_results_pie,
)
from dashboard.components.club_header import render_club_header
from dashboard.components.matches_table import render_matches_table
from dashboard.components.metrics import render_extra_metrics, render_stats_row
from dashboard.i18n import get_locale, set_locale, t
from dashboard.services.data_loader import extract_club, list_saved_files, load_saved_file

st.set_page_config(
    page_title="Pro Clubs Dashboard",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="expanded",
)


def inject_theme() -> None:
    css = (DASHBOARD_DIR / "styles" / "theme.css").read_text(encoding="utf-8")
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)


def render_welcome() -> None:
    st.markdown(
        f"""
        <div class="pc-welcome">
            <div class="pc-welcome-mark">⚽</div>
            <h2>{t("welcome.title")}</h2>
            <p>{t("welcome.body")}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    features = [
        ("🔍", t("welcome.feature_search_title"), t("welcome.feature_search_desc")),
        ("📊", t("welcome.feature_stats_title"), t("welcome.feature_stats_desc")),
        ("📈", t("welcome.feature_charts_title"), t("welcome.feature_charts_desc")),
    ]
    for col, (icon, title, desc) in zip([col1, col2, col3], features):
        with col:
            st.markdown(
                f"""
                <div class="pc-feature-card">
                    <div class="pc-feature-icon">{icon}</div>
                    <div class="pc-feature-title">{title}</div>
                    <div class="pc-feature-desc">{desc}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )


def render_dashboard(data: Dict[str, Any]) -> None:
    summary = data.get("summary", {})
    matches_df = pd.DataFrame(data.get("matches", []))

    render_club_header(summary)
    render_stats_row(summary)

    st.markdown("<div style='height:0.75rem'></div>", unsafe_allow_html=True)

    col1, col2 = st.columns([3, 2])
    with col1:
        render_form_chart(matches_df)
    with col2:
        render_results_pie(matches_df)

    col3, col4 = st.columns(2)
    with col3:
        render_match_type_chart(matches_df)
    with col4:
        render_extra_metrics(matches_df)

    st.markdown(f'<div class="pc-section-title">{t("table.title")}</div>', unsafe_allow_html=True)
    render_matches_table(matches_df)


def render_sidebar() -> Optional[Dict[str, Any]]:
    with st.sidebar:
        st.markdown(
            f"""
            <p class="pc-sidebar-brand"><span>⚽</span> {t("app.brand")}</p>
            <p class="pc-sidebar-tag">{t("app.tagline")}</p>
            """,
            unsafe_allow_html=True,
        )

        if "locale" not in st.session_state:
            set_locale("pt")

        current = get_locale()
        selected_label = st.radio(
            t("sidebar.language"),
            options=["Português", "English"],
            index=0 if current == "pt" else 1,
            horizontal=True,
            key="locale_radio",
        )
        set_locale("pt" if selected_label == "Português" else "en")

        st.markdown("---")

        mode = st.radio(
            t("sidebar.mode"),
            options=["search", "saved"],
            format_func=lambda key: t(f"sidebar.mode_{key}"),
            label_visibility="collapsed",
            key="mode_radio",
        )

        club_data: Optional[Dict[str, Any]] = None

        if mode == "search":
            club_name = st.text_input(
                t("sidebar.club_name"),
                value="Vibe ES",
                placeholder=t("sidebar.club_placeholder"),
            )
            if st.button(t("sidebar.search_button"), use_container_width=True):
                with st.spinner(t("sidebar.searching")):
                    try:
                        club_data = extract_club(club_name=club_name)
                        st.session_state["club_data"] = club_data
                        st.success(
                            t("sidebar.loaded", name=club_data["summary"].get("name", club_name))
                        )
                    except Exception as exc:
                        st.error(t("sidebar.error", error=str(exc)))

            if "club_data" in st.session_state:
                club_data = st.session_state["club_data"]
        else:
            files = list_saved_files()
            if files:
                selected = st.selectbox(t("sidebar.file"), [f.name for f in files])
                if selected:
                    club_data = load_saved_file(selected)
                    st.session_state["club_data"] = club_data
            else:
                st.warning(t("sidebar.no_saved"))

        st.markdown("---")
        st.markdown(
            f"<small style='color:#8aa08a'>{t('sidebar.footer')}<br>"
            "Based on <a href='https://github.com/1erkandogan/fc26-clubs-api' "
            "style='color:#00e676'>fc26-clubs-api</a></small>",
            unsafe_allow_html=True,
        )

    return club_data


inject_theme()
club_data = render_sidebar()

st.markdown(
    f"""
    <div class="pc-hero">
        <p class="pc-hero-title">Pro Clubs <span class="pc-hero-accent">Dashboard</span></p>
        <p class="pc-hero-sub">{t("app.subtitle")}</p>
    </div>
    """,
    unsafe_allow_html=True,
)

if club_data:
    render_dashboard(club_data)
else:
    render_welcome()
