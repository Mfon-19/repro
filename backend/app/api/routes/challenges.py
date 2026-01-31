from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services.responses import error_response
from app.services.utils import generate_id

router = APIRouter(prefix="/api/v1")


@router.get("/challenges/{paper_id}")
async def challenge_spec(paper_id: str):
    if not paper_id:
        return error_response(400, "missing_paper_id", "paper id is required")

    # TODO: Load challenge spec from the database or cached storage.
    return {
        "paper_id": paper_id,
        "title": "Consensus log replication",
        "description": "Implement the core mechanics described in the paper with deterministic tests.",
        "tags": ["distributed-systems", "consensus", "log-replication"],
        "steps": [
            "Read the paper and extract the invariants.",
            "Implement the log replication algorithm.",
            "Write tests that prove safety under partitions.",
        ],
    }


@router.post("/challenges/{paper_id}/template")
async def challenge_template(paper_id: str, request: Request):
    if not paper_id:
        return error_response(400, "missing_paper_id", "paper id is required")

    try:
        payload = await request.json()
    except Exception as exc:
        return error_response(400, "invalid_json", f"{exc}")

    language = (payload.get("language") or "").strip()
    if not language:
        return error_response(400, "missing_language", "language is required")

    # TODO: Call the LLM service to generate language-specific scaffolding.

    template_id = generate_id("tmpl")
    return JSONResponse(
        status_code=202,
        content={
            "template_id": template_id,
            "paper_id": paper_id,
            "language": language,
            "status": "queued",
            "files": ["README.md", f"src/main.{language.lower()}", "tests/spec_test.go"],
            "message": "template generation queued",
        },
    )
