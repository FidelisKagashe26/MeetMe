# api/consumers.py

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

from .models import Conversation, ConversationParticipantState

User = get_user_model()
logger = logging.getLogger("chat.ws")


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer kwa mazungumzo ya 1-to-1 (buyer <-> seller).

    URL (frontend):
      ws://<host>/ws/chat/<conversation_id>/?token=<JWT_ACCESS_TOKEN>

    - JWTAuthMiddleware tayari inaweka scope["user"] (au AnonymousUser).
    - Hapa tunahakikisha:
        * User lazima awe authenticated.
        * User lazima awe buyer AU seller.user wa Conversation hiyo.
        * Kila conversation ina group yake: "chat_<conversation_id>".
        * Messages zinapigwa kwa group hii tu, kwa hiyo washiriki wengine
          hawapati chochote hata kama wana JWT halali.
    """

    async def connect(self) -> None:
        """
        Handshake ya WebSocket.
        """
        user = self.scope.get("user")
        kwargs = self.scope.get("url_route", {}).get("kwargs", {})
        conversation_id_raw = kwargs.get("conversation_id")

        # 1) Hakikisha user si anonymous
        if not user or getattr(user, "is_anonymous", True):
            logger.info("ChatConsumer.connect: anonymous user rejected")
            await self.close(code=4401)  # Unauthorized
            return

        # 2) Hakikisha conversation_id ni integer sahihi
        try:
            self.conversation_id: int = int(conversation_id_raw)
        except (TypeError, ValueError):
            logger.info(
                "ChatConsumer.connect: invalid conversation_id=%r",
                conversation_id_raw,
            )
            await self.close(code=4400)  # Bad request
            return

        # 3) Hakikisha user ni participant (buyer au seller.user)
        is_participant = await self._user_in_conversation(user.id, self.conversation_id)
        if not is_participant:
            logger.info(
                "ChatConsumer.connect: user %s NOT in conversation %s",
                user.id,
                self.conversation_id,
            )
            await self.close(code=4403)  # Forbidden
            return

        # 4) Jiunge na group ya conversation hii pekee
        self.room_group_name = f"chat_{self.conversation_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        # 5) Accept WebSocket
        await self.accept()

        # 6) Mark messages zote kama "seen" kwa user huyu anapoingia
        await self._mark_seen(user.id, self.conversation_id)

        # 7) (Optional) tuma small debug event
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
        Kuondoka kwenye group + kuset is_typing=False kwa huyo user.
        """
        user = self.scope.get("user")

        # Ondoka kwenye group kama tumesha-join
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

        # Ukijua user ni halali na conversation_id ipo, sema ha-type tena
        if user and not getattr(user, "is_anonymous", True):
            conversation_id: Optional[int] = getattr(self, "conversation_id", None)
            if conversation_id is not None:
                await self._set_typing(user.id, conversation_id, False)

        logger.debug(
            "ChatConsumer.disconnect: user=%s conversation=%s code=%s",
            getattr(user, "id", None),
            getattr(self, "conversation_id", None),
            close_code,
        )

    # ------------------------------------------------------------------
    #  RECEIVE FROM CLIENT
    # ------------------------------------------------------------------

    async def receive_json(self, content: Dict[str, Any], **kwargs: Any) -> None:
        """
        Messages zinazotumwa kutoka frontend kupitia WebSocket.

        Tunategemea formats zifuatazo:
          - Ping:
              { "type": "ping" }

          - Typing indicator:
              { "type": "typing", "is_typing": true/false }

        NB: Message halisi za chat zinatumwa kupitia REST (POST /api/messages/),
        kisha DRF inatumia channel_layer.group_send(...) kuzi-push hapa.
        """
        user = self.scope.get("user")
        if not user or getattr(user, "is_anonymous", True):
            # kama user si halali, hatufanyi kitu chochote
            return

        event_type = content.get("type")

        # --- ping/pong kwa test ---
        if event_type == "ping":
            await self.send_json({"type": "pong"})
            return

        # --- typing over WebSocket ---
        if event_type == "typing":
            is_typing = bool(content.get("is_typing", True))

            conversation_id: Optional[int] = getattr(self, "conversation_id", None)
            if conversation_id is None:
                return

            # weka state kwenye DB
            await self._set_typing(user.id, conversation_id, is_typing)

            # toa snapshot ndogo ya state hii ili frontend ipate live update
            state = await self._get_participant_state(user.id, conversation_id)
            if state is not None:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "conversation.typing",  # -> method: conversation_typing()
                        "state": state,
                    },
                )
            return

        # future: unaweza kuongeza aina zingine kama "read_receipt" etc.

    # ------------------------------------------------------------------
    #  EVENTS FROM BACKEND (DRF -> group_send)
    # ------------------------------------------------------------------

    async def chat_message(self, event: Dict[str, Any]) -> None:
        """
        Hii inaitwa na DRF MessageViewSet kupitia:

          channel_layer.group_send(
              f"chat_{conversation.id}",
              {
                  "type": "chat.message",
                  "message": <MessageSerializer data>,
              },
          )

        Tunaipeleka kwa client kama:

          {
            "type": "message.created",
            "message": { ...full MessageSerializer data... }
          }
        """
        payload = event.get("message")

        await self.send_json(
            {
                "type": "message.created",
                "message": payload,
            }
        )

    async def conversation_typing(self, event: Dict[str, Any]) -> None:
        """
        Event ya typing kwa upande mwingine.

        Inapokelewa kutoka group_send yenye:

          {
            "type": "conversation.typing",
            "state": { ... }
          }

        Hapa tunai-pass kama ilivyo kwa frontend.
        """
        state = event.get("state")
        if state is None:
            return

        await self.send_json(
            {
                "type": "conversation.typing",
                "state": state,
            }
        )

    # ------------------------------------------------------------------
    #  HELPER METHODS (DB) — zinatekelezwa kwenye thread ya DB
    # ------------------------------------------------------------------

    @database_sync_to_async
    def _user_in_conversation(self, user_id: int, conversation_id: int) -> bool:
        """
        Rudisha True kama user ni buyer AU seller.user wa conversation hii.
        """
        return Conversation.objects.filter(
            id=conversation_id,
        ).filter(
            models.Q(buyer_id=user_id) | models.Q(seller__user_id=user_id)
        ).exists()

    @database_sync_to_async
    def _mark_seen(self, user_id: int, conversation_id: int) -> None:
        """
        Mark conversation kama 'imeonekana' na user huyu:
          - last_seen_at
          - last_read_at
          - is_typing=False
        """
        try:
            conv = Conversation.objects.get(id=conversation_id)
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
    def _set_typing(self, user_id: int, conversation_id: int, is_typing: bool) -> None:
        """
        Weka is_typing kwa user huyu kwenye conversation.
        """
        try:
            conv = Conversation.objects.get(id=conversation_id)
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

    @database_sync_to_async
    def _get_participant_state(
        self,
        user_id: int,
        conversation_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Rudisha snapshot ndogo ya ConversationParticipantState ili
        itumwe moja kwa moja kwa frontend kama JSON.
        """
        try:
            state = ConversationParticipantState.objects.get(
                conversation_id=conversation_id,
                user_id=user_id,
            )
        except ConversationParticipantState.DoesNotExist:
            return None

        return {
            "id": state.id,
            "conversation": state.conversation_id,
            "user_id": state.user_id,
            "is_typing": state.is_typing,
            "last_typing_at": state.last_typing_at.isoformat()
            if state.last_typing_at
            else None,
            "last_seen_at": state.last_seen_at.isoformat()
            if state.last_seen_at
            else None,
            "last_read_at": state.last_read_at.isoformat()
            if state.last_read_at
            else None,
        }
