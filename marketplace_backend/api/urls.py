from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sellers', views.SellerProfileViewSet, basename='seller')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'product-images', views.ProductImageViewSet, basename='productimage')
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'favorites', views.FavoriteViewSet, basename='favorite')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),

    # Mapbox utility endpoints
    path('mapbox/geocode/', views.geocode_address, name='geocode'),
    path('mapbox/reverse-geocode/', views.reverse_geocode, name='reverse-geocode'),
    path('mapbox/distance/', views.calculate_distance, name='calculate-distance'),

    # Router URLs
    path('', include(router.urls)),
]
