from __future__ import annotations

import pandas as pd
import streamlit as st

from src.notion_source import fetch_offerings
from src.pipedrive_source import fetch_candidates
from src.pipeline import match_one
from src.models import Offering, Candidate


st.set_page_config(page_title="Notion ↔ Pipedrive Matcher", layout="wide")
st.title("Notion offerings ↔ Pipedrive candidates")


@st.cache_data(ttl=600, show_spinner="Fetching Notion offerings...")
def _load_offerings() -> list[Offering]:
    return fetch_offerings()


@st.cache_data(ttl=600, show_spinner="Fetching Pipedrive candidates...")
def _load_candidates() -> list[Candidate]:
    return fetch_candidates()


with st.sidebar:
    st.header("Controls")
    use_llm = st.toggle("Use LLM re-rank (Claude)", value=True)
    top_n = st.slider("LLM shortlist size", 3, 30, 10)
    if st.button("Refresh data"):
        _load_offerings.clear()
        _load_candidates.clear()
        st.rerun()

try:
    offerings = _load_offerings()
    candidates = _load_candidates()
except Exception as exc:
    st.error(f"Failed to load data: {exc}")
    st.stop()

if not offerings:
    st.warning("No offerings returned from Notion. Check your database ID and field mapping.")
    st.stop()
if not candidates:
    st.warning("No candidates returned from Pipedrive. Check your token and field mapping.")
    st.stop()

st.caption(f"{len(offerings)} offerings · {len(candidates)} candidates")

labels = [f"{o.company or '?'} — {o.role_title or '(untitled)'}" for o in offerings]
choice = st.selectbox("Pick an offering to rank candidates against", range(len(offerings)), format_func=lambda i: labels[i])
offering = offerings[choice]

with st.expander("Offering details", expanded=False):
    st.text(offering.as_text())

if st.button("Run match", type="primary"):
    with st.spinner("Scoring candidates..."):
        result = match_one(offering, candidates, use_llm=use_llm, top_n=top_n)

    cand_by_id = {c.id: c for c in candidates}
    rows = []
    for m in result.matches:
        c = cand_by_id.get(m.candidate_id)
        if not c:
            continue
        rows.append({
            "Score": round(m.final_score, 3),
            "Rule": round(m.rule_score, 3),
            "LLM": round(m.llm_score, 3) if m.llm_score is not None else None,
            "Skills": round(m.skill_score, 3),
            "Role": round(m.role_score, 3),
            "Location": round(m.location_score, 3),
            "AppFit": round(m.application_fit_score, 3),
            "Candidate": c.name,
            "Current role": c.current_role,
            "Location ": c.location,
            "Rationale": m.llm_rationale or "",
            "Email": c.email,
        })
    df = pd.DataFrame(rows)
    st.subheader("Ranked candidates")
    st.dataframe(df, use_container_width=True, height=600)
    st.download_button(
        "Download CSV",
        df.to_csv(index=False).encode("utf-8"),
        file_name=f"matches_{offering.id}.csv",
        mime="text/csv",
    )
