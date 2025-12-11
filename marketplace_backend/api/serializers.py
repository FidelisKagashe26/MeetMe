from django.contrib.auth.models import User
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

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


# =========================
#  HELPERS
# =========================

def _build_absolute_uri(request, file_field):
    """
    Helper: rudi absolute URL ya file (image) kama request ipo.
    """
    if not file_field:
        return None
    url = file_field.url
    if request is None:
        return url
    return request.build_absolute_uri(url)


# =========================
#  USER & PROFILE
# =========================

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Profile ya user:
    - is_seller: kama ni muuzaji au mnunuaji
    - preferred_language: 'en' / 'sw'
    - theme: 'light' / 'dark' / 'system'
    - avatar: profile picture
    """
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "is_seller",
            "preferred_language",
            "theme",
            "avatar",
            "avatar_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatar_url(self, obj):
        request = self.context.get("request")
        return _build_absolute_uri(request, obj.avatar)


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer kwa User model (ikiwa na info ya profile).
    """
    is_seller = serializers.SerializerMethodField()
    preferred_language = serializers.SerializerMethodField()
    theme = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "is_seller",
            "preferred_language",
            "theme",
            "avatar_url",
        ]
        read_only_fields = [
            "id",
            "date_joined",
            "is_seller",
            "preferred_language",
            "theme",
            "avatar_url",
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_is_seller(self, obj):
        profile = getattr(obj, "profile", None)  # related_name="profile"
        return bool(profile.is_seller) if profile else False

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_preferred_language(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.preferred_language if profile else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_theme(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.theme if profile else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatar_url(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.avatar:
            request = self.context.get("request")
            return _build_absolute_uri(request, profile.avatar)
        return None


class UserMiniSerializer(serializers.ModelSerializer):
    """
    User mdogo kwa ajili ya chat, seller info, n.k.
    """
    avatar_url = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "avatar_url",
            "is_seller",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatar_url(self, obj):
        request = self.context.get("request")
        profile = getattr(obj, "profile", None)
        if profile and profile.avatar:
            return _build_absolute_uri(request, profile.avatar)
        return None

    @extend_schema_field(serializers.BooleanField())
    def get_is_seller(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(profile and profile.is_seller)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer kwa user registration

    - Accepts username OR tuna-generate kutoka email.
    - Inahitaji password & password_confirm zilingane.
    - is_seller: user achague kama ni seller au buyer.
    - preferred_language & theme tunazi-set kwenye UserProfile.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    is_seller = serializers.BooleanField(write_only=True, default=False)
    preferred_language = serializers.ChoiceField(
        choices=UserProfile.LANGUAGE_CHOICES,
        default="en",
        write_only=True,
    )
    theme = serializers.ChoiceField(
        choices=UserProfile.THEME_CHOICES,
        default="system",
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "is_seller",
            "preferred_language",
            "theme",
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
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)

        is_seller = validated_data.pop("is_seller", False)
        preferred_language = validated_data.pop("preferred_language", "en")
        theme = validated_data.pop("theme", "system")

        user = User.objects.create_user(password=password, **validated_data)

        # Tengeneza UserProfile kwa user
        UserProfile.objects.create(
            user=user,
            is_seller=is_seller,
            preferred_language=preferred_language,
            theme=theme,
        )

        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer ya kubadili password
    """

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError("New passwords do not match")
        return data


class UserSettingsUpdateSerializer(serializers.Serializer):
    """
    Update basic user info + preferences (profile page)
    """

    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.ChoiceField(
        choices=UserProfile.LANGUAGE_CHOICES,
        required=False,
    )
    theme = serializers.ChoiceField(
        choices=UserProfile.THEME_CHOICES,
        required=False,
    )


# =========================
#  LOCATION & SELLER PROFILE
# =========================

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
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SellerProfileSerializer(serializers.ModelSerializer):
    """
    Full SellerProfile:

    - user: full UserSerializer (ina profile info)
    - location: LocationSerializer (ina distance kama umehesabiwa)
    - logo_url: absolute URL
    - rating, rating_count
    - total_sales, items_sold
    - distance: kwa seller (ikiwekwa na haversine kwenye view)
    """

    user = UserSerializer(read_only=True)
    location = LocationSerializer(read_only=True)

    distance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        required=False,
    )

    logo_url = serializers.SerializerMethodField()

    shop_image_url = serializers.SerializerMethodField()

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
            "rating_count",
            "total_sales",
            "items_sold",
            "logo",
            "logo_url",
            "shop_image",
            "shop_image_url",
            "location",
            "distance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "rating",
            "rating_count",
            "total_sales",
            "items_sold",
            "distance",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_logo_url(self, obj):
        request = self.context.get("request")
        return _build_absolute_uri(request, obj.logo)
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_shop_image_url(self, obj):
        request = self.context.get("request")
        return _build_absolute_uri(request, obj.shop_image)


class SellerMiniSerializer(serializers.ModelSerializer):
    """
    Seller kwa matumizi ya ndani ya product / conversation headers.
    """
    logo_url = serializers.SerializerMethodField()
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "business_name",
            "is_verified",
            "rating",
            "rating_count",
            "total_sales",
            "items_sold",
            "logo_url",
            "user",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_logo_url(self, obj):
        request = self.context.get("request")
        return _build_absolute_uri(request, obj.logo)


class SellerProfileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating seller profiles together with their location
    """

    location = LocationSerializer()

    class Meta:
        model = SellerProfile
        fields = ["business_name", "description", "phone_number", "logo", "location"]

    def create(self, validated_data):
        location_data = validated_data.pop("location")
        seller_profile = SellerProfile.objects.create(**validated_data)
        Location.objects.create(seller=seller_profile, **location_data)
        return seller_profile


# =========================
#  CATEGORY
# =========================

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model
    """

    product_count = serializers.IntegerField(read_only=True, required=False)
    seller_id = serializers.IntegerField(
        source="seller.id",
        read_only=True,
    )
    seller_name = serializers.CharField(
        source="seller.business_name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "seller_id",
            "seller_name",
            "product_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "seller_id", "seller_name", "product_count"]


# =========================
#  PRODUCT IMAGES
# =========================

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


# =========================
#  PRODUCT + LIKES
# =========================

class ProductMiniSerializer(serializers.ModelSerializer):
    """
    Product mdogo kwa chat header / notification payload.
    """
    image_url = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    units_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "currency",
            "image_url",
            "likes_count",
            "sales_count",
            "units_sold",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image_url(self, obj):
        request = self.context.get("request")
        return _build_absolute_uri(request, obj.image)

    @extend_schema_field(serializers.IntegerField())
    def get_likes_count(self, obj):
        return getattr(obj, "likes_count", obj.likes.count())

    @extend_schema_field(serializers.IntegerField())
    def get_sales_count(self, obj):
        return getattr(obj, "sales_count", obj.sales_count)

    @extend_schema_field(serializers.IntegerField())
    def get_units_sold(self, obj):
        return getattr(obj, "units_sold", obj.units_sold)


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model (read)

    - `image` main image
    - `image_url` absolute URL
    - seller: SellerProfileSerializer (ina rating, total_sales, location, distance)
    - distance_km from haversine (source="distance" attribute on queryset)
    - likes_count & is_liked
    - sales_count & units_sold (per product)
    """

    seller = SellerProfileSerializer(read_only=True)
    seller_id = serializers.IntegerField(source="seller.id", read_only=True)
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
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

    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    units_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "seller",
            "seller_id",
            "category",
            "name",
            "description",
            "price",
            "currency",
            "stock_quantity",
            "is_active",
            "image",
            "image_url",
            "images",
            "in_stock",
            "is_available",
            "distance_km",
            "shop_name",
            "city",
            "latitude",
            "longitude",
            "likes_count",
            "is_liked",
            "sales_count",
            "units_sold",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "seller",
            "created_at",
            "updated_at",
            "in_stock",
            "is_available",
            "distance_km",
            "shop_name",
            "city",
            "latitude",
            "longitude",
            "likes_count",
            "is_liked",
            "sales_count",
            "units_sold",
        ]

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

    @extend_schema_field(serializers.IntegerField())
    def get_likes_count(self, obj):
        return getattr(obj, "likes_count", obj.likes.count())

    @extend_schema_field(serializers.BooleanField())
    def get_is_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return ProductLike.objects.filter(user=user, product=obj).exists()

    @extend_schema_field(serializers.IntegerField())
    def get_sales_count(self, obj):
        return getattr(obj, "sales_count", obj.sales_count)

    @extend_schema_field(serializers.IntegerField())
    def get_units_sold(self, obj):
        return getattr(obj, "units_sold", obj.units_sold)


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

    def validate_category_id(self, value):
        """
        Hakikisha category anayochagua ni ya duka lake (au none).
        """
        if value is None:
            return None

        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        try:
            seller_profile = user.seller_profile
        except SellerProfile.DoesNotExist:
            raise serializers.ValidationError("You must create a seller profile first.")

        try:
            Category.objects.get(id=value, seller=seller_profile)
        except Category.DoesNotExist:
            raise serializers.ValidationError("Invalid category for this shop.")

        return value

    def create(self, validated_data):
        category_id = validated_data.pop("category_id", None)
        if category_id:
            validated_data["category_id"] = category_id
        return Product.objects.create(**validated_data)


class ProductLikeSerializer(serializers.ModelSerializer):
    """
    Simple serializer for a single like record
    """

    class Meta:
        model = ProductLike
        fields = ["id", "user", "product", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class ProductLikeToggleSerializer(serializers.Serializer):
    """
    Toggle like/unlike kwa product

    Body:
    {
        "product_id": 123
    }
    """

    product_id = serializers.IntegerField()


# =========================
#  REVIEWS & FAVORITES
# =========================

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
    seller_id = serializers.PrimaryKeyRelatedField(
        source="seller",
        queryset=SellerProfile.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Favorite
        fields = ["id", "seller", "seller_id", "created_at"]
        read_only_fields = ["id", "created_at"]


# =========================
#  NEARBY SEARCH (HAVERSINE)
# =========================

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
#  ORDERS
# =========================

class OrderProductSerializer(serializers.ModelSerializer):
    """
    Product summary ndani ya Order
    """

    image_url = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source="seller.business_name", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "price", "currency", "image_url", "shop_name"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image_url(self, obj):
        if obj.image and hasattr(obj.image, "url"):
            request = self.context.get("request")
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class OrderSerializer(serializers.ModelSerializer):
    """
    Read serializer kwa Order (list/detail)
    """

    product = OrderProductSerializer(read_only=True)
    buyer = UserSerializer(read_only=True)
    seller = SellerProfileSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "product",
            "buyer",
            "seller",
            "quantity",
            "unit_price",
            "total_price",
            "status",
            "delivery_address",
            "contact_phone",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product",
            "buyer",
            "seller",
            "unit_price",
            "total_price",
            "status",
            "created_at",
            "updated_at",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    """
    Create serializer kwa Order.
    """

    class Meta:
        model = Order
        fields = ["product", "quantity", "delivery_address", "contact_phone", "note"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value


# =========================
#  CHATTING (CONVERSATION, TYPING, MESSAGE)
# =========================

class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer kwa ujumbe mmoja kwenye conversation (read)
    WhatsApp style: ina sender mini, status, timestamps.
    """

    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "text",
            "status",
            "is_read",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "status",
            "is_read",
            "created_at",
            "updated_at",
        ]


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer kwa kutuma message mpya (create)

    Body:
    {
        "conversation": 1,   # id ya conversation
        "text": "Habari, hii bidhaa bado ipo?"
    }
    """

    class Meta:
        model = Message
        fields = ["conversation", "text"]

    def validate_conversation(self, conversation):
        """
        Hakikisha conversation ipo kabisa.
        (Check hii ya msingi inasaidia kujizuia na NULL).
        """
        if conversation is None:
            raise serializers.ValidationError("conversation is required.")
        return conversation


class ConversationParticipantStateSerializer(serializers.ModelSerializer):
    """
    Hali ya kila user ndani ya conversation (typing, last_seen, last_read)
    """

    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = ConversationParticipantState
        fields = [
            "id",
            "conversation",
            "user",
            "is_typing",
            "last_typing_at",
            "last_seen_at",
            "last_read_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "user",
            "last_typing_at",
            "last_seen_at",
            "last_read_at",
        ]


class ConversationSerializer(serializers.ModelSerializer):
    """
    Conversation LIST (chat list view)

    Inarudisha:
    - buyer (UserMini)
    - seller (SellerMini)
    - product (ProductMini)
    - last_message (MessageSerializer)
    - unread_count (kwa current user)
    - is_typing_other_side (typing indicator)
    """

    buyer = UserMiniSerializer(read_only=True)
    seller = SellerMiniSerializer(read_only=True)
    product = ProductMiniSerializer(read_only=True, allow_null=True)

    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_typing_other_side = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "buyer",
            "seller",
            "product",
            "created_at",
            "last_message_at",
            "last_message",
            "unread_count",
            "is_typing_other_side",
        ]
        read_only_fields = fields

    @extend_schema_field(MessageSerializer)
    def get_last_message(self, obj):
        last_msg = obj.messages.order_by("-created_at").first()
        if not last_msg:
            return None
        return MessageSerializer(last_msg, context=self.context).data

    @extend_schema_field(serializers.IntegerField())
    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return 0
        user = request.user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()

    @extend_schema_field(serializers.BooleanField())
    def get_is_typing_other_side(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        user = request.user
        states = obj.participant_states.exclude(user=user)
        return states.filter(is_typing=True).exists()


class ConversationDetailSerializer(ConversationSerializer):
    """
    DETAIL ya conversation moja:

    - fields zote za ConversationSerializer
    - messages: list ya MessageSerializer
    - participant_states: typing & read states
    """

    messages = MessageSerializer(many=True, read_only=True)
    participant_states = ConversationParticipantStateSerializer(
        many=True,
        read_only=True,
    )

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + [
            "messages",
            "participant_states",
        ]


# =========================
#  NOTIFICATIONS
# =========================

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer kwa notification (order mpya, message mpya, nk.)

    data:
    {
      "order_id": ...,
      "conversation_id": ...,
      "product_id": ...,
      "seller_id": ...,
      "buyer_id": ...
    }
    """

    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "notif_type",
            "title",
            "body",
            "data",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]

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


class SimpleMessageSerializer(serializers.Serializer):
    """
    Simple message response (e.g. logout, success)
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
