from django.contrib import admin
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


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_seller", "preferred_language", "theme", "created_at")
    list_filter = ("is_seller", "preferred_language", "theme")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)


class LocationInline(admin.StackedInline):
    model = Location
    extra = 0


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "business_name",
        "user",
        "phone_number",
        "is_verified",
        "rating",
        "rating_count",
        "total_sales",
        "items_sold",
        "created_at",
    )
    list_filter = ("is_verified",)
    search_fields = ("business_name", "user__username", "user__email")
    readonly_fields = ("rating", "rating_count", "total_sales", "items_sold")
    inlines = [LocationInline]


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "seller",
        "category",
        "price",
        "currency",
        "stock_quantity",
        "is_active",
        "likes_count_display",
        "sales_count_display",
        "units_sold_display",
        "created_at",
    )
    list_filter = ("is_active", "category")
    search_fields = ("name", "seller__business_name", "seller__user__username")
    inlines = [ProductImageInline]

    def likes_count_display(self, obj):
        return obj.likes_count
    likes_count_display.short_description = "Likes"

    def sales_count_display(self, obj):
        return obj.sales_count
    sales_count_display.short_description = "Sales"

    def units_sold_display(self, obj):
        return obj.units_sold
    units_sold_display.short_description = "Units sold"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "seller", "icon", "created_at")
    search_fields = ("name", "seller__business_name")
    list_filter = ("seller",)

@admin.register(ProductLike)
class ProductLikeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product", "created_at")
    search_fields = ("user__username", "product__name")
    raw_id_fields = ("user", "product")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "seller", "user", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("seller__business_name", "user__username")
    raw_id_fields = ("seller", "user")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "seller", "created_at")
    search_fields = ("user__username", "seller__business_name")
    raw_id_fields = ("user", "seller")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "buyer",
        "seller",
        "product",
        "quantity",
        "total_price",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("buyer__username", "seller__business_name", "product__name")
    raw_id_fields = ("buyer", "seller", "product")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "seller", "product", "created_at", "last_message_at")
    list_filter = ("created_at",)
    search_fields = (
        "buyer__username",
        "seller__business_name",
        "product__name",
    )
    raw_id_fields = ("buyer", "seller", "product")


@admin.register(ConversationParticipantState)
class ConversationParticipantStateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "user",
        "is_typing",
        "last_typing_at",
        "last_seen_at",
        "last_read_at",
    )
    list_filter = ("is_typing",)
    search_fields = ("user__username", "conversation__id")
    raw_id_fields = ("conversation", "user")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender",
        "short_text",
        "status",
        "is_read",
        "created_at",
    )
    list_filter = ("status", "is_read", "created_at")
    search_fields = ("sender__username", "conversation__id", "text")
    raw_id_fields = ("conversation", "sender")

    def short_text(self, obj):
        return (obj.text[:40] + "...") if len(obj.text) > 40 else obj.text
    short_text.short_description = "Text"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "notif_type",
        "title",
        "is_read",
        "created_at",
    )
    list_filter = ("notif_type", "is_read", "created_at")
    search_fields = ("user__username", "title", "body")
    raw_id_fields = ("user",)
