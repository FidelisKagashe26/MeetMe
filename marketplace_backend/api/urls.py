from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from . import views

# ============================
#  DRF ROUTER
# ============================

router = DefaultRouter()

# MAIN ENTITIES
router.register(r"sellers", views.SellerProfileViewSet, basename="seller")
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"products", views.ProductViewSet, basename="product")
router.register(r"product-images", views.ProductImageViewSet, basename="productimage")
router.register(r"reviews", views.ReviewViewSet, basename="review")
router.register(r"favorites", views.FavoriteViewSet, basename="favorite")

# LIKES
router.register(r"product-likes", views.ProductLikeViewSet, basename="product-like")

# ORDERS
router.register(r"orders", views.OrderViewSet, basename="order")

# CHAT / MESSAGES
router.register(r"conversations", views.ConversationViewSet, basename="conversation")
router.register(r"messages", views.MessageViewSet, basename="message")

# NOTIFICATIONS
router.register(r"notifications", views.NotificationViewSet, basename="notification")


urlpatterns = [
    # ======================
    #  AUTH ENDPOINTS (CUSTOM JWT)
    # ======================
    path("auth/register/", views.register_user, name="register"),
    path("auth/login/", views.login_user, name="login"),
    path("auth/logout/", views.logout_user, name="logout"),

    # current user info + settings + change password
    path("auth/me/", views.me, name="auth-me"),
    path("auth/change-password/", views.change_password, name="auth-change-password"),
    path("auth/settings/", views.update_user_settings, name="auth-settings"),

    # ======================
    #  SIMPLEJWT DEFAULT ENDPOINTS (OPTIONAL)
    # ======================
    path("auth/jwt/create/", TokenObtainPairView.as_view(), name="jwt-obtain-pair"),
    path("auth/jwt/refresh/", TokenRefreshView.as_view(), name="jwt-refresh"),
    path("auth/jwt/verify/", TokenVerifyView.as_view(), name="jwt-verify"),

    # ======================
    #  LOCATION / DISTANCE UTILITY
    # ======================
    path("location/distance/", views.calculate_distance, name="calculate-distance"),

    # ======================
    #  ROUTER URLS (VIEWSETS)
    # ======================
    path("", include(router.urls)),
]
