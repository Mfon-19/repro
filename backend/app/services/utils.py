from __future__ import annotations

import secrets


def generate_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(16)}"
