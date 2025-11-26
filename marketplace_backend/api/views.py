from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, Avg
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import (
    SellerProfile,
    Location,
    Category,
    Product,
    ProductImage,
    Review,
    Favorite,
)
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    SellerProfileSerializer,
    SellerProfileCreateSerializer,
    LocationSerializer,
    CategorySerializer,
    ProductSerializer,
    ProductCreateSerializer,
    ProductImageSerializer,
    ReviewSerializer,
    FavoriteSerializer,
    NearbySearchSerializer,
    LoginSerializer,
    JWTTokenSerializer,
    LogoutSerializer,
    MessageSerializer,
    DistanceRequestSerializer,
    DistanceResponseSerializer,
)
from .utils import (
    calculate_distance_km,
    filter_by_radius,
    sort_by_distance,
)


def get_tokens_for_user(user):
    """
    Generate JWT access & refresh tokens for a given user
    """
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# =========================
#  AUTH ENDPOINTS (JWT)
# =========================

@extend_schema(
    summary="Register a new user",
    request=UserRegistrationSerializer,
    responses={
        201: JWTTokenSerializer,
        400: OpenApiResponse(description="Validation error"),
    },
    tags=["auth"],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user and return JWT tokens
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Login user and return JWT tokens",
    request=LoginSerializer,
    responses={
        200: JWTTokenSerializer,
        400: OpenApiResponse(description="Missing credentials"),
        401: OpenApiResponse(description="Invalid credentials"),
    },
    tags=["auth"],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user and return JWT access & refresh tokens.

    NOTE: The request uses `username` field, but frontend may send either:
      - username
      - or email (we try both)
    """
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Please provide both username and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    # also try login with email if username-based auth fails
    if not user:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if user:
        tokens = get_tokens_for_user(user)
        return Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserSerializer(user).data,
            }
        )

    return Response(
        {"error": "Invalid credentials"},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@extend_schema(
    summary="Logout user by blacklisting refresh token",
    request=LogoutSerializer,
    responses={
        200: MessageSerializer,
        400: OpenApiResponse(description="Error while logging out"),
    },
    tags=["auth"],
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user by blacklisting refresh token.
    Client should also delete tokens locally.
    """
    serializer = LogoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    refresh_token = serializer.validated_data["refresh"]

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Successfully logged out"})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =========================
#  SELLER PROFILE
# =========================

class SellerProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for seller profiles
    """
    queryset = SellerProfile.objects.select_related("user", "location").all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["business_name", "description", "location__city"]
    ordering_fields = ["created_at", "rating", "total_sales"]

    def get_serializer_class(self):
        if self.action == "create":
            return SellerProfileCreateSerializer
        return SellerProfileSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """
        Get nearby sellers based on user's location (Haversine, no external API)
        """
        lat = request.query_params.get("latitude")
        lon = request.query_params.get("longitude")
        radius = request.query_params.get("radius", 10)

        if not lat or not lon:
            return Response(
                {"error": "latitude and longitude are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
        except ValueError:
            return Response(
                {"error": "Invalid coordinate values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sellers = self.filter_queryset(self.queryset.filter(location__isnull=False))
        nearby_sellers = filter_by_radius(sellers, lat, lon, radius)
        nearby_sellers = sort_by_distance(nearby_sellers)

        serializer = self.get_serializer(nearby_sellers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """
        Get all products for a specific seller
        """
        seller = self.get_object()
        products = Product.objects.filter(seller=seller, is_active=True)
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        """
        Get all reviews for a specific seller
        """
        seller = self.get_object()
        reviews = Review.objects.filter(seller=seller)
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)


# =========================
#  CATEGORY
# =========================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for product categories
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(product_count=Count("products"))


# =========================
#  PRODUCT
# =========================

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for products with location-based filtering
    """
    queryset = (
        Product.objects.select_related("seller", "seller__location", "category")
        .prefetch_related("images")
        .filter(is_active=True)
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "seller__business_name"]
    ordering_fields = ["price", "created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return ProductCreateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        try:
            seller_profile = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            raise ValidationError({"detail": "You must create a seller profile first."})
        serializer.save(seller=seller_profile)

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        location_text = self.request.query_params.get("location")

        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        if location_text:
            queryset = queryset.filter(seller__location__city__icontains=location_text)

        return queryset

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """
        GET /api/products/nearby/?lat=...&lng=...&radius=10&search=...&location=...

        Used by the main marketplace search page:
        - reads HTML5 geolocation coordinates
        - applies search + location filters
        - returns products sorted by distance
        """
        lat = request.query_params.get("lat") or request.query_params.get("latitude")
        lon = request.query_params.get("lng") or request.query_params.get("longitude")
        radius = request.query_params.get("radius", 10)

        if not lat or not lon:
            return Response(
                {"error": "lat and lng are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
        except ValueError:
            return Response(
                {"error": "Invalid coordinate values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_qs = self.filter_queryset(self.get_queryset())
        products = filter_by_radius(base_qs, lat, lon, radius)
        products = sort_by_distance(products)

        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def search_nearby(self, request):
        """
        Advanced nearby search via POST body (still available if needed)
        """
        serializer = NearbySearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        lat = float(data["latitude"])
        lon = float(data["longitude"])
        radius = data.get("radius", 10)
        category = data.get("category")
        min_price = data.get("min_price")
        max_price = data.get("max_price")
        sort_by = data.get("sort_by", "distance")

        queryset = self.filter_queryset(self.get_queryset())

        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        products = filter_by_radius(queryset, lat, lon, radius)

        if sort_by == "distance":
            products = sort_by_distance(products)
        elif sort_by == "price":
            products = sorted(products, key=lambda x: x.price)
        elif sort_by == "rating":
            products = sorted(products, key=lambda x: x.seller.rating, reverse=True)

        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True, context={"request": request})
        return Response(serializer.data)


# =========================
#  PRODUCT IMAGES
# =========================

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


class ProductImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for product images (gallery uploads)
    """
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        # kusoma picha yoyote ruhusu wote, lakini ku-create / ku-edit ni lazima uwe logged in
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get("product_id")
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def perform_create(self, serializer):
        """
        Tunahakikisha product_id haikai NULL.
        Inachotwa kutoka:
        - form-data:  product  AU  product_id
        - au query param: ?product_id=...
        """
        request = self.request

        product_id = (
            request.data.get("product")
            or request.data.get("product_id")
            or request.query_params.get("product_id")
        )

        if not product_id:
            raise ValidationError({"product": "This field is required."})

        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            raise ValidationError({"product": "Invalid product id."})

        # hapa tunamlazimisha a-save akiwa na product_id sahihi
        serializer.save(product_id=product_id)

# =========================
#  REVIEWS
# =========================

class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for seller reviews
    """
    queryset = Review.objects.select_related("user", "seller").all()
    serializer_class = ReviewSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "rating"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        review = serializer.save(user=self.request.user)

        # Update seller rating
        seller = review.seller
        avg_rating = Review.objects.filter(seller=seller).aggregate(Avg("rating"))[
            "rating__avg"
        ]
        seller.rating = round(avg_rating, 2) if avg_rating else 0
        seller.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        seller_id = self.request.query_params.get("seller_id")
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)
        return queryset


# =========================
#  FAVORITES
# =========================

class FavoriteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user favorites
    """
    queryset = Favorite.objects.select_related("user", "seller").all()
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        """
        Toggle favorite status for a seller
        """
        seller_id = request.data.get("seller_id")
        if not seller_id:
            return Response(
                {"error": "seller_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            seller = SellerProfile.objects.get(id=seller_id)
        except SellerProfile.DoesNotExist:
            return Response(
                {"error": "Seller not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            seller=seller,
        )

        if not created:
            favorite.delete()
            return Response(
                {
                    "message": "Removed from favorites",
                    "is_favorite": False,
                }
            )

        return Response(
            {
                "message": "Added to favorites",
                "is_favorite": True,
                "favorite": FavoriteSerializer(favorite).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================
#  DISTANCE UTILITY (NO MAPBOX)
# =========================

@extend_schema(
    summary="Calculate distance between two points using Haversine",
    request=DistanceRequestSerializer,
    responses={
        200: DistanceResponseSerializer,
        400: OpenApiResponse(description="Bad request or invalid coordinates"),
    },
    tags=["location"],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_distance(request):
    """
    Calculate distance between two points (km + miles) using Haversine formula
    """
    lat1 = request.data.get("latitude1")
    lon1 = request.data.get("longitude1")
    lat2 = request.data.get("latitude2")
    lon2 = request.data.get("longitude2")

    if not all([lat1, lon1, lat2, lon2]):
        return Response(
            {"error": "All coordinate parameters are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        distance = calculate_distance_km(
            float(lat1),
            float(lon1),
            float(lat2),
            float(lon2),
        )
        return Response(
            {
                "distance_km": float(distance),
                "distance_miles": float(distance * Decimal("0.621371")),
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
