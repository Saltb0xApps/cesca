"""Entry point: ``python -m cesca`` (or the ``cesca`` command).

Starts the local server on 127.0.0.1 and opens it in the default browser.
"""

from __future__ import annotations

import threading
import webbrowser

import uvicorn

from . import config


def _open_browser() -> None:
    webbrowser.open(f"http://{config.HOST}:{config.PORT}/")


def main() -> None:
    config.ensure_data_dir()
    print("Cesca — local, private CV scorer")
    print(f"  Scorer backend : {config.SCORER}")
    if config.SCORER == "ollama":
        print(f"  Ollama model   : {config.OLLAMA_MODEL} @ {config.OLLAMA_URL}")
    print(f"  Data directory : {config.DATA_DIR}")
    print(f"  Open           : http://{config.HOST}:{config.PORT}/")
    print("  (Your data stays on this machine — nothing is uploaded.)")

    # Open the browser shortly after the server starts.
    threading.Timer(1.0, _open_browser).start()

    uvicorn.run("cesca.app:app", host=config.HOST, port=config.PORT, log_level="info")


if __name__ == "__main__":
    main()
