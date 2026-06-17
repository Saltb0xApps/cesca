"""Scoring engine.

Produces a structured score for a CV against the rubric. Two backends:

  * ``heuristic`` — fast, dependency-free, rule-based. Works today.
  * ``ollama``    — sends the CV to a locally running Ollama model. Used when
                    CESCA_SCORER=ollama. Falls back to heuristic if Ollama is
                    unreachable.

Both return the same ScoreResult shape so the UI and storage don't care which
backend was used.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

from . import config, ollama_client
from .rubric import RUBRIC, overall_from_dimensions


@dataclass
class ScoreResult:
    overall: float  # 0-100
    backend: str
    model: str | None
    dimensions: dict[str, float]  # key -> 0-10
    feedback: dict[str, str]  # key -> short note
    summary: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# --------------------------------------------------------------------------- #
# Heuristic backend
# --------------------------------------------------------------------------- #

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")
_LINK_RE = re.compile(r"(linkedin\.com|github\.com|https?://|[\w-]+\.(?:com|io|dev|me))", re.I)
_NUMBER_RE = re.compile(r"(\$?\d[\d,.]*\s*(?:%|k|m|bn|x|\+)?\b|\b\d{2,}\b)", re.I)

_SECTION_WORDS = {
    "experience": ["experience", "employment", "work history", "professional"],
    "education": ["education", "academic", "degree", "university", "college"],
    "skills": ["skills", "technologies", "competencies", "tools", "stack"],
    "summary": ["summary", "profile", "objective", "about"],
}

_ACTION_VERBS = {
    "led", "built", "designed", "launched", "created", "developed", "managed",
    "improved", "increased", "reduced", "delivered", "shipped", "drove",
    "owned", "scaled", "automated", "optimized", "optimised", "implemented",
    "founded", "grew", "achieved", "spearheaded", "architected", "migrated",
    "negotiated", "mentored", "established", "streamlined", "generated",
}

_BUZZWORDS = {
    "synergy", "go-getter", "team player", "hard worker", "results-driven",
    "self-starter", "think outside the box", "detail-oriented", "dynamic",
    "passionate", "guru", "ninja", "rockstar",
}


def _clamp(v: float) -> float:
    return max(0.0, min(10.0, v))


def score_heuristic(text: str) -> ScoreResult:
    lower = text.lower()
    words = re.findall(r"\b[\w']+\b", text)
    word_count = len(words)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    dims: dict[str, float] = {}
    feedback: dict[str, str] = {}

    # --- contact -------------------------------------------------------- #
    has_email = bool(_EMAIL_RE.search(text))
    has_phone = bool(_PHONE_RE.search(text))
    has_link = bool(_LINK_RE.search(text))
    contact = 4.0 + 3.0 * has_email + 1.5 * has_phone + 1.5 * has_link
    dims["contact"] = _clamp(contact)
    missing = [n for n, ok in [("email", has_email), ("phone", has_phone),
                               ("a link/portfolio", has_link)] if not ok]
    feedback["contact"] = (
        "All key contact details present." if not missing
        else "Consider adding: " + ", ".join(missing) + "."
    )

    # --- structure ------------------------------------------------------ #
    found = [name for name, kws in _SECTION_WORDS.items()
             if any(kw in lower for kw in kws)]
    structure = _clamp(2.0 + 2.0 * len(found))
    dims["structure"] = structure
    absent = [s for s in _SECTION_WORDS if s not in found]
    feedback["structure"] = (
        "Clear sections detected: " + ", ".join(found) + "."
        + ("" if not absent else f" Missing: {', '.join(absent)}.")
    )

    # --- impact --------------------------------------------------------- #
    numbers = len(_NUMBER_RE.findall(text))
    verbs = sum(1 for w in words if w.lower() in _ACTION_VERBS)
    density = (numbers + verbs) / max(1, len(lines))
    impact = _clamp(2.0 + min(5.0, numbers * 0.4) + min(3.0, verbs * 0.5))
    dims["impact"] = impact
    feedback["impact"] = (
        f"Found {numbers} quantified figures and {verbs} action verbs. "
        + ("Strong, results-focused writing." if impact >= 7
           else "Add metrics (%, $, scale) and lead bullets with action verbs.")
    )

    # --- skills --------------------------------------------------------- #
    has_skills_section = any(kw in lower for kw in _SECTION_WORDS["skills"])
    # crude proxy: comma-separated short tokens near a skills heading
    skill_tokens = len(re.findall(r",", text))
    skills = _clamp((6.0 if has_skills_section else 2.0) + min(3.0, skill_tokens * 0.05))
    dims["skills"] = skills
    feedback["skills"] = (
        "Skills section present." if has_skills_section
        else "No clear skills section — add one listing concrete tools/skills."
    )

    # --- clarity -------------------------------------------------------- #
    buzz = sum(1 for b in _BUZZWORDS if b in lower)
    avg_line_words = word_count / max(1, len(lines))
    clarity = 8.0 - min(4.0, buzz * 1.0) - max(0.0, (avg_line_words - 25) * 0.1)
    clarity = _clamp(clarity)
    dims["clarity"] = clarity
    feedback["clarity"] = (
        ("Concise and readable." if buzz == 0 else
         f"Avoid vague buzzwords (found {buzz}).")
        + (" Lines are long; tighten into crisp bullets." if avg_line_words > 25 else "")
    )

    # --- length --------------------------------------------------------- #
    if word_count < 200:
        length, note = 3.0, "Quite short — likely missing detail."
    elif word_count <= 900:
        length, note = 9.0, "Length is well-judged."
    elif word_count <= 1300:
        length, note = 6.5, "On the longer side; trim older or minor detail."
    else:
        length, note = 4.0, "Too long — aim to cut to the most relevant content."
    dims["length"] = _clamp(length)
    feedback["length"] = f"{word_count} words. {note}"

    overall = overall_from_dimensions(dims)
    summary = _heuristic_summary(overall, dims)
    return ScoreResult(
        overall=overall,
        backend="heuristic",
        model=None,
        dimensions=dims,
        feedback=feedback,
        summary=summary,
    )


def _heuristic_summary(overall: float, dims: dict[str, float]) -> str:
    weakest = min(RUBRIC, key=lambda d: dims.get(d.key, 0))
    band = ("Strong" if overall >= 75 else
            "Solid" if overall >= 55 else
            "Needs work")
    return (f"{band} CV ({overall}/100). Biggest opportunity: "
            f"{weakest.label.lower()}.")


# --------------------------------------------------------------------------- #
# Dispatch
# --------------------------------------------------------------------------- #

def score_cv(text: str, backend: str | None = None) -> ScoreResult:
    """Score CV text using the configured (or requested) backend.

    If the ollama backend is requested but unreachable, fall back to the
    heuristic scorer so the app never hard-fails.
    """
    backend = (backend or config.SCORER).lower()
    if backend == "ollama":
        try:
            return ollama_client.score_with_ollama(text)
        except ollama_client.OllamaError:
            result = score_heuristic(text)
            result.summary = (
                "[Ollama unavailable — used built-in scorer] " + result.summary
            )
            return result
    return score_heuristic(text)
