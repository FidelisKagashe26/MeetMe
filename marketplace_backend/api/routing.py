# api/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://127.0.0.1:8000/ws/chat/8/?token=<JWT>
    re_path(r"^ws/chat/(?P<conversation_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
]
