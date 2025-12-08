# api/utils.py
from decimal import Decimal
from typing import Optional, Tuple, Any, List

import requests
from django.conf import settings


GOOGLE_MAPS_API_KEY = getattr(settings, "GOOGLE_MAPS_API_KEY", None)
GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


class GoogleMapsDistanceError(Exception):
    """
    Raised when Google Distance Matrix API fails or is misconfigured.

    Tunatumia hii exception kwenye views ili kurudisha error nzuri kwa frontend
    badala ya 500 zisizoeleweka.
    """
    pass


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
    if (
        location is not None
        and hasattr(location, "latitude")
        and hasattr(location, "longitude")
    ):
        return float(location.latitude), float(location.longitude)

    # 2) Product (ana seller.location)
    seller = getattr(obj, "seller", None)
    if seller is not None:
        seller_location = getattr(seller, "location", None)
        if (
            seller_location is not None
            and hasattr(seller_location, "latitude")
            and hasattr(seller_location, "longitude")
        ):
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


def _ensure_api_key():
    """
    Hakikisha GOOGLE_MAPS_API_KEY ipo kwenye settings.
    """
    if not GOOGLE_MAPS_API_KEY:
        raise GoogleMapsDistanceError(
            "GOOGLE_MAPS_API_KEY is not configured in Django settings."
        )


def _google_distance_matrix(
    origin: Tuple[float, float],
    destinations: List[Tuple[float, float]],
    mode: str = "driving",
) -> List[Optional[Decimal]]:
    """
    Call Google Distance Matrix API for one origin na multiple destinations.

    - origin: (lat, lon)
    - destinations: list ya (lat, lon)
    - Inarudi list ya Decimal km (2 d.p.) au None kama hakuna distance kwa hiyo destination.
    """
    _ensure_api_key()

    if not destinations:
        return []

    results: List[Optional[Decimal]] = []

    # Kwa usalama, tutatumia chunks ndogo (mf. 25 destinations kwa request).
    chunk_size = 25
    origin_str = f"{origin[0]},{origin[1]}"

    for i in range(0, len(destinations), chunk_size):
        chunk = destinations[i : i + chunk_size]
        destinations_param = "|".join(f"{lat},{lon}" for lat, lon in chunk)

        params = {
            "origins": origin_str,
            "destinations": destinations_param,
            "key": GOOGLE_MAPS_API_KEY,
            "units": "metric",
            "mode": mode,
        }

        try:
            resp = requests.get(
                GOOGLE_DISTANCE_MATRIX_URL,
                params=params,
                timeout=5,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            # Tunarusha error ili view itoe response nzuri kwa frontend
            raise GoogleMapsDistanceError(f"HTTP error talking to Google: {exc}")

        data = resp.json()
        status = data.get("status")
        if status != "OK":
            raise GoogleMapsDistanceError(
                data.get("error_message") or f"Google API status={status}"
            )

        rows = data.get("rows", [])
        if not rows:
            # Hakuna rows – tuna-pad None kwa destinations hizi
            results.extend([None] * len(chunk))
            continue

        elements = rows[0].get("elements", [])

        # Map elements -> chunk; kama Google amerudisha chache, tuna-pad None
        for el in elements:
            if el.get("status") == "OK":
                distance_obj = el.get("distance") or {}
                meters = distance_obj.get("value")
                if meters is None:
                    results.append(None)
                else:
                    km_value = meters / 1000.0
                    km_decimal = Decimal(str(round(km_value, 2)))
                    results.append(km_decimal)
            else:
                results.append(None)

        if len(elements) < len(chunk):
            # Pad kwa None kwa wale waliobaki
            results.extend([None] * (len(chunk) - len(elements)))

    return results


def calculate_distance_km(
    point1_lat: float,
    point1_lon: float,
    point2_lat: float,
    point2_lon: float,
) -> Decimal:
    """
    Calculate distance between two points using **Google Distance Matrix**.

    Inarudisha:
      - Decimal (km, 2 d.p.)

    NB: Hii ndiyo function kuu tunayotumia kwenye API yetu ya `/location/distance/`.
    """
    origin = (float(point1_lat), float(point1_lon))
    destinations = [(float(point2_lat), float(point2_lon))]

    distances = _google_distance_matrix(origin, destinations)

    if not distances or distances[0] is None:
        raise GoogleMapsDistanceError(
            "Google did not return a valid distance for the given coordinates."
        )

    return distances[0]


def calculate_distance_km_and_miles(
    point1_lat,
    point1_lon,
    point2_lat,
    point2_lon,
):
    """
    Helper: return both km and miles as (Decimal km, Decimal miles), 2 d.p.

    Distance ya km inapatikana kupitia Google Distance Matrix.
    """
    km = calculate_distance_km(point1_lat, point1_lon, point2_lat, point2_lon)
    miles = km * Decimal("0.621371")
    return km, Decimal(str(round(miles, 2)))


def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """
    BACKWARD COMPATIBILITY ONLY.

    Awali tulikuwa tunafanya mahesabu ya Haversine hapa.
    Sasa tunatumia Google Distance Matrix lakini tunabaki na jina hili
    ili tusivunje imports zilizopo.

    Inarudisha float km (2 d.p.).
    """
    km = calculate_distance_km(lat1, lon1, lat2, lon2)
    return float(km)


def filter_by_radius(queryset, user_lat, user_lon, radius_km):
    """
    Filter queryset by distance radius using **Google Distance Matrix**.

    Supports objects kama:
      - SellerProfile (with .location)
      - Product (with .seller.location)
      - Vyote vyenye .latitude/.longitude moja kwa moja

    Inarudisha Python list, kila object akiwa na attribute:
      - obj.distance (Decimal, km, 2 d.p.)
    """
    origin = (float(user_lat), float(user_lon))
    results = []

    # Kusanya objects wenye coordinates
    objects_with_coords: List[Tuple[Any, Tuple[float, float]]] = []
    for obj in queryset:
        coords = _get_object_coordinates(obj)
        if coords is None:
            continue
        objects_with_coords.append((obj, coords))

    if not objects_with_coords:
        return []

    coords_only = [coord for _, coord in objects_with_coords]

    distances = _google_distance_matrix(origin, coords_only)
    radius_km_float = float(radius_km)

    for (obj, _), dist in zip(objects_with_coords, distances):
        if dist is None:
            continue
        if float(dist) <= radius_km_float:
            obj.distance = dist  # Decimal tayari
            results.append(obj)

    return results


def add_distance_to_queryset(queryset, user_lat, user_lon):
    """
    Add distance attribute to each object in queryset (km) bila ku-filter radius.

    Inatumia **Google Distance Matrix** kupitia `_google_distance_matrix`.

    Inarudisha Python list, kila object akiwa na:
      - obj.distance (Decimal, km, 2 d.p.)
    """
    origin = (float(user_lat), float(user_lon))

    objects_with_coords: List[Tuple[Any, Tuple[float, float]]] = []
    for obj in queryset:
        coords = _get_object_coordinates(obj)
        if coords is None:
            continue
        objects_with_coords.append((obj, coords))

    if not objects_with_coords:
        return []

    coords_only = [coord for _, coord in objects_with_coords]
    distances = _google_distance_matrix(origin, coords_only)

    results = []
    for (obj, _), dist in zip(objects_with_coords, distances):
        if dist is None:
            # tuna-skip wale ambao Google haijatoa distance
            continue
        obj.distance = dist
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
