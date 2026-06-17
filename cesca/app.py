"""FastAPI application — the local web UI and JSON API.

Bound to loopback only (see config.HOST). Serves a single-page UI from
static/ and a small JSON API for scoring and history.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__, config, db, ollama_client, scoring
from .pdf_extract import PdfExtractionError, extract_text
from .rubric import RUBRIC

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Cesca", version=__version__)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "scorer": config.SCORER,
        "ollama_available": ollama_client.is_available() if config.SCORER == "ollama" else False,
        "ollama_model": config.OLLAMA_MODEL,
    }


@app.get("/api/rubric")
def rubric() -> list[dict]:
    return [
        {"key": d.key, "label": d.label, "weight": d.weight, "description": d.description}
        for d in RUBRIC
    ]


@app.post("/api/score")
async def score(file: UploadFile = File(...)) -> JSONResponse:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    data = await file.read()
    try:
        text = extract_text(data)
    except PdfExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result = scoring.score_cv(text)
    cv_id = db.add_cv(file.filename, text)
    score_id = db.add_score(cv_id, result)

    payload = result.to_dict()
    payload.update({"id": score_id, "cv_id": cv_id, "filename": file.filename})
    return JSONResponse(payload)


@app.get("/api/scores")
def scores() -> list[dict]:
    return db.list_scores()


@app.get("/api/scores/{score_id}")
def score_detail(score_id: int) -> dict:
    row = db.get_score(score_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Score not found.")
    return row


@app.delete("/api/scores/{score_id}")
def remove_score(score_id: int) -> dict:
    db.delete_score(score_id)
    return {"deleted": score_id}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


# Static assets (JS/CSS). Mounted last so it doesn't shadow API routes.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
