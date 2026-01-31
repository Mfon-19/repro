from __future__ import annotations

from fastapi.responses import JSONResponse


def error_response(status_code: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "message": message})
