import math
from decimal import Decimal


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on the earth
    (specified in decimal degrees). Returns distance in kilometers.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(
        math.radians,
        [float(lat1), float(lon1), float(lat2), float(lon2)],
    )

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    # Radius of earth in kilometers
    r = 6371

    return c * r


def calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon):
    """
    Wrapper function to calculate distance and return as Decimal (km)
    """
    distance = haversine_distance(point1_lat, point1_lon, point2_lat, point2_lon)
    return Decimal(str(round(distance, 2)))


def filter_by_radius(queryset, user_lat, user_lon, radius_km):
    """
    Filter queryset by distance radius using Haversine formula.

    Supports objects with:
      - obj.location.latitude / obj.location.longitude
      - obj.latitude / obj.longitude
    """
    results = []

    for obj in queryset:
        if hasattr(obj, 'location') and obj.location:
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
    Add distance attribute to each object in queryset (km)
    """
    results = []

    for obj in queryset:
        if hasattr(obj, 'location') and obj.location:
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
    Sort items by .distance attribute (ascending)
    """
    return sorted(items, key=lambda x: x.distance if hasattr(x, 'distance') else float('inf'))
