import math
from decimal import Decimal


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on the earth
    (specified in decimal degrees). Returns distance in kilometers (float).
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
    r = 6371.0

    return c * r


def calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon):
    """
    Wrapper function to calculate distance and return as Decimal (km, rounded 2 d.p.)
    """
    distance = haversine_distance(point1_lat, point1_lon, point2_lat, point2_lon)
    return Decimal(str(round(distance, 2)))


def calculate_distance_km_and_miles(point1_lat, point1_lon, point2_lat, point2_lon):
    """
    Helper: return both km and miles as (Decimal km, Decimal miles)
    """
    km = calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon)
    miles = km * Decimal("0.621371")
    return km, Decimal(str(round(miles, 2)))


def filter_by_radius(queryset, user_lat, user_lon, radius_km):
    """
    Filter queryset by distance radius using Haversine formula.

    Supports objects with:
      - obj.location.latitude / obj.location.longitude
      - obj.latitude / obj.longitude

    Returns a Python list, kila object akiwa na attribute `distance` (Decimal, km).
    """
    results = []

    for obj in queryset:
        if hasattr(obj, "location") and obj.location:
            lat = float(obj.location.latitude)
            lon = float(obj.location.longitude)
        elif hasattr(obj, "latitude") and hasattr(obj, "longitude"):
            lat = float(obj.latitude)
            lon = float(obj.longitude)
        else:
            # object haina coordinates – tuna-skip
            continue

        distance = haversine_distance(user_lat, user_lon, lat, lon)

        if distance <= float(radius_km):
            obj.distance = Decimal(str(round(distance, 2)))
            results.append(obj)

    return results


def add_distance_to_queryset(queryset, user_lat, user_lon):
    """
    Add distance attribute to each object in queryset (km) bila ku-filter radius.

    Returns Python list, kila object akiwa na `distance` (Decimal, km).
    """
    results = []

    for obj in queryset:
        if hasattr(obj, "location") and obj.location:
            lat = float(obj.location.latitude)
            lon = float(obj.location.longitude)
        elif hasattr(obj, "latitude") and hasattr(obj, "longitude"):
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
    Sort items by .distance attribute (ascending).
    Items wanaotokuwa na distance watakuja mwisho.
    """
    return sorted(
        items,
        key=lambda x: x.distance if hasattr(x, "distance") else Decimal("999999"),
    )
