from __future__ import annotations

import argparse
import csv
import sys

from src.notion_source import fetch_offerings
from src.pipedrive_source import fetch_candidates
from src.pipeline import match_all


def main() -> int:
    parser = argparse.ArgumentParser(description="Match Notion offerings to Pipedrive candidates")
    parser.add_argument("--out", default="matches.csv", help="Output CSV path")
    parser.add_argument("--no-llm", action="store_true", help="Skip Claude re-rank")
    parser.add_argument("--top-n", type=int, default=10, help="LLM shortlist size per offering")
    parser.add_argument("--top-per-offering", type=int, default=10, help="Rows to write per offering")
    args = parser.parse_args()

    offerings = fetch_offerings()
    candidates = fetch_candidates()
    cand_by_id = {c.id: c for c in candidates}
    print(f"Loaded {len(offerings)} offerings and {len(candidates)} candidates", file=sys.stderr)

    results = match_all(offerings, candidates, use_llm=not args.no_llm, top_n=args.top_n)

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "company", "role_title", "candidate_name", "candidate_email",
            "final_score", "rule_score", "llm_score",
            "skill_score", "role_score", "location_score", "application_fit_score",
            "rationale",
        ])
        for r in results:
            for m in r.matches[: args.top_per_offering]:
                c = cand_by_id.get(m.candidate_id)
                if not c:
                    continue
                w.writerow([
                    r.offering.company, r.offering.role_title, c.name, c.email,
                    round(m.final_score, 4), round(m.rule_score, 4),
                    "" if m.llm_score is None else round(m.llm_score, 4),
                    round(m.skill_score, 4), round(m.role_score, 4),
                    round(m.location_score, 4), round(m.application_fit_score, 4),
                    m.llm_rationale or "",
                ])
    print(f"Wrote {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
