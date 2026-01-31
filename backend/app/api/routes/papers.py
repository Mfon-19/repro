from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.pdf import extract_pdf_title, infer_paper_title
from app.services.responses import error_response
from app.services.utils import generate_id

router = APIRouter(prefix="/api/v1")
logger = logging.getLogger("repro")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024


@router.post("/papers")
async def upload_paper(paper: Optional[UploadFile] = File(None), title: Optional[str] = Form(None)):
    if not paper:
        return error_response(400, "missing_paper_file", "paper file is required")

    content = await paper.read()
    if len(content) > MAX_UPLOAD_SIZE:
        return error_response(413, "payload_too_large", "paper file too large")

    pdf_title = extract_pdf_title(content)
    extracted_title = infer_paper_title(title, pdf_title, paper.filename or "")
    if extracted_title:
        if title and title.strip():
            source = "form"
        elif pdf_title:
            source = "pdf"
        else:
            source = "filename"
        logger.info(
            "paper title extracted",
            extra={"paper_title": extracted_title, "filename": paper.filename, "source": source},
        )

    # TODO: Persist extracted metadata and associate it with the paper record.
    # TODO: Upload the paper file to object storage (e.g., S3) and persist metadata in the database.
    # TODO: Trigger async pipeline to extract metadata and generate challenge specs.

    paper_id = generate_id("paper")
    return JSONResponse(
        status_code=202,
        content={
            "id": paper_id,
            "status": "processing",
            "filename": Path(paper.filename or "").name,
            "title": extracted_title,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "message": "paper accepted for processing",
            "bytes_read": len(content),
        },
    )


@router.get("/papers/{paper_id}")
async def paper_status(paper_id: str):
    if not paper_id:
        return error_response(400, "missing_id", "paper id is required")

    # TODO: Fetch paper processing status from the database.
    return {
        "id": paper_id,
        "status": "processing",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "progress_percent": 42,
        "message": "paper is being processed",
    }
