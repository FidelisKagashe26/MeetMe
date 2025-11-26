from django.contrib.auth.models import User
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import (
    SellerProfile,
    Location,
    Category,
    Product,
    ProductImage,
    Review,
    Favorite,
)


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration

    - Accepts username OR will generate it from email prefix.
    - Requires password & password_confirm to match.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        ]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match")

        username = data.get("username")
        email = data.get("email")

        if not username:
            if not email:
                raise serializers.ValidationError("Either username or email is required.")
            base = email.split("@")[0]
            candidate = base
            i = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base}{i}"
                i += 1
            data["username"] = candidate

        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for Location model
    """

    distance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        required=False,
    )

    class Meta:
        model = Location
        fields = [
            "id",
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            "latitude",
            "longitude",
            "mapbox_place_id",
            "distance",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SellerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for SellerProfile model
    """

    user = UserSerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    distance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        required=False,
    )

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "user",
            "business_name",
            "description",
            "phone_number",
            "is_verified",
            "rating",
            "total_sales",
            "location",
            "distance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "rating",
            "total_sales",
            "created_at",
            "updated_at",
        ]


class SellerProfileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating seller profiles together with their location
    """

    location = LocationSerializer()

    class Meta:
        model = SellerProfile
        fields = ["business_name", "description", "phone_number", "location"]

    def create(self, validated_data):
        location_data = validated_data.pop("location")
        seller_profile = SellerProfile.objects.create(**validated_data)
        Location.objects.create(seller=seller_profile, **location_data)
        return seller_profile


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model
    """

    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "icon", "product_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductImage model

    - Accepts uploaded file via `image`.
    - Exposes `image_url` as absolute URL for frontend.
    """

    image = serializers.ImageField(required=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "is_primary", "order", "created_at"]
        read_only_fields = ["id", "created_at", "image_url"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image_url(self, obj):
        if obj.image and hasattr(obj.image, "url"):
            request = self.context.get("request")
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model

    API is shaped to match the marketplace UI:

    - `image` is the uploaded file (write-only or optional).
    - `image_url` is an absolute URL for the cover image.
    - Flattens seller shop_name, city, coordinates.
    - Exposes `is_available` as alias of `in_stock`.
    - Exposes `distance_km` if nearby search was applied.
    """

    seller = SellerProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    # uploaded file for main image
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    # URL for main image (computed)
    image_url = serializers.SerializerMethodField()

    in_stock = serializers.BooleanField(read_only=True)
    is_available = serializers.BooleanField(source="in_stock", read_only=True)

    distance_km = serializers.DecimalField(
        source="distance",
        max_digits=10,
        decimal_places=2,
        read_only=True,
        required=False,
    )
    shop_name = serializers.CharField(source="seller.business_name", read_only=True)
    city = serializers.CharField(
        source="seller.location.city",
        read_only=True,
        allow_null=True,
        default=None,
    )
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "seller",
            "category",
            "name",
            "description",
            "price",
            "currency",
            "stock_quantity",
            "is_active",
            "image",       # for uploads (write-only)
            "image_url",   # for frontend display
            "images",
            "in_stock",
            "is_available",
            "distance_km",
            "shop_name",
            "city",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "seller", "created_at", "updated_at"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image_url(self, obj):
        if obj.image and hasattr(obj.image, "url"):
            request = self.context.get("request")
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_latitude(self, obj):
        location = getattr(obj.seller, "location", None)
        if location:
            return str(location.latitude)
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_longitude(self, obj):
        location = getattr(obj.seller, "location", None)
        if location:
            return str(location.longitude)
        return None


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating products

    - Accepts `category_id` (FK).
    - Accepts `image` (file upload).
    """

    category_id = serializers.IntegerField(required=False, allow_null=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "category_id",
            "name",
            "description",
            "price",
            "currency",
            "stock_quantity",
            "is_active",
            "image",
        ]

    def create(self, validated_data):
        category_id = validated_data.pop("category_id", None)
        if category_id:
            # Django allows setting FK via `<field>_id`
            validated_data["category_id"] = category_id
        return Product.objects.create(**validated_data)


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Review model
    """

    user = UserSerializer(read_only=True)
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "seller",
            "seller_name",
            "user",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for Favorite model
    """

    seller = SellerProfileSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "seller", "created_at"]
        read_only_fields = ["id", "created_at"]


class NearbySearchSerializer(serializers.Serializer):
    """
    Serializer for nearby search parameters (advanced POST search)
    """

    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=True)
    radius = serializers.IntegerField(default=10, min_value=1, max_value=100)
    category = serializers.CharField(required=False, allow_blank=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    sort_by = serializers.ChoiceField(
        choices=["distance", "price", "rating"],
        default="distance",
    )


# =========================
#  EXTRA SERIALIZERS FOR AUTH (JWT) & UTIL ENDPOINTS
# =========================


class LoginSerializer(serializers.Serializer):
    """
    Request body for login endpoint
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class JWTTokenSerializer(serializers.Serializer):
    """
    Response body for auth endpoints (register/login) with JWT
    """

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class LogoutSerializer(serializers.Serializer):
    """
    Request body for logout endpoint (JWT blacklist)
    """

    refresh = serializers.CharField()


class MessageSerializer(serializers.Serializer):
    """
    Simple message response (e.g. logout)
    """

    message = serializers.CharField()


class DistanceRequestSerializer(serializers.Serializer):
    """
    Request body for distance calculation (Haversine)
    """

    latitude1 = serializers.DecimalField(max_digits=10, decimal_places=8)
    longitude1 = serializers.DecimalField(max_digits=11, decimal_places=8)
    latitude2 = serializers.DecimalField(max_digits=10, decimal_places=8)
    longitude2 = serializers.DecimalField(max_digits=11, decimal_places=8)


class DistanceResponseSerializer(serializers.Serializer):
    """
    Response body for distance calculation
    """

    distance_km = serializers.FloatField()
    distance_miles = serializers.FloatField()
