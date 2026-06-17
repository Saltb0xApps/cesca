"""Extract plain text from a PDF, entirely in-process.

The bytes never leave the machine — pypdf parses them locally.
"""

from __future__ import annotations

import io

from pypdf import PdfReader


class PdfExtractionError(Exception):
    """Raised when a PDF cannot be read or contains no extractable text."""


def extract_text(data: bytes) -> str:
    """Return the concatenated text of every page in the PDF.

    Raises PdfExtractionError if the file is not a readable PDF or yields no
    text (e.g. a scanned image with no OCR layer).
    """
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:  # pypdf raises a variety of errors
        raise PdfExtractionError(f"Could not read PDF: {exc}") from exc

    if reader.is_encrypted:
        # Try empty password; many "encrypted" PDFs use no password.
        try:
            reader.decrypt("")
        except Exception as exc:
            raise PdfExtractionError(
                "PDF is password protected and cannot be opened."
            ) from exc

    parts: list[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            # Skip pages that fail rather than aborting the whole document.
            continue

    text = "\n".join(parts).strip()
    if not text:
        raise PdfExtractionError(
            "No text could be extracted. The PDF may be a scanned image "
            "without a text layer."
        )
    return text
