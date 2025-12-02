# marketplace_backend/channels_jwt_middleware.py

from __future__ import annotations

import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger("channels.jwt")


class JWTAuthMiddleware:
    """
    WebSocket JWT auth kwa kutumia SimpleJWT.

    Hii class ni ASGI middleware ya kawaida:

        application = JWTAuthMiddleware(URLRouter(...))

    Na inaitwa na Channels kama:

        await application(scope, receive, send)

    Client anaweza kutuma token kwa:

    1) Query string:
       ws://host/ws/chat/<conversation_id>/?token=JWT_HAPA

    2) Header:
       Authorization: Bearer JWT_HAPA
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        """
        Hapa ndipo tunapokea scope ya WebSocket, tuna-add user kwenye scope,
        halafu tunapiga inner ASGI app.
        """
        # safeguard ya DB connections (recommended)
        close_old_connections()

        # tufanye copy ya scope ili tusiharibu original reference
        scope = dict(scope)

        # default user ni Anonymous
        scope["user"] = AnonymousUser()

        # ----------------------
        # 1) Soma token
        # ----------------------
        query_string = scope.get("query_string", b"").decode()
        qs = parse_qs(query_string)

        raw_token: str | None = None

        # (a) token kwenye query string
        if "token" in qs and qs["token"]:
            raw_token = qs["token"][0].strip()

        # (b) kama hakuna, jaribu Authorization header
        if not raw_token:
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization")
            if auth_header:
                try:
                    auth_header_str = auth_header.decode()
                    if auth_header_str.lower().startswith("bearer "):
                        raw_token = auth_header_str.split(" ", 1)[1].strip()
                except Exception:  # noqa: BLE001
                    raw_token = None

        # ----------------------
        # 2) Ikiwa tuna token, ithibitishe kwa SimpleJWT
        # ----------------------
        if raw_token:
            jwt_auth = JWTAuthentication()
            try:
                validated_token = jwt_auth.get_validated_token(raw_token)
                user = await sync_to_async(jwt_auth.get_user)(validated_token)
                scope["user"] = user
                logger.debug(
                    "JWTAuthMiddleware: WS authenticated as user id=%s",
                    getattr(user, "id", None),
                )
            except Exception as exc:  # noqa: BLE001
                # Token mbovu / ime-expire / user haipo
                logger.warning(
                    "JWTAuthMiddleware: invalid WebSocket token: %s",
                    exc,
                )

        # ----------------------
        # 3) Endelea na inner ASGI app (URLRouter + ChatConsumer)
        # ----------------------
        inner = self.inner
        return await inner(scope, receive, send)
