from django.contrib import admin
from django.utils.text import Truncator

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


# =========================
#  USER PROFILE
# =========================

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "is_seller",
        "preferred_language",
        "theme",
        "created_at",
    ]
    list_filter = ["is_seller", "preferred_language", "theme", "created_at"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["created_at", "updated_at"]


# =========================
#  SELLER & LOCATION
# =========================

class LocationInline(admin.StackedInline):
    model = Location
    extra = 0
    can_delete = True
    readonly_fields = ["created_at", "updated_at"]


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = [
        "business_name",
        "user",
        "phone_number",
        "is_verified",
        "rating",
        "total_sales",
        "created_at",
    ]
    list_filter = ["is_verified", "created_at"]
    search_fields = ["business_name", "user__username", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [LocationInline]


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["seller", "city", "country", "latitude", "longitude", "created_at"]
    list_filter = ["city", "country"]
    search_fields = ["seller__business_name", "city", "address"]
    readonly_fields = ["created_at", "updated_at"]


# =========================
#  CATEGORY
# =========================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
    ordering = ["name"]


# =========================
#  PRODUCT & IMAGES & LIKES
# =========================

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ["image", "is_primary", "order", "created_at"]
    readonly_fields = ["created_at"]


class ProductLikeInline(admin.TabularInline):
    model = ProductLike
    extra = 0
    fields = ["user", "created_at"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["user"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "seller",
        "seller_city",
        "category",
        "price",
        "stock_quantity",
        "in_stock_flag",
        "likes_count",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "category", "created_at"]
    search_fields = ["name", "seller__business_name"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [ProductImageInline, ProductLikeInline]
    autocomplete_fields = ["seller", "category"]

    def in_stock_flag(self, obj):
        return obj.in_stock

    in_stock_flag.boolean = True
    in_stock_flag.short_description = "In stock"

    def seller_city(self, obj):
        location = getattr(obj.seller, "location", None)
        return location.city if location else ""

    seller_city.short_description = "City"


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["product", "is_primary", "order", "created_at"]
    list_filter = ["is_primary"]
    search_fields = ["product__name"]


@admin.register(ProductLike)
class ProductLikeAdmin(admin.ModelAdmin):
    list_display = ["user", "product", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__username", "product__name"]
    autocomplete_fields = ["user", "product"]


# =========================
#  REVIEWS & FAVORITES
# =========================

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["seller", "user", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["seller__business_name", "user__username"]
    autocomplete_fields = ["seller", "user"]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["user", "seller", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__username", "seller__business_name"]
    autocomplete_fields = ["user", "seller"]


# =========================
#  ORDERS
# =========================

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "product",
        "buyer",
        "seller",
        "quantity",
        "unit_price",
        "total_price",
        "status",
        "created_at",
    ]
    list_filter = ["status", "created_at", "seller"]
    search_fields = [
        "product__name",
        "buyer__username",
        "buyer__email",
        "seller__business_name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["product", "buyer", "seller"]


# =========================
#  CONVERSATIONS & MESSAGES
# =========================

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "buyer", "seller", "product", "created_at", "last_message_at"]
    list_filter = ["created_at", "last_message_at"]
    search_fields = [
        "buyer__username",
        "buyer__email",
        "seller__business_name",
        "product__name",
    ]
    autocomplete_fields = ["buyer", "seller", "product"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "sender", "short_text", "is_read", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["conversation__id", "sender__username", "text"]
    autocomplete_fields = ["conversation", "sender"]

    def short_text(self, obj):
        return Truncator(obj.text).chars(50)

    short_text.short_description = "Message"


# =========================
#  NOTIFICATIONS
# =========================

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "notif_type", "title", "is_read", "created_at"]
    list_filter = ["notif_type", "is_read", "created_at"]
    search_fields = ["user__username", "title", "body"]
    autocomplete_fields = ["user"]
