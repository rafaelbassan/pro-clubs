"""Backward-compatible re-export."""

from ea_client import FC26API as FC26_API, FC26APIError

__all__ = ["FC26_API", "FC26APIError"]
