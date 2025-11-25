from rest_framework import serializers
from django.contrib.auth.models import User
from .models import SellerProfile, Location, Category, Product, ProductImage, Review, Favorite


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LocationSerializer(serializers.ModelSerializer):
    """
    Serializer for Location model
    """
    distance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, required=False)

    class Meta:
        model = Location
        fields = ['id', 'address', 'city', 'state', 'country', 'postal_code',
                  'latitude', 'longitude', 'mapbox_place_id', 'distance', 'created_at']
        read_only_fields = ['id', 'created_at']


class SellerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for SellerProfile model
    """
    user = UserSerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    distance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, required=False)

    class Meta:
        model = SellerProfile
        fields = ['id', 'user', 'business_name', 'description', 'phone_number',
                  'is_verified', 'rating', 'total_sales', 'location', 'distance',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'rating', 'total_sales', 'created_at', 'updated_at']


class SellerProfileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating seller profiles
    """
    location = LocationSerializer()

    class Meta:
        model = SellerProfile
        fields = ['business_name', 'description', 'phone_number', 'location']

    def create(self, validated_data):
        location_data = validated_data.pop('location')
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
        fields = ['id', 'name', 'description', 'icon', 'product_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductImage model
    """
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'is_primary', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model
    """
    seller = SellerProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    distance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'seller', 'category', 'name', 'description', 'price',
                  'currency', 'stock_quantity', 'is_active', 'image_url', 'images',
                  'in_stock', 'distance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'seller', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating products
    """
    category_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = ['category_id', 'name', 'description', 'price', 'currency',
                  'stock_quantity', 'is_active', 'image_url']

    def create(self, validated_data):
        category_id = validated_data.pop('category_id', None)
        if category_id:
            validated_data['category_id'] = category_id
        return Product.objects.create(**validated_data)


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Review model
    """
    user = UserSerializer(read_only=True)
    seller_name = serializers.CharField(source='seller.business_name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'seller', 'seller_name', 'user', 'rating', 'comment',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for Favorite model
    """
    seller = SellerProfileSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'seller', 'created_at']
        read_only_fields = ['id', 'created_at']


class NearbySearchSerializer(serializers.Serializer):
    """
    Serializer for nearby search parameters
    """
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=True)
    radius = serializers.IntegerField(default=10, min_value=1, max_value=100)
    category = serializers.CharField(required=False, allow_blank=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    sort_by = serializers.ChoiceField(choices=['distance', 'price', 'rating'], default='distance')
