from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List

from dotenv import load_dotenv


def _split_csv(value: str) -> List[str]:
    items = [item.strip() for item in value.split(",") if item.strip()]
    return items


@dataclass(frozen=True)
class Settings:
    addr: str
    public_url: str
    frontend_url: str
    session_name: str
    session_secret: str
    cors_origins: List[str]
    github_client_id: str
    github_client_secret: str
    github_callback_url: str

    @property
    def allow_all_origins(self) -> bool:
        return "*" in self.cors_origins



def load_settings() -> Settings:
    public_url = os.getenv("PUBLIC_URL", "http://localhost:8080").rstrip("/")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    session_name = os.getenv("SESSION_NAME", "repro-auth")
    session_secret = os.getenv("SESSION_SECRET", "dev-insecure-secret")
    cors_origins = _split_csv(os.getenv("CORS_ORIGINS", frontend_url))
    if not cors_origins:
        cors_origins = [frontend_url]

    github_callback_url = os.getenv("GITHUB_CALLBACK_URL", f"{public_url}/auth/github/callback")

    return Settings(
        addr=os.getenv("ADDR", "0.0.0.0:8080"),
        public_url=public_url,
        frontend_url=frontend_url,
        session_name=session_name,
        session_secret=session_secret,
        cors_origins=cors_origins,
        github_client_id=os.getenv("GITHUB_CLIENT_ID", ""),
        github_client_secret=os.getenv("GITHUB_CLIENT_SECRET", ""),
        github_callback_url=github_callback_url,
    )


load_dotenv()
settings = load_settings()
