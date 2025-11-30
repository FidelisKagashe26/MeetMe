# marketplace_backend/channels_jwt_middleware.py

from __future__ import annotations

import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger("channels.jwt")


class JWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket JWT auth kwa kutumia SimpleJWT yetu ya DRF.

    Client anaweza kutuma token kupitia njia mbili:

    1) Query string:
       ws://host/ws/chat/<conversation_id>/?token=JWT_HAPA

    2) Header:
       Authorization: Bearer JWT_HAPA

    Kama token ni sahihi => scope["user"] itakuwa user halisi.
    Kama token ni mbovu / ime-expire => scope["user"] inabaki AnonymousUser.
    """

    async def __call__(self, scope, receive, send):
        # Safeguard ya DB connections (recommended na Django + Channels)
        close_old_connections()

        # default: user asiyejulikana
        scope["user"] = AnonymousUser()

        query_string = scope.get("query_string", b"").decode()
        qs = parse_qs(query_string)

        raw_token: str | None = None

        # 1) Token kupitia query string (?token=...)
        if "token" in qs and qs["token"]:
            raw_token = qs["token"][0].strip()

        # 2) Kama hakuna token kwenye query, jaribu headers (Authorization: Bearer x)
        if not raw_token:
            headers = scope.get("headers", [])
            for name, value in headers:
                # header name ni bytes, mfano: b"authorization"
                if name.lower() == b"authorization":
                    try:
                        auth_header = value.decode()
                    except Exception:  # noqa: BLE001
                        auth_header = ""
                    if auth_header.lower().startswith("bearer "):
                        raw_token = auth_header.split(" ", 1)[1].strip()
                    break

        # 3) Kama tuna token, ithibitishe kwa SimpleJWT
        if raw_token:
            jwt_auth = JWTAuthentication()
            try:
                validated_token = jwt_auth.get_validated_token(raw_token)
                user = await sync_to_async(jwt_auth.get_user)(validated_token)
                scope["user"] = user
                logger.debug(
                    "JWTAuthMiddleware: WebSocket authenticated as user id=%s",
                    getattr(user, "id", None),
                )
            except Exception as exc:  # noqa: BLE001
                # Token mbovu / ime-expire / user haipo
                logger.warning(
                    "JWTAuthMiddleware: invalid WebSocket token: %s",
                    exc,
                )

        # endelea na middleware chain / consumer
        return await super().__call__(scope, receive, send)
