from __future__ import annotations

from typing import Iterable
from notion_client import Client

from .config import NOTION_TOKEN, NOTION_OFFERINGS_DATABASE_ID, load_field_mapping
from .models import Offering


def _extract_property(prop: dict) -> str | list | bool | None:
    if prop is None:
        return None
    t = prop.get("type")
    val = prop.get(t)
    if val is None:
        return None
    if t == "title" or t == "rich_text":
        return "".join(part.get("plain_text", "") for part in val)
    if t == "select":
        return val.get("name") if val else ""
    if t == "multi_select":
        return [v.get("name", "") for v in val]
    if t == "checkbox":
        return bool(val)
    if t == "number":
        return val
    if t == "url" or t == "email" or t == "phone_number":
        return val
    if t == "people":
        return ", ".join(p.get("name", "") for p in val)
    if t == "status":
        return val.get("name") if val else ""
    if t == "date":
        return val.get("start", "")
    return str(val)


def _coerce_skills(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [s.strip() for s in str(value).split(",") if s.strip()]


def fetch_offerings(database_id: str | None = None) -> list[Offering]:
    if not NOTION_TOKEN:
        raise RuntimeError("NOTION_TOKEN not set")
    db_id = database_id or NOTION_OFFERINGS_DATABASE_ID
    if not db_id:
        raise RuntimeError("NOTION_OFFERINGS_DATABASE_ID not set")

    mapping = load_field_mapping().get("notion_offering", {})
    client = Client(auth=NOTION_TOKEN)

    offerings: list[Offering] = []
    cursor = None
    while True:
        resp = client.databases.query(
            database_id=db_id,
            start_cursor=cursor,
            page_size=100,
        )
        for page in resp.get("results", []):
            props = page.get("properties", {})
            extracted = {k: _extract_property(props.get(v)) for k, v in mapping.items()}
            offerings.append(
                Offering(
                    id=page["id"],
                    company=str(extracted.get("company") or ""),
                    role_title=str(extracted.get("role_title") or ""),
                    description=str(extracted.get("description") or ""),
                    requirements=str(extracted.get("requirements") or ""),
                    skills=_coerce_skills(extracted.get("skills")),
                    location=str(extracted.get("location") or ""),
                    remote=extracted.get("remote") if isinstance(extracted.get("remote"), bool) else None,
                    seniority=str(extracted.get("seniority") or ""),
                    raw=props,
                )
            )
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return offerings
