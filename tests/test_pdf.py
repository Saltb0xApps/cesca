import pytest

from cesca.pdf_extract import PdfExtractionError, extract_text


def test_rejects_non_pdf():
    with pytest.raises(PdfExtractionError):
        extract_text(b"this is not a pdf")


def test_extracts_text_from_generated_pdf():
    reportlab = pytest.importorskip("reportlab", reason="reportlab not installed")
    import io

    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 700, "Hello CV world")
    c.save()
    text = extract_text(buf.getvalue())
    assert "Hello CV world" in text
