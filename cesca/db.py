"""Local SQLite storage.

Stores every CV and its scores so you can revisit them later. The database file
lives under the local data directory and is never synced or shared.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cvs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id      INTEGER NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    backend    TEXT NOT NULL,
    model      TEXT,
    overall    REAL NOT NULL,
    dimensions TEXT NOT NULL,
    feedback   TEXT NOT NULL,
    summary    TEXT,
    created_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    config.ensure_data_dir()
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def add_cv(filename: str, text: str) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO cvs (filename, text, created_at) VALUES (?, ?, ?)",
            (filename, text, _now()),
        )
        return int(cur.lastrowid)


def add_score(cv_id: int, result: Any) -> int:
    with _connect() as conn:
        cur = conn.execute(
            """INSERT INTO scores
                 (cv_id, backend, model, overall, dimensions, feedback, summary, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                cv_id,
                result.backend,
                result.model,
                result.overall,
                json.dumps(result.dimensions),
                json.dumps(result.feedback),
                result.summary,
                _now(),
            ),
        )
        return int(cur.lastrowid)


def list_scores(limit: int = 100) -> list[dict]:
    """Return recent scores joined with their CV filename, newest first."""
    with _connect() as conn:
        rows = conn.execute(
            """SELECT s.id, s.cv_id, c.filename, s.backend, s.model,
                      s.overall, s.summary, s.created_at
                 FROM scores s
                 JOIN cvs c ON c.id = s.cv_id
                 ORDER BY s.created_at DESC
                 LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_score(score_id: int) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """SELECT s.*, c.filename, c.text AS cv_text
                 FROM scores s
                 JOIN cvs c ON c.id = s.cv_id
                 WHERE s.id = ?""",
            (score_id,),
        ).fetchone()
        if row is None:
            return None
        d = dict(row)
        d["dimensions"] = json.loads(d["dimensions"])
        d["feedback"] = json.loads(d["feedback"])
        return d


def delete_score(score_id: int) -> None:
    """Delete a score, and its CV if no other scores reference it."""
    with _connect() as conn:
        row = conn.execute("SELECT cv_id FROM scores WHERE id = ?", (score_id,)).fetchone()
        conn.execute("DELETE FROM scores WHERE id = ?", (score_id,))
        if row is not None:
            remaining = conn.execute(
                "SELECT COUNT(*) AS n FROM scores WHERE cv_id = ?", (row["cv_id"],)
            ).fetchone()["n"]
            if remaining == 0:
                conn.execute("DELETE FROM cvs WHERE id = ?", (row["cv_id"],))
