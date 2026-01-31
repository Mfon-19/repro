from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.routes import auth, session, papers, challenges, submissions, ws
from app.api.routes.auth import configure_oauth

logger = configure_logging()

app = FastAPI(title="Repro API", version="0.1.0")

configure_oauth()

allow_credentials = not settings.allow_all_origins

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie=settings.session_name,
    same_site="lax",
    https_only=settings.public_url.startswith("https://"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type", "Origin", "X-Requested-With"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next: Callable):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception("request failed", extra={"path": request.url.path, "method": request.method})
        return JSONResponse(
            status_code=500,
            content={"error": "internal_server_error", "message": "unexpected server error"},
        )

    duration_ms = int((time.time() - start) * 1000)
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "remote": request.client.host if request.client else "",
            "user_agent": request.headers.get("user-agent", ""),
        },
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, exc: Exception):
    logger.exception("unhandled exception", extra={"error": str(exc)})
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": "unexpected server error"},
    )


app.include_router(auth.router)
app.include_router(session.router)
app.include_router(papers.router)
app.include_router(challenges.router)
app.include_router(submissions.router)
app.include_router(ws.router)
