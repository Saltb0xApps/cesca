from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class Offering(BaseModel):
    id: str
    company: str = ""
    role_title: str = ""
    description: str = ""
    requirements: str = ""
    skills: list[str] = Field(default_factory=list)
    location: str = ""
    remote: Optional[bool] = None
    seniority: str = ""
    raw: dict = Field(default_factory=dict)

    def as_text(self) -> str:
        parts = [
            f"Company: {self.company}",
            f"Role: {self.role_title}",
            f"Seniority: {self.seniority}" if self.seniority else "",
            f"Location: {self.location}" if self.location else "",
            f"Remote: {self.remote}" if self.remote is not None else "",
            f"Skills: {', '.join(self.skills)}" if self.skills else "",
            f"Requirements: {self.requirements}" if self.requirements else "",
            f"Description: {self.description}" if self.description else "",
        ]
        return "\n".join(p for p in parts if p)


class Candidate(BaseModel):
    id: str
    name: str = ""
    email: str = ""
    current_role: str = ""
    target_role: str = ""
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    location: str = ""
    remote_ok: Optional[bool] = None
    years_experience: Optional[float] = None
    application_notes: str = ""
    raw: dict = Field(default_factory=dict)

    def as_text(self) -> str:
        parts = [
            f"Name: {self.name}",
            f"Current role: {self.current_role}" if self.current_role else "",
            f"Target role: {self.target_role}" if self.target_role else "",
            f"Years exp: {self.years_experience}" if self.years_experience is not None else "",
            f"Location: {self.location}" if self.location else "",
            f"Remote ok: {self.remote_ok}" if self.remote_ok is not None else "",
            f"Skills: {', '.join(self.skills)}" if self.skills else "",
            f"Summary: {self.summary}" if self.summary else "",
            f"Application notes: {self.application_notes}" if self.application_notes else "",
        ]
        return "\n".join(p for p in parts if p)


class MatchScore(BaseModel):
    offering_id: str
    candidate_id: str
    rule_score: float = 0.0
    skill_score: float = 0.0
    role_score: float = 0.0
    location_score: float = 0.0
    application_fit_score: float = 0.0
    llm_score: Optional[float] = None
    llm_rationale: Optional[str] = None

    @property
    def final_score(self) -> float:
        return self.llm_score if self.llm_score is not None else self.rule_score
