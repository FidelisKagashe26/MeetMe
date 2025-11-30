# marketplace_backend/asgi.py

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_backend.settings")

# Django ASGI app (HTTP)
django_asgi_app = get_asgi_application()

# Channels JWT middleware + WebSocket routes
from marketplace_backend.channels_jwt_middleware import JWTAuthMiddleware  # noqa: E402
import api.routing  # noqa: E402


application = ProtocolTypeRouter(
    {
        # HTTP requests ziende kama kawaida kwa Django
        "http": django_asgi_app,
        # WebSocket zipelekwe kwa Channels + JWTAuthMiddleware
        "websocket": JWTAuthMiddleware(
            URLRouter(api.routing.websocket_urlpatterns),
        ),
    }
)
