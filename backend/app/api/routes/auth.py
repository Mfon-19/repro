from __future__ import annotations

import logging
from typing import Optional

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.services.responses import error_response
from app.services.store import OAuthUser, Store

router = APIRouter()
logger = logging.getLogger("repro")
store = Store()


oauth = OAuth()

def configure_oauth() -> None:
    if not settings.github_client_id or not settings.github_client_secret:
        logger.warning("GitHub OAuth disabled; set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET")
        return

    oauth.register(
        name="github",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )


def sanitize_redirect_path(path: Optional[str]) -> str:
    if not path:
        return "/home"
    if not path.startswith("/") or path.startswith("//"):
        return "/home"
    return path


def _get_primary_email(emails: list[dict]) -> str:
    for entry in emails:
        if entry.get("primary"):
            return entry.get("email", "")
    return emails[0].get("email", "") if emails else ""


@router.get("/auth/{provider}")
async def auth_start(provider: str, request: Request) -> RedirectResponse:
    if provider != "github":
        return error_response(400, "missing_provider", "oauth provider is required")

    redirect_path = sanitize_redirect_path(request.query_params.get("redirect"))
    request.session["redirect_path"] = redirect_path

    if not settings.github_client_id or not settings.github_client_secret:
        return error_response(503, "oauth_unavailable", "oauth not configured")

    return await oauth.github.authorize_redirect(request, settings.github_callback_url)


@router.get("/auth/{provider}/callback")
async def auth_callback(provider: str, request: Request) -> RedirectResponse:
    if provider != "github":
        return error_response(400, "missing_provider", "oauth provider is required")

    try:
        token = await oauth.github.authorize_access_token(request)
    except OAuthError as exc:
        logger.warning("oauth callback failed", extra={"error": str(exc)})
        return RedirectResponse(url=settings.frontend_url + "/home")

    user_response = await oauth.github.get("user", token=token)
    user_data = user_response.json()

    email = user_data.get("email") or ""
    if not email:
        emails_response = await oauth.github.get("user/emails", token=token)
        if emails_response.status_code == 200:
            email = _get_primary_email(emails_response.json())

    oauth_user = OAuthUser(
        provider="github",
        provider_user_id=str(user_data.get("id", "")),
        name=user_data.get("name") or user_data.get("login") or "",
        email=email,
        nickname=user_data.get("login") or "",
        avatar_url=user_data.get("avatar_url") or "",
    )

    user = store.upsert_oauth_user(oauth_user)

    request.session["user_id"] = user.id
    request.session["provider"] = user.provider
    request.session["name"] = user.name
    request.session["email"] = user.email

    redirect_path = sanitize_redirect_path(request.session.pop("redirect_path", "/home"))
    return RedirectResponse(url=settings.frontend_url + redirect_path)
