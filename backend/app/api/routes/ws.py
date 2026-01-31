from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.responses import error_response

router = APIRouter()


@router.get("/api/v1/ws/console/{submission_id}")
async def console_placeholder(submission_id: str):
    return error_response(426, "upgrade_required", "websocket upgrade required")


@router.websocket("/api/v1/ws/console/{submission_id}")
async def console_ws(websocket: WebSocket, submission_id: str):
    await websocket.accept()
    try:
        await websocket.send_json({
            "submission_id": submission_id,
            "message": "websocket console not implemented yet",
        })
        await websocket.close(code=1000)
    except WebSocketDisconnect:
        return
