# Cesca

**A fully local, private CV scorer for macOS.** Drop in a CV (PDF), get a
structured quality score with per-section feedback — and *nothing ever leaves
your machine*.

Cesca was built privacy-first:

- The web server binds to **`127.0.0.1` only** — it is never exposed to the network.
- CVs and scores are stored in a **local SQLite database** under `data/`, which is
  git-ignored and never uploaded or shared.
- Scoring can run with a built-in offline engine, or with a **local
  [Ollama](https://ollama.com) model** — in both cases the CV text stays on your Mac.

---

## What it does

Cesca scores a CV on **general quality** (independent of any specific job),
across six weighted dimensions:

| Dimension | Weight | What it looks for |
|---|---|---|
| Impact & achievements | 30% | Quantified results, strong action verbs |
| Clarity & concision | 20% | Skimmable, no filler/buzzwords |
| Structure & sections | 15% | Experience / education / skills / summary present |
| Skills & relevance | 15% | A clear, concrete skills section |
| Contact & basics | 10% | Email, phone, location, links |
| Length & density | 10% | Right length for the content |

The result is an overall score out of 100, a short summary, and a per-dimension
breakdown with feedback. Every scored CV is saved to local history.

---

## Requirements

- macOS (works on any platform with Python, but built for Mac)
- Python 3.10+

## Setup

```bash
git clone <this repo>
cd cesca

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python -m cesca
```

This starts the local server and opens `http://127.0.0.1:8765/` in your browser.
Drop in a PDF and score it.

---

## Using a local LLM (Ollama) — optional

The built-in scorer works immediately with no extra setup. To use a local LLM
instead (still 100% on-device):

1. Install Ollama: https://ollama.com
2. Pull a model, e.g. `ollama pull llama3.1`
3. Start Cesca with the Ollama backend:

   ```bash
   CESCA_SCORER=ollama python -m cesca
   ```

If Ollama isn't running, Cesca automatically falls back to the built-in scorer,
so it never hard-fails.

---

## Configuration

All optional, via environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `CESCA_SCORER` | `heuristic` | `heuristic` or `ollama` |
| `CESCA_OLLAMA_MODEL` | `llama3.1` | Ollama model name |
| `CESCA_OLLAMA_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `CESCA_PORT` | `8765` | Local server port |
| `CESCA_DATA_DIR` | `./data` | Where the local database lives |

---

## Privacy summary

- No analytics, no telemetry, no outbound network calls (except to your *local*
  Ollama, if you enable it).
- Your CVs and scores live only in `data/cesca.db` on this machine.
- Delete a score from the UI and it's removed from the local database.

---

## Development

```bash
pip install -r requirements.txt pytest
pytest
```

## Project layout

```
cesca/
  app.py            FastAPI app (UI + JSON API)
  __main__.py       Entry point: python -m cesca
  config.py         Settings (env-overridable, loopback-only)
  db.py             Local SQLite storage
  pdf_extract.py    In-process PDF text extraction
  rubric.py         Scoring dimensions and weights
  scoring.py        Heuristic scorer + backend dispatch
  ollama_client.py  Local Ollama integration
  static/           Single-page web UI
tests/              Unit tests
```
