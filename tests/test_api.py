"""Testes da API Pro Clubs FC26."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from fc26_api import (
    get_club_details,
    normalizer,
    request_builder,
    search_club_by_name,
    timestamp_to_datetime,
)
from fc26_api_class import FC26_API, FC26APIError

SAMPLES = Path(__file__).parent.parent / "data" / "samples"


@pytest.fixture
def search_sample() -> list:
    with open(SAMPLES / "raw_search.json") as f:
        return json.load(f)


@pytest.fixture
def details_sample() -> dict:
    with open(SAMPLES / "raw_details.json") as f:
        return json.load(f)


class TestNormalizer:
    def test_normalizer_expands_club_info(self, search_sample):
        df = pd.DataFrame(search_sample)
        result = normalizer(df, "clubInfo")
        assert "clubInfoname" in result.columns
        assert result.iloc[0]["clubInfoname"] == "Real Madrid"


class TestTimestamp:
    def test_timestamp_conversion(self):
        ts = pd.Series([1783582121])
        result = timestamp_to_datetime(ts)
        assert pd.notna(result.iloc[0])


class TestRequestBuilder:
    @patch("fc26_api.requests.get")
    def test_request_builder_success(self, mock_get, search_sample):
        mock_response = MagicMock()
        mock_response.json.return_value = search_sample
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        df = request_builder("https://proclubs.ea.com/api/fc/test")
        assert isinstance(df, pd.DataFrame)
        assert len(df) == len(search_sample)

    @patch("fc26_api.requests.get")
    def test_request_builder_http_error(self, mock_get):
        import requests

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("403")
        mock_get.return_value = mock_response

        result = request_builder("https://proclubs.ea.com/api/fc/test")
        assert result is None


class TestFC26APIClass:
    def test_build_url_relative(self):
        api = FC26_API()
        assert api._build_url("clubs/info").endswith("/api/fc/clubs/info")

    def test_empty_payload_returns_empty_df(self):
        api = FC26_API()
        with patch.object(api, "_request_builder", return_value=pd.DataFrame()):
            result = api.get_club_matches("240")
            assert result is not None
            assert result.empty

    def test_normalizer_missing_column_raises(self):
        api = FC26_API()
        df = pd.DataFrame([{"clubId": "1"}])
        with pytest.raises(FC26APIError):
            api.normalizer(df, "clubInfo")


@pytest.mark.integration
class TestLiveAPI:
    """Testes de integração — requerem acesso à API da EA."""

    def test_search_club_by_name_live(self):
        result = search_club_by_name("Real Madrid")
        assert result is not None
        assert not result.empty
        assert "clubInfoname" in result.columns

    def test_get_club_details_live(self):
        search = search_club_by_name("Real Madrid")
        club_id = str(search.iloc[0]["clubInfoclubId"])
        details = get_club_details(club_id)
        assert details is not None
        assert not details.empty
