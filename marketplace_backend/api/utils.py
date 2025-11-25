import math
import requests
from decimal import Decimal
from django.conf import settings


class MapboxService:
    """
    Service class for Mapbox API integration
    """
    BASE_URL = "https://api.mapbox.com"

    def __init__(self):
        self.access_token = settings.MAPBOX_ACCESS_TOKEN

    def geocode_address(self, address):
        """
        Convert address to coordinates using Mapbox Geocoding API

        Args:
            address (str): Address string to geocode

        Returns:
            dict: Contains latitude, longitude, and place details
        """
        endpoint = f"{self.BASE_URL}/geocoding/v5/mapbox.places/{address}.json"
        params = {
            'access_token': self.access_token,
            'limit': 1
        }

        try:
            response = requests.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get('features'):
                feature = data['features'][0]
                coordinates = feature['geometry']['coordinates']

                return {
                    'longitude': coordinates[0],
                    'latitude': coordinates[1],
                    'place_name': feature.get('place_name', ''),
                    'place_id': feature.get('id', ''),
                    'context': feature.get('context', [])
                }
            return None
        except requests.RequestException as e:
            print(f"Geocoding error: {e}")
            return None

    def reverse_geocode(self, longitude, latitude):
        """
        Convert coordinates to address using Mapbox Reverse Geocoding

        Args:
            longitude (float): Longitude coordinate
            latitude (float): Latitude coordinate

        Returns:
            dict: Address details
        """
        endpoint = f"{self.BASE_URL}/geocoding/v5/mapbox.places/{longitude},{latitude}.json"
        params = {
            'access_token': self.access_token,
            'limit': 1
        }

        try:
            response = requests.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get('features'):
                feature = data['features'][0]
                return {
                    'place_name': feature.get('place_name', ''),
                    'place_id': feature.get('id', ''),
                    'context': feature.get('context', [])
                }
            return None
        except requests.RequestException as e:
            print(f"Reverse geocoding error: {e}")
            return None

    def get_distance_matrix(self, coordinates_list):
        """
        Get distance matrix between multiple coordinates using Mapbox Matrix API

        Args:
            coordinates_list (list): List of [longitude, latitude] pairs

        Returns:
            dict: Distance matrix data
        """
        if len(coordinates_list) < 2:
            return None

        coordinates_str = ';'.join([f"{coord[0]},{coord[1]}" for coord in coordinates_list])
        endpoint = f"{self.BASE_URL}/directions-matrix/v1/mapbox/driving/{coordinates_str}"
        params = {
            'access_token': self.access_token,
            'annotations': 'distance,duration'
        }

        try:
            response = requests.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Distance matrix error: {e}")
            return None


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on the earth (specified in decimal degrees)
    Returns distance in kilometers

    Args:
        lat1, lon1: Latitude and longitude of point 1
        lat2, lon2: Latitude and longitude of point 2

    Returns:
        float: Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Radius of earth in kilometers
    r = 6371

    return c * r


def calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon):
    """
    Wrapper function to calculate distance and return as Decimal

    Returns:
        Decimal: Distance in kilometers
    """
    distance = haversine_distance(point1_lat, point1_lon, point2_lat, point2_lon)
    return Decimal(str(round(distance, 2)))


def filter_by_radius(queryset, user_lat, user_lon, radius_km):
    """
    Filter queryset by distance radius using Haversine formula

    Args:
        queryset: Django queryset with latitude and longitude fields
        user_lat: User's latitude
        user_lon: User's longitude
        radius_km: Radius in kilometers

    Returns:
        list: Filtered list of objects with distance attribute added
    """
    results = []

    for obj in queryset:
        # Handle different model types
        if hasattr(obj, 'location'):
            lat = float(obj.location.latitude)
            lon = float(obj.location.longitude)
        elif hasattr(obj, 'latitude'):
            lat = float(obj.latitude)
            lon = float(obj.longitude)
        else:
            continue

        distance = haversine_distance(user_lat, user_lon, lat, lon)

        if distance <= radius_km:
            obj.distance = Decimal(str(round(distance, 2)))
            results.append(obj)

    return results


def add_distance_to_queryset(queryset, user_lat, user_lon):
    """
    Add distance attribute to each object in queryset

    Args:
        queryset: Django queryset
        user_lat: User's latitude
        user_lon: User's longitude

    Returns:
        list: List of objects with distance attribute
    """
    results = []

    for obj in queryset:
        # Handle different model types
        if hasattr(obj, 'location'):
            lat = float(obj.location.latitude)
            lon = float(obj.location.longitude)
        elif hasattr(obj, 'latitude'):
            lat = float(obj.latitude)
            lon = float(obj.longitude)
        else:
            continue

        distance = haversine_distance(user_lat, user_lon, lat, lon)
        obj.distance = Decimal(str(round(distance, 2)))
        results.append(obj)

    return results


def sort_by_distance(items):
    """
    Sort items by distance attribute

    Args:
        items: List of objects with distance attribute

    Returns:
        list: Sorted list
    """
    return sorted(items, key=lambda x: x.distance if hasattr(x, 'distance') else float('inf'))
