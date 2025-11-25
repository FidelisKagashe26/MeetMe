from django.contrib import admin
from .models import SellerProfile, Location, Category, Product, ProductImage, Review, Favorite


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'is_verified', 'rating', 'total_sales', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['seller', 'city', 'country', 'latitude', 'longitude']
    list_filter = ['city', 'country']
    search_fields = ['seller__business_name', 'city', 'address']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller', 'category', 'price', 'stock_quantity', 'is_active', 'created_at']
    list_filter = ['is_active', 'category', 'created_at']
    search_fields = ['name', 'seller__business_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_primary', 'order', 'created_at']
    list_filter = ['is_primary']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['seller', 'user', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['seller__business_name', 'user__username']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'seller', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'seller__business_name']
