from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1")


@router.get("/session")
async def session_status(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user": {
            "id": user_id,
            "name": request.session.get("name", ""),
            "email": request.session.get("email", ""),
            "provider": request.session.get("provider", ""),
        },
    }
