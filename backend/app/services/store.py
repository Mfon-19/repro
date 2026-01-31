from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class OAuthUser:
    provider: str
    provider_user_id: str
    name: str
    email: str
    nickname: str
    avatar_url: str


@dataclass
class User:
    id: str
    provider: str
    provider_user_id: str
    name: str
    email: str
    nickname: str
    avatar_url: str
    created_at: datetime
    updated_at: datetime


class Store:
    def upsert_oauth_user(self, oauth_user: OAuthUser) -> User:
        now = datetime.now(timezone.utc)
        user_id = f"{oauth_user.provider}:{oauth_user.provider_user_id}" if oauth_user.provider and oauth_user.provider_user_id else "user_unknown"
        return User(
            id=user_id,
            provider=oauth_user.provider,
            provider_user_id=oauth_user.provider_user_id,
            name=oauth_user.name,
            email=oauth_user.email,
            nickname=oauth_user.nickname,
            avatar_url=oauth_user.avatar_url,
            created_at=now,
            updated_at=now,
        )
