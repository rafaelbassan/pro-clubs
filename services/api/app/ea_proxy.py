from __future__ import annotations

import socket
from typing import Optional

from app.config import settings

WARP_SOCKS = "socks5h://warp:1080"


def _warp_reachable() -> bool:
    try:
        socket.getaddrinfo("warp", 1080, type=socket.SOCK_STREAM)
        return True
    except OSError:
        return False


def resolve_ea_proxy_url() -> Optional[str]:
    """Pick how EA traffic exits: explicit env → Cloudflare WARP sidecar → direct."""
    if settings.ea_proxy_base_url.strip():
        return None  # Vercel proxy uses base_url, not HTTP proxy
    explicit = settings.ea_http_proxy.strip()
    if explicit:
        return explicit
    if _warp_reachable():
        return WARP_SOCKS
    return None


def ea_proxy_mode() -> str:
    if settings.ea_proxy_base_url.strip():
        return "vercel"
    if settings.ea_http_proxy.strip():
        return "http_proxy"
    if _warp_reachable():
        return "warp"
    return "direct"
