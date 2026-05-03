from __future__ import annotations

import re
from rapidfuzz import fuzz

from .models import Offering, Candidate, MatchScore


WEIGHTS = {
    "skills": 0.35,
    "role": 0.25,
    "location": 0.15,
    "application": 0.25,
}


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower()).strip()


def _tokens(s: str) -> set[str]:
    return {t for t in _normalize(s).split() if len(t) > 2}


def skill_overlap(offering: Offering, candidate: Candidate) -> float:
    o_skills = {_normalize(s) for s in offering.skills if s}
    c_skills = {_normalize(s) for s in candidate.skills if s}
    if o_skills and c_skills:
        inter = o_skills & c_skills
        score = len(inter) / max(1, len(o_skills))
        if not inter:
            blob = _tokens(candidate.as_text())
            inferred = sum(1 for s in o_skills if s and s in blob)
            score = inferred / max(1, len(o_skills))
        return min(1.0, score)
    blob = _tokens(candidate.as_text())
    if not o_skills or not blob:
        return 0.0
    inferred = sum(1 for s in o_skills if s and s in blob)
    return min(1.0, inferred / max(1, len(o_skills)))


def role_similarity(offering: Offering, candidate: Candidate) -> float:
    o_role = offering.role_title or ""
    candidates_text = " ".join(filter(None, [candidate.current_role, candidate.target_role]))
    if not o_role or not candidates_text:
        return 0.0
    return fuzz.token_set_ratio(o_role, candidates_text) / 100.0


def location_match(offering: Offering, candidate: Candidate) -> float:
    if offering.remote and candidate.remote_ok:
        return 1.0
    o_loc = _normalize(offering.location)
    c_loc = _normalize(candidate.location)
    if not o_loc or not c_loc:
        return 0.5
    if o_loc == c_loc or o_loc in c_loc or c_loc in o_loc:
        return 1.0
    return fuzz.partial_ratio(o_loc, c_loc) / 100.0


def application_fit(offering: Offering, candidate: Candidate) -> float:
    requirements = " ".join(filter(None, [offering.requirements, offering.description]))
    application = " ".join(filter(None, [candidate.application_notes, candidate.summary]))
    if not requirements or not application:
        return 0.0
    return fuzz.token_set_ratio(requirements, application) / 100.0


def score_pair(offering: Offering, candidate: Candidate) -> MatchScore:
    s_skill = skill_overlap(offering, candidate)
    s_role = role_similarity(offering, candidate)
    s_loc = location_match(offering, candidate)
    s_app = application_fit(offering, candidate)
    rule = (
        WEIGHTS["skills"] * s_skill
        + WEIGHTS["role"] * s_role
        + WEIGHTS["location"] * s_loc
        + WEIGHTS["application"] * s_app
    )
    return MatchScore(
        offering_id=offering.id,
        candidate_id=candidate.id,
        rule_score=round(rule, 4),
        skill_score=round(s_skill, 4),
        role_score=round(s_role, 4),
        location_score=round(s_loc, 4),
        application_fit_score=round(s_app, 4),
    )


def rank_candidates(
    offering: Offering,
    candidates: list[Candidate],
) -> list[MatchScore]:
    scored = [score_pair(offering, c) for c in candidates]
    scored.sort(key=lambda m: m.rule_score, reverse=True)
    return scored
