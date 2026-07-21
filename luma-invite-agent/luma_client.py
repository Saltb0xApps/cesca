"""Thin wrapper around the Luma public API (https://public-api.luma.com).

Requires a Luma Plus subscription. Get your API key from your calendar's
Settings -> Options -> API Keys page, and set it as LUMA_API_KEY.
"""

import os
import time

import requests

BASE_URL = "https://public-api.luma.com"


class LumaError(Exception):
    """Raised when the Luma API returns an error response."""


class LumaClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("LUMA_API_KEY")
        if not self.api_key:
            raise LumaError(
                "No Luma API key found. Set the LUMA_API_KEY environment variable. "
                "(API access requires Luma Plus; create a key in your calendar's settings.)"
            )
        self.session = requests.Session()
        self.session.headers.update({"x-luma-api-key": self.api_key})

    def _request(self, method: str, path: str, *, params: dict | None = None, json: dict | None = None) -> dict:
        for attempt in range(3):
            resp = self.session.request(method, f"{BASE_URL}{path}", params=params, json=json, timeout=30)
            if resp.status_code == 429 and attempt < 2:
                wait = int(resp.headers.get("retry-after", 5))
                time.sleep(wait)
                continue
            if resp.status_code >= 400:
                raise LumaError(f"Luma API {resp.status_code} on {path}: {resp.text}")
            return resp.json() if resp.text else {}
        raise LumaError(f"Luma API rate limited on {path} after retries")

    # -- Identity ------------------------------------------------------------

    def get_self(self) -> dict:
        return self._request("GET", "/v1/users/get-self")

    # -- Events --------------------------------------------------------------

    def list_events(self, after: str | None = None, before: str | None = None,
                    pagination_cursor: str | None = None, pagination_limit: int | None = None) -> dict:
        params = {k: v for k, v in {
            "after": after,
            "before": before,
            "pagination_cursor": pagination_cursor,
            "pagination_limit": pagination_limit,
        }.items() if v is not None}
        return self._request("GET", "/v1/calendars/events/list", params=params)

    def get_event(self, event_id: str) -> dict:
        return self._request("GET", "/v1/events/get", params={"event_id": event_id})

    # -- Guests --------------------------------------------------------------

    def list_guests(self, event_id: str, approval_status: str | None = None,
                    pagination_cursor: str | None = None, pagination_limit: int | None = None) -> dict:
        params = {k: v for k, v in {
            "event_id": event_id,
            "approval_status": approval_status,
            "pagination_cursor": pagination_cursor,
            "pagination_limit": pagination_limit,
        }.items() if v is not None}
        return self._request("GET", "/v1/events/guests/list", params=params)

    def send_invites(self, event_id: str, guests: list[dict], message: str | None = None) -> dict:
        body: dict = {"event_id": event_id, "guests": guests}
        if message:
            body["message"] = message
        return self._request("POST", "/v1/events/guests/send-invites", json=body)

    def add_guests(self, event_id: str, guests: list[dict]) -> dict:
        return self._request("POST", "/v1/events/guests/add", json={"event_id": event_id, "guests": guests})
