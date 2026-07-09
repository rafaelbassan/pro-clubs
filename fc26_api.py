"""Backward-compatible shim for the unified EA client."""

import json

import pandas as pd
import requests

from ea_client import FC26API, FC26APIError, MATCH_TYPES, PLATFORM

_api = FC26API()


def request_builder(url, params=None):
    try:
        response = requests.get(
            url,
            params=params,
            headers=_api.headers,
            timeout=_api.timeout,
        )
        response.raise_for_status()
        return pd.DataFrame(response.json())
    except requests.exceptions.HTTPError:
        return None
    except requests.exceptions.RequestException:
        return None
    except json.JSONDecodeError:
        return None


def timestamp_to_datetime(timestamp):
    return FC26API.timestamp_to_datetime(timestamp)


def normalizer(df, prefix):
    return _api.normalizer(df, prefix)


def search_club_by_name(club_name):
    return _api.search_club_by_name(club_name, limit=1)


def get_club_details(club_id):
    return _api.get_club_details(club_id)


def get_club_matches(club_id, match_type="friendlyMatch"):
    return _api.get_club_matches(club_id, match_type)


def get_club_matches_normalized(club_id, match_type="friendlyMatch"):
    return _api.get_club_matches_normalized(club_id, match_type)
