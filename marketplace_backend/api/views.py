from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Count, Q
from django.utils import timezone

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

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
    ConversationParticipantState,
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
    ProductLikeToggleSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ConversationSerializer,
    ConversationDetailSerializer,
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
    add_distance_to_queryset,
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
                "user": UserSerializer(user, context={"request": request}).data,
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
                "user": UserSerializer(user, context={"request": request}).data,
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

        return Response(UserSerializer(user, context={"request": request}).data)

    # GET
    return Response(UserSerializer(user, context={"request": request}).data)


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

    out = UserProfileSerializer(profile, context={"request": request})
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

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == "create":
            return SellerProfileCreateSerializer
        return SellerProfileSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "me"]:
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
            serializer = SellerProfileSerializer(seller, context={"request": request})
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

        - Hakuna tena LIMIT ya idadi ya maduka.
        - Kama `radius` imepelekwa → tunatumia filter_by_radius (km).
        - Kama `radius` haijapelekwa → tunapanga tu kwa distance bila kufilisha.
        - Pagination hatutumii hapa, tunarudisha list yote kwa frontend.
        """
        lat = request.query_params.get("latitude") or request.query_params.get("lat")
        lon = request.query_params.get("longitude") or request.query_params.get("lng")
        radius_param = request.query_params.get("radius")

        if not lat or not lon:
            return Response(
                {"error": "latitude/lat and longitude/lng are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            return Response(
                {"error": "Invalid coordinate values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # sellers wenye location tu
        sellers_qs = self.filter_queryset(
            self.queryset.filter(location__isnull=False)
        )

        # Kama radius ipo → tutumie radius
        if radius_param is not None:
            try:
                radius = float(radius_param)
            except ValueError:
                return Response(
                    {"error": "Invalid radius value"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if radius <= 0:
                radius = 10.0

            sellers = filter_by_radius(sellers_qs, lat, lon, radius)
        else:
            # Hakuna radius → pangilia wote kwa distance tu
            sellers = add_distance_to_queryset(sellers_qs, lat, lon)

        # panga karibu → mbali
        sellers = sort_by_distance(sellers)

        serializer = self.get_serializer(
            sellers,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """
        Get all products for a specific seller
        """
        seller = self.get_object()
        products = Product.objects.filter(seller=seller, is_active=True).select_related(
            "seller",
            "seller__location",
            "category",
        ).prefetch_related("images", "likes")
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        """
        Get all reviews for a specific seller
        """
        seller = self.get_object()
        reviews = Review.objects.filter(seller=seller)
        serializer = ReviewSerializer(reviews, many=True, context={"request": request})
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
    ViewSet for products with location-based SORTING ONLY.

    MUHIMU:
    - /api/products/ daima inarudisha ARRAY ya products (hakuna pagination ya backend).
    - Ukipeleka lat & lng → tunahesabu distance kwa kila product na KUPANGA
      kwa ukaribu (distance asc) bila kuweka limit ya radius.
    - `location` (mji/mkoa) inatumika kama filter ya city, isipokuwa kama
      imekuja kama "Current location" n.k. kutoka frontend – hiyo tuna-ignore
      kama filter ili isilete EMPTY results.
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
        # Ku-create/kubadilisha bidhaa ni lazima uwe logged in,
        # lakini ku-list, ku-view detail, na nearby viko wazi kwa wote.
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
        """
        Filters za msingi (category, price, location ya mji).

        KUMBUKA:
        - SearchFilter bado inafanya kazi kupitia ?search=...
        - Hapa hatugusi lat/lng; hizo zinashughulikiwa kwenye list() na nearby().
        """
        queryset = super().get_queryset()
        request = self.request

        category = request.query_params.get("category")
        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        location_text = request.query_params.get("location")

        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Location ya mji (mf. "Dodoma", "Mwanza")
        # Lakini tukiona "Current location", "My location" n.k. hatuiweke kama filter
        if location_text:
            normalized = location_text.strip().lower()
            if normalized not in (
                "current location",
                "my location",
                "current_location",
                "my_location",
            ):
                queryset = queryset.filter(
                    seller__location__city__icontains=location_text
                )

        return queryset

    def list(self, request, *args, **kwargs):
        """
        /api/products/

        - Inatumia filters za kawaida (search, category, price, location ya mji).
        - Kama lat & lng zimetumwa → ina-add distance_km kwa kila product,
          inapanga kwa distance ASC bila ku-cut off kwa radius.
        - Inarudisha ARRAY tu, hakuna pagination ya backend.
        """
        # apply SearchFilter, OrderingFilter, na get_queryset filters
        base_qs = self.filter_queryset(self.get_queryset())

        lat = request.query_params.get("lat") or request.query_params.get("latitude")
        lon = request.query_params.get("lng") or request.query_params.get("longitude")

        items = list(base_qs)

        if lat and lon:
            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except ValueError:
                lat_f = None
                lon_f = None

            if lat_f is not None and lon_f is not None:
                # ongeza distance kwa kila product na upange kwa ukaribu
                items = add_distance_to_queryset(items, lat_f, lon_f)
                items = sort_by_distance(items)

        serializer = self.get_serializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
    )
    def nearby(self, request):
        """
        GET /api/products/nearby/?lat=...&lng=...

        - User yeyote (guest au logged-in) anaweza kutumia.
        - LENGO: kupanga bidhaa zote kwa ukaribu na location ya user,
          bila kuweka radius limit wala limit ya idadi ya products.
        - Radius & limit tukizipokea tunaziacha tu (for future), lakini
          hatuzitumii kufilter – frontend ina-deal na pagination.
        """
        lat = request.query_params.get("lat") or request.query_params.get("latitude")
        lon = request.query_params.get("lng") or request.query_params.get("longitude")

        if not lat or not lon:
            return Response(
                {"error": "lat and lng are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except ValueError:
            return Response(
                {"error": "Invalid coordinate values"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # tumia filters za kawaida (search, category, price, n.k.)
        base_qs = self.filter_queryset(self.get_queryset())

        # ongeza distance kwa kila product, panga kwa ukaribu
        products = add_distance_to_queryset(base_qs, lat_f, lon_f)
        products = sort_by_distance(products)

        # HATUFANYI pagination hapa – tunarudisha array yote
        serializer = self.get_serializer(
            products,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
    )
    def search_nearby(self, request):
        """
        Advanced nearby search via POST body (still guest-friendly)

        Body (NearbySearchSerializer):
        {
            "latitude": ...,
            "longitude": ...,
            "radius": 10,         # hapa HATUITUMII tena kama LIMIT, tunasort tu
            "category": "...",
            "min_price": ...,
            "max_price": ...,
            "sort_by": "distance" | "price" | "rating"
        }
        """
        serializer = NearbySearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        lat = float(data["latitude"])
        lon = float(data["longitude"])
        category = data.get("category")
        min_price = data.get("min_price")
        max_price = data.get("max_price")
        sort_by_field = data.get("sort_by", "distance")

        queryset = self.filter_queryset(self.get_queryset())

        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # HATUTUMII filter_by_radius tena – tuna-add distance na kupanga tu
        products = add_distance_to_queryset(queryset, lat, lon)

        if sort_by_field == "distance":
            products = sort_by_distance(products)
        elif sort_by_field == "price":
            products = sorted(products, key=lambda x: x.price)
        elif sort_by_field == "rating":
            products = sorted(
                products,
                key=lambda x: getattr(x.seller, "rating", 0),
                reverse=True,
            )

        # hakuna limit – frontend itapanga pagination 10/20 nk.
        out = self.get_serializer(
            products,
            many=True,
            context={"request": request},
        )
        return Response(out.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """
        Products za muuzaji aliye login (seller dashboard)
        (Hapa nimeacha pagination kama ilivyokuwa ili dashboard isipate list
        kubwa sana kwa mara moja – ukitaka na hapa tuondoe pagination tunaweza
        kubadilisha baadaye.)
        """
        try:
            seller_profile = request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = self.get_queryset().filter(seller=seller_profile)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True,
                context={"request": request},
            )
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(
            qs,
            many=True,
            context={"request": request},
        )
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
        # Update seller rating & rating_count
        review.seller.recalculate_rating()

    def perform_update(self, serializer):
        review = serializer.save()
        review.seller.recalculate_rating()

    def perform_destroy(self, instance):
        seller = instance.seller
        super().perform_destroy(instance)
        seller.recalculate_rating()

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
    queryset = Favorite.objects.select_related("user", "seller", "seller__location")
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
                "favorite": FavoriteSerializer(
                    favorite,
                    context={"request": request},
                ).data,
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

        Body:
        {
          "product_id": 123
        }
        """
        toggle_serializer = ProductLikeToggleSerializer(data=request.data)
        if not toggle_serializer.is_valid():
            return Response(toggle_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product_id = toggle_serializer.validated_data["product_id"]

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
        "seller__user",
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

    def perform_update(self, serializer):
        """
        Update order and keep seller.sales stats in sync (completed orders only).
        """
        order = serializer.instance
        old_status = order.status
        order = serializer.save()

        # kama kabla au baada ya update order iko COMPLETED, recompute mauzo
        if old_status == Order.STATUS_COMPLETED or order.status == Order.STATUS_COMPLETED:
            order.seller.recalculate_sales()

    def perform_destroy(self, instance):
        was_completed = instance.status == Order.STATUS_COMPLETED
        seller = instance.seller
        super().perform_destroy(instance)
        if was_completed:
            seller.recalculate_sales()

    @action(detail=False, methods=["get"])
    def as_buyer(self, request):
        """
        Orders ambazo mimi ni buyer
        """
        qs = self.queryset.filter(buyer=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = OrderSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = OrderSerializer(qs, many=True, context={"request": request})
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
            serializer = OrderSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = OrderSerializer(qs, many=True, context={"request": request})
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
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["last_message_at", "created_at"]
    ordering = ["-last_message_at"]

    def get_serializer_class(self):
        if self.action in ["retrieve", "create"]:
            return ConversationDetailSerializer
        return ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(
            Q(buyer=user) | Q(seller__user=user)
        ).distinct()

        # optional filter: ?product_id= & ?seller_id=
        product_id = self.request.query_params.get("product_id")
        seller_id = self.request.query_params.get("seller_id")
        if product_id:
            qs = qs.filter(product_id=product_id)
        if seller_id:
            qs = qs.filter(seller_id=seller_id)

        return qs

    def create(self, request, *args, **kwargs):
        """
        Create or reuse conversation between current user (buyer) and seller.

        Body:
        {
          "seller_id": 1,
          "product_id": 10  # optional
        }
        """
        user = request.user
        seller_id = request.data.get("seller_id")
        product_id = request.data.get("product_id")

        if not seller_id:
            return Response(
                {"error": "seller_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            seller = SellerProfile.objects.get(pk=seller_id)
        except SellerProfile.DoesNotExist:
            return Response(
                {"error": "Seller not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if seller.user_id == user.id:
            return Response(
                {"error": "You cannot start a conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = None
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist:
                return Response(
                    {"error": "Product not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if product.seller_id != seller.id:
                return Response(
                    {"error": "Product does not belong to this seller."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        conversation, created = Conversation.objects.get_or_create(
            buyer=user,
            seller=seller,
            product=product,
        )

        # ensure participant states for both participants
        ConversationParticipantState.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        ConversationParticipantState.objects.get_or_create(
            conversation=conversation,
            user=seller.user,
        )

        serializer = self.get_serializer(conversation, context={"request": request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def mark_seen(self, request, pk=None):
        """
        Tandika messages zote (za upande mwingine) kama zimesomwa
        na update participant_state (last_seen_at, last_read_at).
        """
        conversation = self.get_object()
        user = request.user

        if not (
            conversation.buyer_id == user.id
            or conversation.seller.user_id == user.id
        ):
            return Response(
                {"detail": "You are not part of this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # mark all messages from other side as read
        count = conversation.messages.filter(
            is_read=False
        ).exclude(sender=user).update(
            is_read=True,
            status=Message.STATUS_READ,
        )

        # update participant state
        state, _ = ConversationParticipantState.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        now = timezone.now()
        state.last_seen_at = now
        state.last_read_at = now
        state.is_typing = False
        state.save(update_fields=["last_seen_at", "last_read_at", "is_typing"])

        return Response({"marked_read": count})

    @action(detail=True, methods=["post"])
    def typing(self, request, pk=None):
        """
        Update typing state kwa current user kwenye conversation hii.

        Body:
        {
          "is_typing": true/false
        }
        """
        conversation = self.get_object()
        user = request.user

        if not (
            conversation.buyer_id == user.id
            or conversation.seller.user_id == user.id
        ):
            return Response(
                {"detail": "You are not part of this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        is_typing = bool(request.data.get("is_typing", True))

        state, _ = ConversationParticipantState.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        now = timezone.now()
        state.is_typing = is_typing
        state.last_typing_at = now
        state.save(update_fields=["is_typing", "last_typing_at"])

        # ====== realtime WebSocket: broadcast typing state ======
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            # payload rahisi lakini inatosha kwa frontend yako
            payload = {
                "id": state.id,
                "conversation": conversation.id,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                },
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

            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation.id}",
                {
                    "type": "conversation.typing",
                    "state": payload,
                },
            )

        return Response({"is_typing": is_typing})

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
        """
        Rudisha messages ambazo mimi ni participant (buyer au seller.user).
        Optional filter:
          ?conversation_id=<id> au ?conversation=<id>
        """
        user = self.request.user
        qs = self.queryset.filter(
            Q(conversation__buyer=user) | Q(conversation__seller__user=user)
        ).distinct()

        conv_id = (
            self.request.query_params.get("conversation_id")
            or self.request.query_params.get("conversation")
        )
        if conv_id:
            qs = qs.filter(conversation_id=conv_id)

        return qs

    def create(self, request, *args, **kwargs):
        """
        Create message mpya ndani ya conversation:

        Body:
        {
          "conversation": 1,
          "text": "Habari..."
        }

        - Inathibitisha kuwa current user ni participant.
        - Inahakikisha conversation_id sio NULL (tunachukua kutoka validated_data).
        - Inahifadhi Message manual (Message.objects.create(...)).
        - Inafanya:
            * Conversation.last_message_at update
            * ParticipantState kwa sender (last_seen, last_read)
            * Notification kwa mtu wa pili
            * Realtime WebSocket push -> group "chat_<conversation_id>"
        """
        user = request.user

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = serializer.validated_data["conversation"]
        text = serializer.validated_data["text"]

        # hakikisha user ni sehemu ya hii conversation
        if not (
            conversation.buyer_id == user.id
            or conversation.seller.user_id == user.id
        ):
            return Response(
                {"detail": "You are not part of this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # HAPA NDIO TUNAFIX NOT NULL:
        # Tunatengeneza Message kwa mkono, tukipita na conversation=...
        msg = Message.objects.create(
            conversation=conversation,
            sender=user,
            text=text,
            status=Message.STATUS_SENT,
            is_read=False,
        )

        # update last_message_at
        Conversation.objects.filter(pk=conversation.pk).update(
            last_message_at=msg.created_at
        )

        # update participant state for sender (seen + read)
        state, _ = ConversationParticipantState.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        now = timezone.now()
        state.last_seen_at = now
        state.last_read_at = now
        state.is_typing = False
        state.save(update_fields=["last_seen_at", "last_read_at", "is_typing"])

        # notifications: target ni participant mwingine
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

        # realtime: broadcast kwa WebSocket group ya conversation hii
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            payload = MessageSerializer(
                msg,
                context={"request": request},
            ).data

            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation.id}",
                {
                    "type": "chat.message",
                    "message": payload,
                },
            )

        # response ya HTTP
        output = MessageSerializer(msg, context={"request": request})
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """
        Tandika ujumbe mmoja kama umesomwa (READ) kwa current user.
        """
        msg = self.get_object()
        user = request.user
        conversation = msg.conversation

        if not (
            conversation.buyer_id == user.id
            or conversation.seller.user_id == user.id
        ):
            return Response(
                {"detail": "You are not part of this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if msg.sender_id == user.id:
            # usijandikie ujumbe wako mwenyewe kama unread/read
            return Response({"is_read": msg.is_read})

        if not msg.is_read:
            msg.is_read = True
            msg.status = Message.STATUS_READ
            msg.save(update_fields=["is_read", "status"])

            state, _ = ConversationParticipantState.objects.get_or_create(
                conversation=conversation,
                user=user,
            )
            now = timezone.now()
            state.last_seen_at = now
            state.last_read_at = now
            state.save(update_fields=["last_seen_at", "last_read_at"])

        return Response({"is_read": msg.is_read})


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
