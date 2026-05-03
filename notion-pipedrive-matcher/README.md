# Notion ↔ Pipedrive Matcher

Cross-matches **company offerings (associate / full-time roles) stored in a Notion database** against **candidates stored as persons in Pipedrive**, ranking the best-fit candidate for each offering.

Hybrid scoring:
1. **Rule-based pre-filter** — skill overlap, role similarity (fuzzy), location/remote, application-vs-requirements text overlap.
2. **Claude LLM re-rank** — top N candidates per offering are re-scored semantically by Claude (Sonnet 4.6 by default), with prompt caching on the offering context.

## Layout

```
notion-pipedrive-matcher/
├── app.py                  # Streamlit dashboard
├── cli.py                  # Batch CSV exporter
├── requirements.txt
├── .env.example
├── field_mapping.example.json
└── src/
    ├── config.py
    ├── models.py           # Offering, Candidate, MatchScore
    ├── notion_source.py    # Notion DB → Offering[]
    ├── pipedrive_source.py # Pipedrive Persons → Candidate[]
    ├── matcher.py          # Rule-based scoring
    ├── llm_rerank.py       # Claude re-ranker
    └── pipeline.py         # Orchestrator
```

## Setup

```bash
cd notion-pipedrive-matcher
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your tokens
```

### Notion

1. Create an internal integration at https://www.notion.so/my-integrations and copy the secret into `NOTION_TOKEN`.
2. Share your offerings database with that integration.
3. Copy the database ID into `NOTION_OFFERINGS_DATABASE_ID`.

### Pipedrive

1. Settings → Personal preferences → API → copy your token into `PIPEDRIVE_API_TOKEN`.
2. Set `PIPEDRIVE_DOMAIN` to the subdomain part of your Pipedrive URL (e.g. `acme` for `acme.pipedrive.com`).

### Field mapping

Pipedrive custom fields use opaque hash keys, and Notion property names vary. Copy the example and adjust:

```bash
cp field_mapping.example.json field_mapping.json
# edit to match your actual property names / Pipedrive custom field hashes
```

To find Pipedrive custom field keys:
```
GET https://{domain}.pipedrive.com/api/v1/personFields?api_token={token}
```
Look for the `key` value of each field (a 40-char hash).

## Run

**Dashboard:**
```bash
streamlit run app.py
```

**Batch CSV:**
```bash
python cli.py --out matches.csv               # with LLM re-rank
python cli.py --no-llm --out matches_fast.csv # rules only
```

## How matching works

| Signal | Weight | Source |
|---|---|---|
| Skills overlap | 0.35 | Offering.skills ∩ Candidate.skills (+ inferred from candidate text) |
| Role similarity | 0.25 | `fuzz.token_set_ratio(offering.role_title, candidate.{current,target}_role)` |
| Location/remote | 0.15 | exact/partial location match; remote+remote_ok = 1.0 |
| Application fit | 0.25 | `fuzz.token_set_ratio` between offering requirements and candidate application notes/summary |

Top N per offering is then re-ranked by Claude, which returns a 0–1 score and one-sentence rationale per candidate. The offering context is prompt-cached, so re-running matches against the same offering is cheap.

Tune weights in `src/matcher.py` (`WEIGHTS` dict).
