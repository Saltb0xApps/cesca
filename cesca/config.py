"""Runtime configuration for Cesca.

All settings can be overridden with environment variables, but the defaults are
chosen so the app is private and local out of the box:

  * The server only ever binds to 127.0.0.1 (loopback) — it is not reachable
    from the network.
  * Data lives in a local ``data/`` directory next to the project.
"""

from __future__ import annotations

import os
from pathlib import Path

# Where CVs and scores are stored. Kept out of git via .gitignore.
DATA_DIR = Path(os.environ.get("CESCA_DATA_DIR", Path.cwd() / "data")).expanduser()
DB_PATH = DATA_DIR / "cesca.db"

# Loopback only. We intentionally do not expose a way to bind to 0.0.0.0 so the
# app cannot accidentally be served to the network.
HOST = "127.0.0.1"
PORT = int(os.environ.get("CESCA_PORT", "8765"))

# Scoring backend: "heuristic" (works today, no dependencies) or "ollama"
# (local LLM). Defaults to heuristic so the app is usable before Ollama is set
# up.
SCORER = os.environ.get("CESCA_SCORER", "heuristic").strip().lower()

# Ollama runs locally; this URL stays on the machine.
OLLAMA_URL = os.environ.get("CESCA_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("CESCA_OLLAMA_MODEL", "llama3.1")
OLLAMA_TIMEOUT = float(os.environ.get("CESCA_OLLAMA_TIMEOUT", "120"))


def ensure_data_dir() -> None:
    """Create the local data directory if it does not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
