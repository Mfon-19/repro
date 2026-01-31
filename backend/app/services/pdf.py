from __future__ import annotations

import io
from typing import Optional

from pypdf import PdfReader


def extract_pdf_title(pdf_bytes: bytes) -> str:
    if not pdf_bytes:
        return ""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        metadata = reader.metadata
        if not metadata:
            return ""
        title = metadata.get("/Title") or metadata.get("Title")
        return str(title).strip() if title else ""
    except Exception:
        return ""


def infer_paper_title(form_title: Optional[str], pdf_title: Optional[str], filename: str) -> str:
    if form_title and form_title.strip():
        return form_title.strip()
    if pdf_title and pdf_title.strip():
        return pdf_title.strip()
    base = filename.rsplit("/", 1)[-1]
    base = base.rsplit("\\", 1)[-1]
    if "." in base:
        base = base.rsplit(".", 1)[0]
    base = base.replace("_", " ").replace("-", " ").strip()
    return base.upper() if base else ""
