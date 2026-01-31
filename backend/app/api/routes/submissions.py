from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from app.services.responses import error_response
from app.services.utils import generate_id

router = APIRouter(prefix="/api/v1")

MAX_UPLOAD_SIZE = 50 * 1024 * 1024


@router.post("/submissions")
async def upload_submission(submission: UploadFile | None = File(None)):
    if not submission:
        return error_response(400, "missing_submission_file", "submission zip file is required")

    filename = submission.filename or ""
    if not filename.lower().endswith(".zip"):
        return error_response(400, "invalid_file_type", "submission must be a .zip archive")

    content = await submission.read()
    if len(content) > MAX_UPLOAD_SIZE:
        return error_response(413, "payload_too_large", "submission file too large")

    # TODO: Upload submission archive to storage and enqueue evaluation pipeline.

    submission_id = generate_id("sub")
    return JSONResponse(
        status_code=202,
        content={
            "submission_id": submission_id,
            "status": "queued",
            "filename": Path(filename).name,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "bytes_read": len(content),
            "message": "submission accepted for evaluation",
        },
    )
