# utils.py
import math
from decimal import Decimal
from typing import Optional, Tuple, Any


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
    Wrapper function to calculate distance and return as Decimal (km, 2 d.p.)
    """
    distance = haversine_distance(point1_lat, point1_lon, point2_lat, point2_lon)
    return Decimal(str(round(distance, 2)))


def calculate_distance_km_and_miles(point1_lat, point1_lon, point2_lat, point2_lon):
    """
    Helper: return both km and miles as (Decimal km, Decimal miles), 2 d.p.
    """
    km = calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon)
    miles = km * Decimal("0.621371")
    return km, Decimal(str(round(miles, 2)))


def _get_object_coordinates(obj: Any) -> Optional[Tuple[float, float]]:
    """
    Patakazi:

    - Kama obj ni SellerProfile: obj.location.latitude / longitude
    - Kama obj ni Product: obj.seller.location.latitude / longitude
    - Kama obj ana fields za moja kwa moja: obj.latitude / obj.longitude

    Ikarudishe (lat, lon) kama float au None kama hakuna coordinates.
    """
    # 1) SellerProfile (ana "location")
    location = getattr(obj, "location", None)
    if location is not None and hasattr(location, "latitude") and hasattr(location, "longitude"):
        return float(location.latitude), float(location.longitude)

    # 2) Product (ana seller.location)
    seller = getattr(obj, "seller", None)
    if seller is not None:
        seller_location = getattr(seller, "location", None)
        if seller_location is not None and hasattr(seller_location, "latitude") and hasattr(seller_location, "longitude"):
            return float(seller_location.latitude), float(seller_location.longitude)

    # 3) Direct latitude / longitude fields kwenye object
    lat = getattr(obj, "latitude", None)
    lon = getattr(obj, "longitude", None)
    if lat is not None and lon is not None:
        try:
            return float(lat), float(lon)
        except (TypeError, ValueError):
            return None

    # Hakuna coordinates
    return None


def filter_by_radius(queryset, user_lat, user_lon, radius_km):
    """
    Filter queryset by distance radius using Haversine formula.

    Supports objects kama:
      - SellerProfile (with .location)
      - Product (with .seller.location)
      - Vyote vyenye .latitude/.longitude moja kwa moja

    Inarudisha Python list, kila object akiwa na attribute:
      - obj.distance (Decimal, km, 2 d.p.)
    """
    results = []
    radius_km_float = float(radius_km)

    for obj in queryset:
        coords = _get_object_coordinates(obj)
        if coords is None:
            # object haina coordinates – tuna-skip
            continue

        lat, lon = coords
        distance = haversine_distance(user_lat, user_lon, lat, lon)

        if distance <= radius_km_float:
            obj.distance = Decimal(str(round(distance, 2)))
            results.append(obj)

    return results


def add_distance_to_queryset(queryset, user_lat, user_lon):
    """
    Add distance attribute to each object in queryset (km) bila ku-filter radius.

    Inatumia logic ile ile ya _get_object_coordinates kama ilivyo filter_by_radius.

    Inarudisha Python list, kila object akiwa na:
      - obj.distance (Decimal, km, 2 d.p.)
    """
    results = []

    for obj in queryset:
        coords = _get_object_coordinates(obj)
        if coords is None:
            continue

        lat, lon = coords
        distance = haversine_distance(user_lat, user_lon, lat, lon)
        obj.distance = Decimal(str(round(distance, 2)))
        results.append(obj)

    return results


def sort_by_distance(items):
    """
    Sort items by .distance attribute (ascending).
    Items wasiokuwa na distance watakuja mwisho.
    """
    return sorted(
        items,
        key=lambda x: getattr(x, "distance", Decimal("999999")),
    )
