from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Count, Sum


# =========================
#  USER PROFILE & PREFERENCES
# =========================

class UserProfile(models.Model):
    """
    Extra info for any user (buyer or seller)

    - is_seller: role selection at registration
    - preferred_language: 'en' / 'sw'
    - theme: 'light' / 'dark' / 'system'
    - avatar: profile picture (mtumiaji binafsi)
    """
    THEME_CHOICES = [
        ("light", "Light"),
        ("dark", "Dark"),
        ("system", "System"),
    ]
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("sw", "Swahili"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    is_seller = models.BooleanField(default=False)
    preferred_language = models.CharField(
        max_length=2,
        choices=LANGUAGE_CHOICES,
        default="sw",
    )
    theme = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default="light",
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"

    def __str__(self):
        return f"Profile for {self.user.username}"


# =========================
#  SELLER, LOCATION, CATEGORY, PRODUCT
# =========================

class SellerProfile(models.Model):
    """
    Extended profile for users who are sellers

    Tunatumia:
    - user.profile.avatar    => picha binafsi ya user
    - logo                   => logo ya biashara (brand ya duka)
    - rating + rating_count  => wastani na idadi ya reviews
    - total_sales + items_sold => mauzo yaliyokamilika
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )
    business_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)

    # wastani wa rating (1-5)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    # idadi ya reviews zilizotumika ku-compute rating
    rating_count = models.PositiveIntegerField(default=0)

    # idadi ya mauzo (orders zilizokamilika)
    total_sales = models.IntegerField(default=0)
    # jumla ya units/items zilizouzwa kwenye hizo orders
    items_sold = models.PositiveIntegerField(default=0)

    # LOGO YA BIASHARA (inaenda kwenye chat header, shop page, n.k.)
    logo = models.ImageField(
        upload_to="shops/logos/",
        blank=True,
        null=True,
    )

    shop_image = models.ImageField(
        upload_to="shops/images/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "seller_profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business_name} - {self.user.username}"

    # ---------- RATING LOGIC ----------
    def recalculate_rating(self, commit: bool = True):
        """
        Recompute rating average + rating_count kutoka kwenye Review model.

        Inaandika kwenye:
        - self.rating
        - self.rating_count
        """
        agg = self.reviews.aggregate(
            avg=Avg("rating"),
            count=Count("id"),
        )
        avg = agg.get("avg") or 0
        count = agg.get("count") or 0

        self.rating = round(float(avg), 2) if avg else 0.0
        self.rating_count = int(count)

        if commit:
            self.save(update_fields=["rating", "rating_count"])

        return self.rating, self.rating_count

    @property
    def has_rating(self) -> bool:
        """
        True kama seller ana angalau review moja.
        """
        return self.rating_count > 0

    # ---------- SALES LOGIC ----------
    def recalculate_sales(self, commit: bool = True):
        """
        Recompute mauzo yaliyokamilika (status='completed') kutoka kwenye Order.

        Ina-update:
        - total_sales : idadi ya orders completed
        - items_sold  : jumla ya quantity kwenye orders hizo
        """
        # tunatumia related_name='orders' kutoka Order.seller
        from .models import Order  # ikiwa app yako ni tofauti, adjust import

        completed = self.orders.filter(status=Order.STATUS_COMPLETED)

        agg = completed.aggregate(
            orders=Count("id"),
            qty=Sum("quantity"),
        )
        orders_count = agg.get("orders") or 0
        qty_sum = agg.get("qty") or 0

        self.total_sales = int(orders_count)
        self.items_sold = int(qty_sum or 0)

        if commit:
            self.save(update_fields=["total_sales", "items_sold"])

        return self.total_sales, self.items_sold


class Location(models.Model):
    """
    Location model to store geographic coordinates for sellers
    """
    seller = models.OneToOneField(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="location",
    )
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    mapbox_place_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "locations"
        indexes = [
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["city"]),
        ]

    def __str__(self):
        return f"{self.seller.business_name} - {self.city}"


class Category(models.Model):
    """
    Product categories
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Products listed by sellers
    """
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default="USD")
    stock_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
    )
    is_active = models.BooleanField(default=True)

    # main / cover image for the product
    image = models.ImageField(
        upload_to="products/main/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["seller", "is_active"]),
            models.Index(fields=["category"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.seller.business_name}"

    @property
    def in_stock(self):
        return self.stock_quantity > 0

    @property
    def likes_count(self):
        """
        Idadi ya likes kwa product hii.
        Inatumia related_name='likes' kwenye ProductLike.
        """
        return self.likes.count()

    # ---------- SALES PER PRODUCT ----------
    @property
    def sales_count(self) -> int:
        """
        Idadi ya orders zilizokamilika (completed) kwa product hii.
        """
        from .models import Order
        return (
            self.orders.filter(status=Order.STATUS_COMPLETED)
            .aggregate(c=Count("id"))
            .get("c")
            or 0
        )

    @property
    def units_sold(self) -> int:
        """
        Jumla ya quantity iliyouzwa (sum ya quantity kwa orders completed) kwa product hii.
        """
        from .models import Order
        return (
            self.orders.filter(status=Order.STATUS_COMPLETED)
            .aggregate(q=Sum("quantity"))
            .get("q")
            or 0
        )


class ProductImage(models.Model):
    """
    Multiple images for products (gallery)
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="products/gallery/",
    )

    is_primary = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_images"
        ordering = ["order", "-created_at"]

    def __str__(self):
        return f"Image for {self.product.name}"


# =========================
#  LIKES
# =========================

class ProductLike(models.Model):
    """
    A single like per user per product
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="product_likes",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_likes"
        unique_together = ["user", "product"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} likes {self.product.name}"


# =========================
#  REVIEWS & FAVORITES
# =========================

class Review(models.Model):
    """
    Reviews for sellers
    """
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]
        unique_together = ["seller", "user"]

    def __str__(self):
        return f"Review by {self.user.username} for {self.seller.business_name}"


class Favorite(models.Model):
    """
    User's favorite sellers
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "favorites"
        unique_together = ["user", "seller"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} favorites {self.seller.business_name}"


# =========================
#  ORDERS
# =========================

class Order(models.Model):
    """
    Order between buyer and seller for a product
    """
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_COMPLETED, "Completed"),
    ]

    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    delivery_address = models.TextField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    note = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["buyer", "status"]),
            models.Index(fields=["seller", "status"]),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.product.name}"


# =========================
#  CHAT & NOTIFICATIONS
# =========================

class Conversation(models.Model):
    """
    Chat conversation between buyer and seller, optionally per product

    - buyer: User (mnunuzi)
    - seller: SellerProfile (muuzaji + logo ya biashara)
    - product: optional product inayojadiliwa
    """
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="buyer_conversations",
    )
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name="seller_conversations",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversations"
        unique_together = ["buyer", "seller", "product"]
        ordering = ["-last_message_at"]

    def __str__(self):
        base = f"{self.buyer.username} ↔ {self.seller.business_name}"
        if self.product:
            return f"{base} ({self.product.name})"
        return base


class ConversationParticipantState(models.Model):
    """
    Hali ya kila user ndani ya conversation (kwa typing & read status)

    - user: User (buyer au seller.user)
    - conversation: convo husika
    - is_typing: True kama yupo anatype sasa hivi
    - last_typing_at: alionekana akitype mara ya mwisho lini
    - last_seen_at: mara ya mwisho ku-open chat
    - last_read_at: mara ya mwisho kusoma messages (kwa unread count)
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participant_states",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="conversation_states",
    )
    is_typing = models.BooleanField(default=False)
    last_typing_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "conversation_participant_states"
        unique_together = ["conversation", "user"]
        ordering = ["-last_seen_at"]

    def __str__(self):
        return f"State for {self.user.username} in convo #{self.conversation_id}"


class Message(models.Model):
    """
    A single chat message
    """
    STATUS_SENT = "sent"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"

    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_READ, "Read"),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    text = models.TextField()

    # WhatsApp-like statuses
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SENT,
    )
    is_read = models.BooleanField(default=False)  # kwa compatibility na logic za zamani

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message by {self.sender.username} in #{self.conversation_id}"


class Notification(models.Model):
    """
    Simple notification model for:
    - new order
    - order status change
    - new chat message

    Tutaweka payload ndani ya data:
    {
        "order_id": ...,
        "conversation_id": ...,
        "product_id": ...,
        "seller_id": ...,
        "buyer_id": ...
    }
    """
    NOTIF_TYPE_CHOICES = [
        ("order_new", "New order"),
        ("order_status", "Order status update"),
        ("chat_message", "Chat message"),
        ("order_created", "Order created"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notif_type = models.CharField(
        max_length=50,
        choices=NOTIF_TYPE_CHOICES,
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    # generic data payload (order_id, conversation_id, etc.)
    data = models.JSONField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notif {self.notif_type} for {self.user.username}"
