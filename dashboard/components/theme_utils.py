"""Shared visual helpers."""


def result_color(result: str) -> str:
    return {"V": "#00e676", "D": "#ff5a6a", "E": "#ffb020"}.get(result, "#8aa08a")
