"""The CV scoring rubric.

This defines *what* a good CV looks like, independent of how it is scored
(heuristic or LLM). Both backends produce a score for each dimension on a 0-10
scale; the weighted sum becomes the overall 0-100 score.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Dimension:
    key: str
    label: str
    weight: float
    description: str


# Weights sum to 1.0.
RUBRIC: list[Dimension] = [
    Dimension(
        key="contact",
        label="Contact & basics",
        weight=0.10,
        description="Clear name, email, phone, location, and relevant links "
        "(LinkedIn, portfolio, GitHub).",
    ),
    Dimension(
        key="structure",
        label="Structure & sections",
        weight=0.15,
        description="Well-organised into the expected sections: experience, "
        "education, skills, and a summary.",
    ),
    Dimension(
        key="impact",
        label="Impact & achievements",
        weight=0.30,
        description="Accomplishments are quantified (numbers, %, $, scale) and "
        "use strong action verbs rather than listing duties.",
    ),
    Dimension(
        key="skills",
        label="Skills & relevance",
        weight=0.15,
        description="A clear skills section listing concrete, relevant tools "
        "and competencies.",
    ),
    Dimension(
        key="clarity",
        label="Clarity & concision",
        weight=0.20,
        description="Concise bullet points, consistent tense, no filler or "
        "vague buzzwords; easy to skim.",
    ),
    Dimension(
        key="length",
        label="Length & density",
        weight=0.10,
        description="Appropriate length for experience level — neither too "
        "sparse nor padded.",
    ),
]

RUBRIC_BY_KEY = {d.key: d for d in RUBRIC}


def overall_from_dimensions(scores: dict[str, float]) -> float:
    """Combine per-dimension 0-10 scores into an overall 0-100 score."""
    total = 0.0
    for dim in RUBRIC:
        s = max(0.0, min(10.0, float(scores.get(dim.key, 0.0))))
        total += s * dim.weight
    return round(total * 10.0, 1)  # 0-10 weighted -> 0-100
