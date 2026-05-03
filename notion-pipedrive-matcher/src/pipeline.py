from __future__ import annotations

from dataclasses import dataclass

from .config import LLM_RERANK_TOP_N
from .models import Offering, Candidate, MatchScore
from .matcher import rank_candidates
from .llm_rerank import rerank


@dataclass
class OfferingMatches:
    offering: Offering
    matches: list[MatchScore]


def match_one(
    offering: Offering,
    candidates: list[Candidate],
    use_llm: bool = True,
    top_n: int | None = None,
) -> OfferingMatches:
    ranked = rank_candidates(offering, candidates)
    if use_llm and ranked:
        n = top_n or LLM_RERANK_TOP_N
        shortlist_ids = {m.candidate_id for m in ranked[:n]}
        shortlist = [
            (c, m)
            for c in candidates
            for m in ranked
            if c.id == m.candidate_id and c.id in shortlist_ids
        ]
        rerank(offering, shortlist)
        ranked.sort(
            key=lambda m: (m.llm_score if m.llm_score is not None else m.rule_score),
            reverse=True,
        )
    return OfferingMatches(offering=offering, matches=ranked)


def match_all(
    offerings: list[Offering],
    candidates: list[Candidate],
    use_llm: bool = True,
    top_n: int | None = None,
) -> list[OfferingMatches]:
    return [match_one(o, candidates, use_llm=use_llm, top_n=top_n) for o in offerings]
