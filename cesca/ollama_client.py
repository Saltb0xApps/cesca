"""Local Ollama integration.

Ollama runs on the user's machine (default http://127.0.0.1:11434), so the CV
text is sent only to localhost — never to a remote server.

This module is imported lazily by scoring.py; if Ollama isn't running, the
caller falls back to the heuristic scorer.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import httpx

from . import config
from .rubric import RUBRIC, overall_from_dimensions

if TYPE_CHECKING:
    from .scoring import ScoreResult


class OllamaError(Exception):
    """Raised when the local Ollama server can't be reached or returns junk."""


def _build_prompt(text: str) -> str:
    lines = [
        "You are an expert career coach scoring a CV/resume on general quality,",
        "independent of any specific job. Score each dimension from 0 to 10.",
        "",
        "Dimensions:",
    ]
    for d in RUBRIC:
        lines.append(f"- {d.key}: {d.label} — {d.description}")
    lines += [
        "",
        "Respond with ONLY a JSON object of this exact shape:",
        "{",
        '  "dimensions": { '
        + ", ".join(f'"{d.key}": <0-10>' for d in RUBRIC)
        + " },",
        '  "feedback": { '
        + ", ".join(f'"{d.key}": "<one concise sentence>"' for d in RUBRIC)
        + " },",
        '  "summary": "<two-sentence overall assessment>"',
        "}",
        "",
        "CV TEXT:",
        '"""',
        text,
        '"""',
    ]
    return "\n".join(lines)


def is_available() -> bool:
    """Quick check whether the local Ollama server is reachable."""
    try:
        r = httpx.get(f"{config.OLLAMA_URL}/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False


def score_with_ollama(text: str) -> "ScoreResult":
    from .scoring import ScoreResult  # avoid circular import at module load

    payload = {
        "model": config.OLLAMA_MODEL,
        "prompt": _build_prompt(text),
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2},
    }
    try:
        resp = httpx.post(
            f"{config.OLLAMA_URL}/api/generate",
            json=payload,
            timeout=config.OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
    except Exception as exc:
        raise OllamaError(f"Could not reach Ollama: {exc}") from exc

    try:
        raw = resp.json()["response"]
        data = json.loads(raw)
    except Exception as exc:
        raise OllamaError(f"Ollama returned unparseable output: {exc}") from exc

    dims_in = data.get("dimensions", {})
    dims: dict[str, float] = {}
    for d in RUBRIC:
        try:
            dims[d.key] = max(0.0, min(10.0, float(dims_in.get(d.key, 0))))
        except (TypeError, ValueError):
            dims[d.key] = 0.0

    feedback = {d.key: str(data.get("feedback", {}).get(d.key, "")) for d in RUBRIC}
    overall = overall_from_dimensions(dims)

    return ScoreResult(
        overall=overall,
        backend="ollama",
        model=config.OLLAMA_MODEL,
        dimensions=dims,
        feedback=feedback,
        summary=str(data.get("summary", "")),
    )
