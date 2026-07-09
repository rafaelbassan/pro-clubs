"""Unified client for the EA Sports FC 26 Pro Clubs API."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import pandas as pd
import requests

PLATFORM = "common-gen5"
MATCH_TYPES = ("friendlyMatch", "leagueMatch", "playoffMatch")
DEFAULT_MAX_RESULTS = 10
TIMESTAMP_OFFSET_HOURS = 2


class FC26APIError(Exception):
    """Raised when communication with the FC 26 API fails."""


class FC26API:
    """Thin client for the EA Sports FC 26 Pro Clubs API."""

    BASE_URL = "https://proclubs.ea.com/api/fc"

    def __init__(
        self,
        session: Optional[requests.Session] = None,
        timeout: int = 10,
        proxies: Optional[Dict[str, str]] = None,
        base_url: Optional[str] = None,
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.session = session or requests.Session()
        if proxies:
            self.session.proxies.update(proxies)
        self.timeout = timeout
        self.base_url = (base_url or self.BASE_URL).rstrip("/")
        self.headers: Dict[str, str] = {
            "authority": "proclubs.ea.com",
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
            ),
            "referer": "https://proclubs.ea.com/",
        }
        if extra_headers:
            self.headers.update(extra_headers)
        self._last_error: Optional[FC26APIError] = None

    @property
    def last_error(self) -> Optional[FC26APIError]:
        return self._last_error

    def _build_url(self, endpoint: str) -> str:
        if endpoint.startswith("http"):
            return endpoint
        return f"{self.base_url}/{endpoint.lstrip('/')}"

    def _request_json(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = self._build_url(endpoint)
        try:
            response = self.session.get(
                url,
                params=params,
                headers=self.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            hint = f" (HTTP {status})" if status else ""
            raise FC26APIError(f"Request to {url} failed{hint}") from exc

        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise FC26APIError(f"Failed to decode JSON from {url}") from exc

    def _request_builder(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> pd.DataFrame:
        payload = self._request_json(endpoint, params=params)
        if payload is None:
            return pd.DataFrame()
        return pd.DataFrame(payload)

    def _handle_api_call(
        self,
        endpoint: str,
        params: Dict[str, Any],
    ) -> Optional[pd.DataFrame]:
        try:
            df = self._request_builder(endpoint, params=params)
            self._last_error = None
            return df
        except FC26APIError as exc:
            self._last_error = exc
            return None

    def fetch_matches_raw(
        self,
        club_id: str,
        match_type: str = "friendlyMatch",
        max_result_count: int = DEFAULT_MAX_RESULTS,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch raw match JSON (for probing pagination)."""
        params: Dict[str, Any] = {
            "platform": PLATFORM,
            "clubIds": club_id,
            "matchType": match_type,
            "maxResultCount": max_result_count,
        }
        if extra_params:
            params.update(extra_params)
        try:
            payload = self._request_json("clubs/matches", params=params)
        except FC26APIError as exc:
            self._last_error = exc
            return []
        if not isinstance(payload, list):
            return []
        return payload

    @staticmethod
    def timestamp_to_datetime(
        timestamp: pd.Series,
        offset_hours: int = TIMESTAMP_OFFSET_HOURS,
    ) -> pd.Series:
        return pd.to_datetime(timestamp, unit="s") + pd.Timedelta(hours=offset_hours)

    def _apply_timestamp_column(
        self,
        df: pd.DataFrame,
        column_name: str,
        offset_hours: int = TIMESTAMP_OFFSET_HOURS,
    ) -> pd.DataFrame:
        if df.empty:
            return df
        if column_name not in df.columns:
            raise FC26APIError(
                f"Column '{column_name}' not found for timestamp conversion."
            )
        df = df.copy()
        df[column_name] = self.timestamp_to_datetime(
            df[column_name],
            offset_hours=offset_hours,
        )
        return df

    def normalizer(
        self,
        df: Optional[pd.DataFrame],
        prefix: str,
    ) -> Optional[pd.DataFrame]:
        if df is None:
            return None
        if df.empty:
            return df
        if prefix not in df.columns:
            raise FC26APIError(f"Expected nested column '{prefix}' missing from response.")

        nested_series = df[prefix].apply(
            lambda value: value if isinstance(value, (list, dict)) else {}
        )
        normalized_df = pd.json_normalize(nested_series).add_prefix(prefix)
        return pd.concat([df.drop(columns=[prefix]), normalized_df], axis=1)

    def search_club_by_name(
        self,
        club_name: str,
        limit: int = 10,
    ) -> Optional[pd.DataFrame]:
        params = {"platform": PLATFORM, "clubName": club_name}
        clubs = self._handle_api_call("allTimeLeaderboard/search", params=params)
        if clubs is None:
            return None
        try:
            normalized = self.normalizer(clubs, "clubInfo")
            return normalized.head(limit) if limit else normalized
        except FC26APIError as exc:
            self._last_error = exc
            return None

    def get_club_details(self, club_id: str) -> Optional[pd.DataFrame]:
        params = {"platform": PLATFORM, "clubIds": club_id}
        club_details = self._handle_api_call("clubs/info", params=params)
        if club_details is None:
            return None
        return club_details.T

    def get_club_matches(
        self,
        club_id: str,
        match_type: str = "friendlyMatch",
        max_result_count: int = DEFAULT_MAX_RESULTS,
    ) -> Optional[pd.DataFrame]:
        params = {
            "platform": PLATFORM,
            "clubIds": club_id,
            "matchType": match_type,
            "maxResultCount": max_result_count,
        }
        matches = self._handle_api_call("clubs/matches", params=params)
        if matches is None or matches.empty:
            return matches
        try:
            return self._apply_timestamp_column(matches, "timestamp")
        except FC26APIError as exc:
            self._last_error = exc
            return None

    def get_club_matches_normalized(
        self,
        club_id: str,
        match_type: str = "friendlyMatch",
        max_result_count: int = DEFAULT_MAX_RESULTS,
        gmt: int = TIMESTAMP_OFFSET_HOURS,
    ) -> Optional[pd.DataFrame]:
        params = {
            "platform": PLATFORM,
            "clubIds": club_id,
            "matchType": match_type,
            "maxResultCount": max_result_count,
        }
        matches = self._handle_api_call("clubs/matches", params=params)
        if matches is None or matches.empty:
            return matches
        try:
            matches = self._apply_timestamp_column(matches, "timestamp", offset_hours=gmt)
            return self.normalizer(matches, "clubs")
        except FC26APIError as exc:
            self._last_error = exc
            return None

    def get_all_match_types(
        self,
        club_id: str,
        max_result_count: int = DEFAULT_MAX_RESULTS,
    ) -> Dict[str, Optional[pd.DataFrame]]:
        return {
            match_type: self.get_club_matches(
                club_id,
                match_type=match_type,
                max_result_count=max_result_count,
            )
            for match_type in MATCH_TYPES
        }
