from cesca.rubric import RUBRIC, overall_from_dimensions
from cesca.scoring import score_cv, score_heuristic

STRONG_CV = """
Jane Doe
jane.doe@example.com | +1 555 123 4567 | London, UK | linkedin.com/in/janedoe

SUMMARY
Senior software engineer with 8 years building data platforms.

EXPERIENCE
Acme Corp — Staff Engineer (2020–present)
- Led migration that reduced infra cost by 40% and saved $1.2M annually.
- Built a pipeline processing 5M events/day, cutting latency by 60%.
- Mentored 6 engineers and shipped 12 major features.

EDUCATION
BSc Computer Science, University of Example, 2014

SKILLS
Python, Go, PostgreSQL, Kubernetes, AWS, Terraform
"""

WEAK_CV = """
Bob
I am a hard worker and a great team player. Results-driven self-starter.
I helped with stuff at my job and was responsible for various tasks.
"""


def test_weights_sum_to_one():
    assert abs(sum(d.weight for d in RUBRIC) - 1.0) < 1e-6


def test_overall_range():
    full = {d.key: 10 for d in RUBRIC}
    empty = {d.key: 0 for d in RUBRIC}
    assert overall_from_dimensions(full) == 100.0
    assert overall_from_dimensions(empty) == 0.0


def test_strong_beats_weak():
    strong = score_heuristic(STRONG_CV)
    weak = score_heuristic(WEAK_CV)
    assert strong.overall > weak.overall
    assert strong.overall >= 60


def test_result_shape():
    r = score_cv(STRONG_CV, backend="heuristic")
    assert set(r.dimensions.keys()) == {d.key for d in RUBRIC}
    assert set(r.feedback.keys()) == {d.key for d in RUBRIC}
    assert 0 <= r.overall <= 100
    assert r.backend == "heuristic"


def test_ollama_falls_back_when_unavailable():
    # No Ollama running in CI/tests -> should fall back, not raise.
    r = score_cv(STRONG_CV, backend="ollama")
    assert r.backend == "heuristic"
    assert "Ollama unavailable" in r.summary
