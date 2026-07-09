"""Internationalization helpers for the Pro Clubs dashboard."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import streamlit as st

I18N_DIR = Path(__file__).resolve().parent
SUPPORTED = ("pt", "en")
DEFAULT_LOCALE = "pt"


@lru_cache(maxsize=4)
def _load_locale(locale: str) -> dict[str, str]:
    path = I18N_DIR / f"{locale}.json"
    if not path.exists():
        path = I18N_DIR / f"{DEFAULT_LOCALE}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def get_locale() -> str:
    locale = st.session_state.get("locale", DEFAULT_LOCALE)
    return locale if locale in SUPPORTED else DEFAULT_LOCALE


def set_locale(locale: str) -> None:
    st.session_state["locale"] = locale if locale in SUPPORTED else DEFAULT_LOCALE


def t(key: str, **kwargs: Any) -> str:
    """Translate a key for the active locale, with optional format kwargs."""
    catalog = _load_locale(get_locale())
    fallback = _load_locale(DEFAULT_LOCALE)
    text = catalog.get(key, fallback.get(key, key))
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            return text
    return text


def result_label(code: str) -> str:
    """Map internal result codes (V/D/E) to locale display codes (V/D/E or W/L/D)."""
    return t(f"results.code.{code}") if code in ("V", "D", "E") else code
