from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Count, Avg, Q
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import (
    UserProfile,
    SellerProfile,
    Location,
    Category,
    Product,
    ProductImage,
    ProductLike,
    Review,
    Favorite,
    Order,
    Conversation,
    Message,
    Notification,
)
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
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
    SimpleMessageSerializer,
    DistanceRequestSerializer,
    DistanceResponseSerializer,
    ProductLikeSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ConversationSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    NotificationSerializer,
    ChangePasswordSerializer,
    UserSettingsUpdateSerializer,
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
        200: SimpleMessageSerializer,
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
#  CURRENT USER PROFILE & SETTINGS
# =========================

@extend_schema(
    summary="Get or update current user profile",
    request=UserSettingsUpdateSerializer,
    responses={200: UserSerializer},
    tags=["auth"],
)
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    GET: return current user profile
    PUT/PATCH: update basic fields (first_name, last_name, preferred_language, theme)
    """
    user = request.user

    if request.method in ["PUT", "PATCH"]:
        serializer = UserSettingsUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # update User basic info
        if "first_name" in data:
            user.first_name = data["first_name"]
        if "last_name" in data:
            user.last_name = data["last_name"]
        user.save()

        # update profile info
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if "preferred_language" in data:
            profile.preferred_language = data["preferred_language"]
        if "theme" in data:
            profile.theme = data["theme"]
        profile.save()

        return Response(UserSerializer(user).data)

    # GET
    return Response(UserSerializer(user).data)


@extend_schema(
    summary="Change password for current user",
    request=ChangePasswordSerializer,
    responses={200: SimpleMessageSerializer},
    tags=["auth"],
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change password for logged-in user
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={"request": request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    # thibitisha old_password
    old_password = serializer.validated_data["old_password"]
    if not user.check_password(old_password):
        return Response(
            {"old_password": ["Old password is incorrect."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save()
    return Response({"message": "Password changed successfully"})


@extend_schema(
    summary="Get or update user settings (profile + preferences)",
    request=UserSettingsUpdateSerializer,
    responses={200: UserProfileSerializer},
    tags=["auth"],
)
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_user_settings(request):
    """
    Manage user settings:
    - first_name, last_name
    - preferred_language: 'en' / 'sw'
    - theme: 'light' / 'dark' / 'system'
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method in ["PUT", "PATCH"]:
        serializer = UserSettingsUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        if "first_name" in data:
            request.user.first_name = data["first_name"]
        if "last_name" in data:
            request.user.last_name = data["last_name"]
        request.user.save()

        if "preferred_language" in data:
            profile.preferred_language = data["preferred_language"]
        if "theme" in data:
            profile.theme = data["theme"]
        profile.save()

    out = UserProfileSerializer(profile)
    return Response(out.data)


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
    def me(self, request):
        """
        Get seller profile for current user (if exists)
        """
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            seller = request.user.seller_profile
            serializer = SellerProfileSerializer(seller)
            return Response(serializer.data)
        except SellerProfile.DoesNotExist:
            return Response(
                {"detail": "Seller profile not found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """
        Get nearby sellers based on user's location (Haversine)
        """
        lat = request.query_params.get("latitude")
        lon = request.query_params.get("longitude")
        radius = request.query_params.get("radius", 10)
        limit_param = request.query_params.get("limit")

        if not lat or not lon:
            return Response(
                {"error": "latitude and longitude are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
            limit = int(limit_param) if limit_param is not None else 10
        except ValueError:
            return Response(
                {"error": "Invalid numeric values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if limit > 15:
            limit = 15

        sellers = self.filter_queryset(self.queryset.filter(location__isnull=False))
        nearby_sellers = filter_by_radius(sellers, lat, lon, radius)
        nearby_sellers = sort_by_distance(nearby_sellers)[:limit]

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
        .prefetch_related("images", "likes")
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
        if self.action in ["create", "update", "partial_update", "destroy", "mine"]:
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
        GET /api/products/nearby/?lat=...&lng=...&radius=10&location=...&limit=10
        """
        lat = request.query_params.get("lat") or request.query_params.get("latitude")
        lon = request.query_params.get("lng") or request.query_params.get("longitude")
        radius = request.query_params.get("radius", 10)
        limit_param = request.query_params.get("limit")

        if not lat or not lon:
            return Response(
                {"error": "lat and lng are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
            radius = float(radius)
            limit = int(limit_param) if limit_param is not None else 10
        except ValueError:
            return Response(
                {"error": "Invalid numeric values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if limit > 15:
            limit = 15

        base_qs = self.filter_queryset(self.get_queryset())
        products = filter_by_radius(base_qs, lat, lon, radius)
        products = sort_by_distance(products)[:limit]

        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def search_nearby(self, request):
        """
        Advanced nearby search via POST body
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

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """
        Products za muuzaji aliye login (seller dashboard)
        """
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = self.get_queryset().filter(seller=seller_profile)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# =========================
#  PRODUCT IMAGES
# =========================

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
#  FAVORITES (SELLERS)
# =========================

class FavoriteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user favorites (sellers)
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
#  PRODUCT LIKES
# =========================

class ProductLikeViewSet(viewsets.ModelViewSet):
    """
    Likes kwa kila product (user mmoja a-like mara moja)
    """
    queryset = ProductLike.objects.select_related("user", "product", "product__seller")
    serializer_class = ProductLikeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data.get("product")

        like, created = ProductLike.objects.get_or_create(
            user=user,
            product=product,
        )
        if not created:
            raise ValidationError({"detail": "You already liked this product."})

        serializer.instance = like

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        """
        Toggle like/unlike for a product
        """
        product_id = request.data.get("product_id")
        if not product_id:
            return Response(
                {"error": "product_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        like, created = ProductLike.objects.get_or_create(
            user=request.user,
            product=product,
        )

        if not created:
            like.delete()
            return Response({"liked": False, "message": "Like removed"})

        return Response({"liked": True, "message": "Product liked"})


# =========================
#  ORDERS
# =========================

class OrderViewSet(viewsets.ModelViewSet):
    """
    Orders kati ya mnunuaji (buyer) na muuzaji (seller)
    """
    queryset = Order.objects.select_related(
        "buyer",
        "seller",
        "product",
        "product__seller",
    )
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "updated_at"]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset

        seller_profile = getattr(user, "seller_profile", None)
        if seller_profile:
            qs = qs.filter(
                Q(buyer=user) | Q(seller=seller_profile)
            ).distinct()
        else:
            qs = qs.filter(buyer=user)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def perform_create(self, serializer):
        """
        - set buyer, seller, unit_price, total_price
        - tengeneza notification kwa buyer na seller
        """
        user = self.request.user
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]

        unit_price = product.price
        total_price = unit_price * quantity

        order = serializer.save(
            buyer=user,
            seller=product.seller,
            unit_price=unit_price,
            total_price=total_price,
        )

        # update total_sales
        SellerProfile.objects.filter(pk=product.seller.pk).update(
            total_sales=models.F("total_sales") + 1
        )

        # notifications
        Notification.objects.create(
            user=product.seller.user,
            notif_type="order_new",
            title="New order received",
            body=f"{user.username} ordered {quantity} x {product.name}.",
            data={"order_id": order.id, "product_id": product.id},
        )

        Notification.objects.create(
            user=user,
            notif_type="order_created",
            title="Order created",
            body=f"Your order for {product.name} has been created.",
            data={"order_id": order.id, "product_id": product.id},
        )

    @action(detail=False, methods=["get"])
    def as_buyer(self, request):
        """
        Orders ambazo mimi ni buyer
        """
        qs = self.queryset.filter(buyer=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = OrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = OrderSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def as_seller(self, request):
        """
        Orders ambazo mimi ni seller
        """
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = self.queryset.filter(seller=seller_profile)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = OrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = OrderSerializer(qs, many=True)
        return Response(serializer.data)


# =========================
#  CHAT: CONVERSATIONS & MESSAGES
# =========================

class ConversationViewSet(viewsets.ModelViewSet):
    """
    Conversation kati ya buyer na seller
    """
    queryset = Conversation.objects.select_related(
        "buyer",
        "seller",
        "seller__user",
        "product",
    )
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["updated_at", "created_at"]

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(buyer=user) | Q(seller__user=user)
        ).distinct()

    def perform_create(self, serializer):
        buyer = self.request.user
        seller = serializer.validated_data.get("seller")

        if seller.user_id == buyer.id:
            raise ValidationError(
                {"detail": "You cannot start a conversation with yourself."}
            )

        serializer.save(buyer=buyer)


class MessageViewSet(viewsets.ModelViewSet):
    """
    Chat messages ndani ya conversation
    """
    queryset = Message.objects.select_related(
        "conversation",
        "conversation__buyer",
        "conversation__seller",
        "conversation__seller__user",
        "sender",
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ["created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(conversation__buyer=user) | Q(conversation__seller__user=user)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        conversation = serializer.validated_data.get("conversation")

        if not (
            conversation.buyer_id == user.id
            or conversation.seller.user_id == user.id
        ):
            raise ValidationError(
                {"detail": "You are not part of this conversation."}
            )

        msg = serializer.save(sender=user)

        # update last_message_at
        Conversation.objects.filter(pk=conversation.pk).update(
            last_message_at=msg.created_at
        )

        # notifications
        if user.id == conversation.buyer_id:
            target_user = conversation.seller.user
        else:
            target_user = conversation.buyer

        Notification.objects.create(
            user=target_user,
            notif_type="chat_message",
            title="New message",
            body=msg.text[:120],
            data={
                "conversation_id": conversation.id,
                "message_id": msg.id,
            },
        )


# =========================
#  NOTIFICATIONS
# =========================

class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notifications kwa user (orders, chat, n.k.)
    """
    queryset = Notification.objects.select_related("user")
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ["-created_at"]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """
        Tandika notifications zote kama zimesomwa
        """
        count = self.get_queryset().update(is_read=True)
        return Response({"updated": count})


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
