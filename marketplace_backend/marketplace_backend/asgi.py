import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_backend.settings")

django_asgi_app = get_asgi_application()

from marketplace_backend.channels_jwt_middleware import JWTAuthMiddleware  # noqa: E402
import api.routing  # noqa: E402


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(
            URLRouter(api.routing.websocket_urlpatterns),
        ),
    }
)
