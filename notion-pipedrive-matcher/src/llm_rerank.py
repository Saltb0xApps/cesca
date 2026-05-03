from __future__ import annotations

import json
import re
from anthropic import Anthropic

from .config import ANTHROPIC_API_KEY, LLM_RERANK_MODEL
from .models import Offering, Candidate, MatchScore


SYSTEM_PROMPT = """You are an expert technical recruiter. You score how well candidates fit a given job offering.

For each candidate, return a score from 0.0 to 1.0 and a brief one-sentence rationale.
Consider: skill alignment with requirements, role/seniority match, location/remote fit, and how the candidate's application notes/summary address the offering's requirements.

You MUST respond with ONLY a JSON array, no prose. Schema:
[{"candidate_id": "<id>", "score": <0.0-1.0>, "rationale": "<one sentence>"}]
"""


def _client() -> Anthropic:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    return Anthropic(api_key=ANTHROPIC_API_KEY)


def _extract_json_array(text: str) -> list[dict]:
    text = text.strip()
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return []
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return []


def rerank(
    offering: Offering,
    shortlist: list[tuple[Candidate, MatchScore]],
    model: str | None = None,
) -> list[MatchScore]:
    if not shortlist:
        return []

    client = _client()
    candidates_block = "\n\n---\n\n".join(
        f"CANDIDATE_ID: {c.id}\n{c.as_text()}" for c, _ in shortlist
    )
    user_msg = (
        f"OFFERING:\n{offering.as_text()}\n\n"
        f"=====\n\nCANDIDATES TO SCORE:\n\n{candidates_block}"
    )

    resp = client.messages.create(
        model=model or LLM_RERANK_MODEL,
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": f"OFFERING_CONTEXT:\n{offering.as_text()}",
                "cache_control": {"type": "ephemeral"},
            },
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
    parsed = _extract_json_array(text)
    by_id = {p.get("candidate_id"): p for p in parsed if isinstance(p, dict)}

    out: list[MatchScore] = []
    for cand, score in shortlist:
        entry = by_id.get(cand.id)
        if entry:
            try:
                score.llm_score = float(entry.get("score", 0.0))
            except (TypeError, ValueError):
                score.llm_score = None
            score.llm_rationale = str(entry.get("rationale", ""))[:500]
        out.append(score)
    return out
