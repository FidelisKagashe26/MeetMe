from django.contrib import admin
from .models import SellerProfile, Location, Category, Product, ProductImage, Review, Favorite


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ["business_name", "user", "is_verified", "rating", "total_sales", "created_at"]
    list_filter = ["is_verified", "created_at"]
    search_fields = ["business_name", "user__username", "user__email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["seller", "city", "country", "latitude", "longitude", "created_at"]
    list_filter = ["city", "country"]
    search_fields = ["seller__business_name", "city", "address"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "seller",
        "seller_city",
        "category",
        "price",
        "stock_quantity",
        "in_stock",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "category", "created_at"]
    search_fields = ["name", "seller__business_name"]
    readonly_fields = ["created_at", "updated_at"]

    def in_stock(self, obj):
        return obj.in_stock

    in_stock.boolean = True
    in_stock.short_description = "In stock"

    def seller_city(self, obj):
        location = getattr(obj.seller, "location", None)
        return location.city if location else ""

    seller_city.short_description = "City"


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["product", "is_primary", "order", "created_at"]
    list_filter = ["is_primary"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["seller", "user", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["seller__business_name", "user__username"]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ["user", "seller", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__username", "seller__business_name"]
