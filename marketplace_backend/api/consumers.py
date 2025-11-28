# api/consumers.py

from __future__ import annotations

import logging
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

from .models import Conversation, ConversationParticipantState

User = get_user_model()
logger = logging.getLogger("channels.chat")


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer kwa mazungumzo ya 1-to-1 (buyer <-> seller).

    URL format (mustahakika na routing yako):
      ws://<host>/ws/chat/<conversation_id>/?token=<JWT_ACCESS_TOKEN>

    Mambo muhimu:
    - JWTAuthMiddleware tayari inaweka scope["user"].
    - connect():
        * Inathibitisha kuwa user si Anonymous.
        * Inakagua kama user ni participant (buyer au seller.user) wa
          Conversation hiyo.
        * Ikiwa OK, ina-join group 'chat_<conversation_id>' na
          kumark messages kama seen kwa huyo user.
    - receive_json():
        * Inapokea events za "typing":
          { "type": "typing", "is_typing": true/false }
        * (Baadaye tunaweza kuongeza aina zingine kama "read_receipt" n.k.)
    - chat_message():
        * Inaitwa na DRF MessageViewSet kupitia channel_layer.group_send()
          na kutuma message mpya kwa clients wote waliopo kwenye group.
    - typing_event():
        * Inatumiwa kwa participant mwingine kuonyesha "is typing..." live.
    """

    # --------------------------
    #  CONNECT / DISCONNECT
    # --------------------------

    async def connect(self) -> None:
        user = self.scope.get("user")
        kwargs = self.scope.get("url_route", {}).get("kwargs", {})
        conversation_id = kwargs.get("conversation_id")

        # Lazima awe logged in
        if not user or user.is_anonymous:
            logger.info("ChatConsumer.connect: anonymous user rejected")
            await self.close(code=4401)  # Unauthorized
            return

        # conversation_id lazima iwe namba sahihi
        try:
            self.conversation_id: int = int(conversation_id)
        except (TypeError, ValueError):
            logger.info(
                "ChatConsumer.connect: invalid conversation_id=%r",
                conversation_id,
            )
            await self.close(code=4400)  # Bad request
            return

        # Je, huyu user kweli yupo kwenye hiyo conversation?
        is_participant = await self._user_in_conversation(user.id, self.conversation_id)
        if not is_participant:
            logger.info(
                "ChatConsumer.connect: user %s not in conversation %s",
                user.id,
                self.conversation_id,
            )
            await self.close(code=4403)  # Forbidden
            return

        self.room_group_name = f"chat_{self.conversation_id}"

        # Join group ya conversation
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        # Accept WebSocket connection
        await self.accept()

        # Mark all as seen kwa huyu user (anapoingia kwenye chat)
        await self._mark_seen(user.id)

        # (Optional) tuma event ya "connected" kwa frontend, useful kwa debug
        await self.send_json(
            {
                "type": "connection",
                "conversation_id": self.conversation_id,
                "user_id": user.id,
            }
        )

        logger.debug(
            "ChatConsumer.connect: user %s joined room %s",
            user.id,
            self.room_group_name,
        )

    async def disconnect(self, close_code: int) -> None:
        """
        Kuondoka kwenye group na kuset is_typing=False kwa user huyu.
        """
        user = self.scope.get("user")

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

        if user and not user.is_anonymous:
            # uki-disconnect, sema ha-type tena
            await self._set_typing(user.id, False)

        logger.debug(
            "ChatConsumer.disconnect: user=%s conversation=%s code=%s",
            getattr(user, "id", None),
            getattr(self, "conversation_id", None),
            close_code,
        )

    # --------------------------
    #  HELPER DB METHODS
    # --------------------------

    @database_sync_to_async
    def _user_in_conversation(self, user_id: int, conversation_id: int) -> bool:
        """
        Rudisha True kama user ni buyer au seller.user wa conversation hii.
        """
        return Conversation.objects.filter(
            id=conversation_id,
        ).filter(
            models.Q(buyer_id=user_id) | models.Q(seller__user_id=user_id)
        ).exists()

    @database_sync_to_async
    def _mark_seen(self, user_id: int) -> None:
        """
        Update ConversationParticipantState: last_seen_at & last_read_at
        mara tu user anapoingia kwenye chat.
        """
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            user = User.objects.get(id=user_id)
        except (Conversation.DoesNotExist, User.DoesNotExist):
            return

        ConversationParticipantState.objects.update_or_create(
            conversation=conv,
            user=user,
            defaults={
                "last_seen_at": timezone.now(),
                "last_read_at": timezone.now(),
                "is_typing": False,
            },
        )

    @database_sync_to_async
    def _set_typing(self, user_id: int, is_typing: bool) -> None:
        """
        Set is_typing kwa user huyu kwenye conversation husika.
        """
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            user = User.objects.get(id=user_id)
        except (Conversation.DoesNotExist, User.DoesNotExist):
            return

        ConversationParticipantState.objects.update_or_create(
            conversation=conv,
            user=user,
            defaults={
                "is_typing": is_typing,
                "last_typing_at": timezone.now(),
            },
        )

    # --------------------------
    #  RECEIVE FROM CLIENT
    # --------------------------

    async def receive_json(self, content: dict[str, Any], **kwargs: Any) -> None:
        """
        Tunatarajia messages aina:

        - Typing indicator:
          { "type": "typing", "is_typing": true/false }

        - Ping (optional, kwa debug):
          { "type": "ping" }

        Kwa sasa, message halisi za chat zinatumwa kupitia REST
        (MessageViewSet), kisha zinakuja hapa kupitia group_send().
        """
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            # sio lazima tufunge, lakini hatufanyi kazi yoyote
            return

        event_type = content.get("type")

        # --- typing indicator ---
        if event_type == "typing":
            is_typing = bool(content.get("is_typing", True))

            # weka state kwenye DB
            await self._set_typing(user.id, is_typing)

            # watumie participant mwingine info kwamba huyu ana-type
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing.event",  # => method name: typing_event
                    "user_id": user.id,
                    "is_typing": is_typing,
                },
            )
            return

        # --- ping/pong kwa test ---
        if event_type == "ping":
            await self.send_json({"type": "pong"})
            return

        # future: unaweza ku-handle aina zingine hapa (e.g., "read_receipt")

    # --------------------------
    #  EVENTS FROM BACKEND (group_send)
    # --------------------------

    async def chat_message(self, event: dict[str, Any]) -> None:
        """
        Hii inaitwa na DRF MessageViewSet kupitia:

          channel_layer.group_send(
              f"chat_{message.conversation_id}",
              {
                  "type": "chat.message",
                  "message": <MessageSerializer data>,
              },
          )

        Tunamtumia client payload ya message mpya.
        """
        payload = event.get("message")
        await self.send_json(
            {
                "type": "message",
                "payload": payload,
            }
        )

    async def typing_event(self, event: dict[str, Any]) -> None:
        """
        Event ya typing kwa upande mwingine (other participant).
        Inatumwa na receive_json() ya juu kwa group_send na type="typing.event".
        """
        await self.send_json(
            {
                "type": "typing",
                "user_id": event.get("user_id"),
                "is_typing": event.get("is_typing", False),
            }
        )
