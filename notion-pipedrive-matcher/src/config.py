from __future__ import annotations

import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
NOTION_OFFERINGS_DATABASE_ID = os.getenv("NOTION_OFFERINGS_DATABASE_ID", "")

PIPEDRIVE_API_TOKEN = os.getenv("PIPEDRIVE_API_TOKEN", "")
PIPEDRIVE_DOMAIN = os.getenv("PIPEDRIVE_DOMAIN", "")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_RERANK_MODEL = os.getenv("LLM_RERANK_MODEL", "claude-sonnet-4-6")
LLM_RERANK_TOP_N = int(os.getenv("LLM_RERANK_TOP_N", "10"))


def load_field_mapping(path: str | Path | None = None) -> dict:
    candidates = [
        Path(path) if path else None,
        ROOT / "field_mapping.json",
        ROOT / "field_mapping.example.json",
    ]
    for c in candidates:
        if c and c.exists():
            return json.loads(c.read_text())
    return {"notion_offering": {}, "pipedrive_candidate": {}}
