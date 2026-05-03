from __future__ import annotations

import requests

from .config import PIPEDRIVE_API_TOKEN, PIPEDRIVE_DOMAIN, load_field_mapping
from .models import Candidate


def _coerce_skills(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [s.strip() for s in str(value).split(",") if s.strip()]


def _coerce_bool(value) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in ("yes", "true", "1", "y"):
        return True
    if s in ("no", "false", "0", "n"):
        return False
    return None


def _coerce_float(value) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def fetch_candidates(filter_id: int | None = None) -> list[Candidate]:
    if not PIPEDRIVE_API_TOKEN or not PIPEDRIVE_DOMAIN:
        raise RuntimeError("PIPEDRIVE_API_TOKEN and PIPEDRIVE_DOMAIN must be set")

    mapping = load_field_mapping().get("pipedrive_candidate", {})
    base = f"https://{PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/persons"

    candidates: list[Candidate] = []
    start = 0
    limit = 500
    while True:
        params = {
            "api_token": PIPEDRIVE_API_TOKEN,
            "start": start,
            "limit": limit,
        }
        if filter_id:
            params["filter_id"] = filter_id
        r = requests.get(base, params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        for person in payload.get("data") or []:
            email = ""
            if person.get("email"):
                email = person["email"][0].get("value", "") if isinstance(person["email"], list) else ""

            def _get(key: str):
                custom_key = mapping.get(key)
                if not custom_key:
                    return None
                return person.get(custom_key) or person.get(key)

            candidates.append(
                Candidate(
                    id=str(person.get("id")),
                    name=person.get("name", "") or "",
                    email=email,
                    current_role=str(_get("current_role") or ""),
                    target_role=str(_get("target_role") or ""),
                    summary=str(_get("summary") or ""),
                    skills=_coerce_skills(_get("skills")),
                    location=str(_get("location") or ""),
                    remote_ok=_coerce_bool(_get("remote_ok")),
                    years_experience=_coerce_float(_get("years_experience")),
                    application_notes=str(_get("application_notes") or ""),
                    raw=person,
                )
            )
        pagination = (payload.get("additional_data") or {}).get("pagination") or {}
        if not pagination.get("more_items_in_collection"):
            break
        start = pagination.get("next_start", start + limit)
    return candidates
