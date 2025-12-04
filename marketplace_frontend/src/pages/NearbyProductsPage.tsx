// src/pages/NearbyProductsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import axios from "axios";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface SellerLite {
  id?: number;
  business_name: string;
  logo_url?: string | null;
  shop_image_url?: string | null;
  shop_image?: string | null;
  location?: {
    city: string;
    country: string;
  } | null;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url: string | null;
  image?: string | null;

  // distance kutoka backend (inaweza kuwa string au number au null)
  distance?: string | number | null;
  distance_km?: string | number | null;

  // optional location extra kutoka serializer
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;

  seller?: SellerLite;
}

interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
}

const PAGE_SIZE = 10;

// helper: geuza distance kuwa number salama
const getNumericDistanceKm = (product: Product): number | null => {
  const raw = product.distance_km ?? product.distance ?? null;
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "number") {
    return raw;
  }
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

// helper: score ya ukaribu 1–10 (1 = karibu sana)
const getProximityScore = (
  distance: number | null,
  min: number | null,
  max: number | null,
): number | null => {
  if (distance === null || min === null || max === null) return null;
  if (max <= min) return 1;
  const normalized = (distance - min) / (max - min); // 0..1
  const score = Math.round(normalized * 9) + 1; // 1..10
  return Math.min(10, Math.max(1, score));
};

interface ShopChip {
  key: string;
  name: string;
  logo_url: string | null;
}

const NearbyProductsPage: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [radius, setRadius] = useState<number>(10); // km
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [page, setPage] = useState<number>(1);

  // ====== GET BROWSER LOCATION ======
  const askLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Browser wako hauna support ya geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Umezima ruhusa ya location. Fungua settings za browser kuruhusu location kwa LINKA.",
          );
        } else {
          setLocationError("Imeshindikana kupata location ya kifaa.");
        }
      },
    );
  };

  // mara ya kwanza kabisa, jaribu kuchukua location
  useEffect(() => {
    askLocation();
  }, []);

  // ====== FETCH NEARBY PRODUCTS ======
  const fetchNearby = async (params: NearbyQueryParams) => {
    setLoading(true);
    setError(null);
    setProducts([]);

    try {
      // Backend mpya: inarudisha array ya Product tu (hakuna tena {count, results})
      const res = await apiClient.get<Product[]>("/api/products/nearby/", {
        params: {
          lat: params.lat,
          lng: params.lng,
          // Nearby page tunaMALIZA na radius – hapa ndio tunaituma makusudi
          radius: params.radius ?? radius,
        },
      });

      const dataProducts = res.data || [];
      setProducts(dataProducts);
      setPage(1); // kila tukipata data mpya, turudi page 1
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data && typeof data === "object") {
          setError(JSON.stringify(data));
        } else {
          setError("Imeshindikana kutafuta bidhaa karibu.");
        }
      } else {
        setError("Imeshindikana kutafuta bidhaa karibu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // kila tukipata coords mpya au radius ibadilike → tafuta karibu
  useEffect(() => {
    if (coords) {
      void fetchNearby({ lat: coords.lat, lng: coords.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, radius]);

  // filter ndogo ya client-side kwa search box
  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.seller?.business_name || "").toLowerCase().includes(term)
    );
  });

  // distance stats kwa scale 1–10
  const numericDistances = filteredProducts
    .map((p) => getNumericDistanceKm(p))
    .filter((d): d is number => d !== null);

  let minDistance: number | null = null;
  let maxDistance: number | null = null;

  if (numericDistances.length > 0) {
    minDistance = Math.min(...numericDistances);
    maxDistance = Math.max(...numericDistances);
  }

  // pangilia bidhaa kwa ukaribu (karibu → mbali)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const da = getNumericDistanceKm(a);
    const db = getNumericDistanceKm(b);

    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const totalPages =
    sortedProducts.length > 0
      ? Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))
      : 1;

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedProducts = sortedProducts.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const hasAnyCoords = paginatedProducts.some(
    (p) => p.latitude != null && p.longitude != null,
  );

  // chips za maduka kwenye page hii (kwa ramani)
  const shopsOnPage: ShopChip[] = useMemo(() => {
    const map = new Map<string, ShopChip>();
    paginatedProducts.forEach((p) => {
      if (!p.seller) return;
      const key = p.seller.id ? String(p.seller.id) : p.seller.business_name;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: p.seller.business_name,
          logo_url: p.seller.logo_url ?? null,
        });
      }
    });
    return Array.from(map.values());
  }, [paginatedProducts]);

  const handleOpenMapAll = () => {
    if (!coords) {
      setLocationError(
        "Hatukupata location ya kifaa chako bado. Bonyeza 'Tumia location yangu' kwanza.",
      );
      return;
    }

    const points = paginatedProducts
      .map((p) => {
        const lat = p.latitude;
        const lng = p.longitude;
        if (lat == null || lng == null) return null;

        const latNum = typeof lat === "number" ? lat : parseFloat(lat);
        const lngNum = typeof lng === "number" ? lng : parseFloat(lng);
        if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

        return `${latNum},${lngNum}`;
      })
      .filter((val): val is string => val !== null);

    if (points.length === 0) {
      setLocationError(
        "Hatuna coordinates za maduka haya kwa sasa kuonyesha kwenye ramani.",
      );
      return;
    }

    // Google Maps: origin = user, destination = duka la kwanza kwenye page hii, waypoints = mengine
    const base = "https://www.google.com/maps/dir/?api=1";
    const origin = `origin=${coords.lat},${coords.lng}`;
    const destination = `destination=${points[0]}`;
    const waypointsParam =
      points.length > 1
        ? `&waypoints=${encodeURIComponent(points.slice(1).join("|"))}`
        : "";

    const url = `${base}&${origin}&${destination}${waypointsParam}`;
    window.open(url, "_blank");
  };

  const handleSelectProductOnMap = (product: Product) => {
    const lat = product.latitude;
    const lng = product.longitude;
    if (lat == null || lng == null) return;

    const latNum = typeof lat === "number" ? lat : parseFloat(lat);
    const lngNum = typeof lng === "number" ? lng : parseFloat(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return;

    setSelectedCoords({ lat: latNum, lng: lngNum });
  };

  const handleNavigateToShop = (product: Product) => {
    if (!coords) {
      setLocationError(
        "Hatukupata location ya kifaa chako bado. Bonyeza 'Tumia location yangu' kwanza.",
      );
      return;
    }

    const lat = product.latitude;
    const lng = product.longitude;
    if (lat == null || lng == null) {
      setLocationError("Hatuna coordinates kamili za duka hili kwa sasa.");
      return;
    }

    const latNum = typeof lat === "number" ? lat : parseFloat(lat);
    const lngNum = typeof lng === "number" ? lng : parseFloat(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setLocationError("Coordinates za duka hili sio sahihi.");
      return;
    }

    const base = "https://www.google.com/maps/dir/?api=1";
    const origin = `origin=${coords.lat},${coords.lng}`;
    const destination = `destination=${latNum},${lngNum}`;
    const url = `${base}&${origin}&${destination}`;
    window.open(url, "_blank");
  };

  // center ya ramani: product uliochagua → user location → duka la kwanza lenye coords (kwenye page hii)
  let mapCenter: { lat: number; lng: number } | null = null;

  if (selectedCoords) {
    mapCenter = selectedCoords;
  } else if (coords) {
    mapCenter = coords;
  } else {
    const firstWithCoords = paginatedProducts.find(
      (p) => p.latitude != null && p.longitude != null,
    );
    if (firstWithCoords) {
      const lat = firstWithCoords.latitude!;
      const lng = firstWithCoords.longitude!;
      const latNum = typeof lat === "number" ? lat : parseFloat(lat);
      const lngNum = typeof lng === "number" ? lng : parseFloat(lng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        mapCenter = { lat: latNum, lng: lngNum };
      }
    }
  }

  const mapIframeSrc = mapCenter
    ? `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=14&output=embed`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      {/* MAIN */}
      <main className="flex-1 max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1 text-slate-900 dark:text-slate-100">
              Bidhaa karibu na ulipo
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tunatumia location ya kifaa chako (GPS / browser) kuonyesha bidhaa
              za karibu. Hatuhifadhi point zako za ramani, tunazitumia kwa
              uonyeshaji tu.
            </p>
          </div>
          <Link
            to="/products"
            className="text-[11px] text-orange-600 hover:underline"
          >
            ← Rudi kwenye bidhaa zote
          </Link>
        </div>

        {/* LOCATION & FILTER BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={askLocation}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Tumia location yangu
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <label htmlFor="radius" className="whitespace-nowrap">
                  Radius:
                </label>
                <select
                  id="radius"
                  value={radius}
                  onChange={(e) => {
                    setRadius(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="border rounded px-2 py-1 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>

              {coords && (
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tafuta ndani ya matokeo (jina la bidhaa / duka)..."
                  className="w-full border rounded-full px-3 py-1.5 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                />
              </div>

              {/* Button ya kufungua ramani kama modal kwa mobile */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                disabled={!coords && !hasAnyCoords}
                className="lg:hidden px-3 py-1.5 rounded-full border text-[11px] font-medium border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fungua ramani
              </button>
            </div>
          </div>

          {locationError && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {locationError}
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* MAIN LAYOUT: desktop = map + list, mobile = list only */}
        <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6">
          {/* MAP PANEL - desktop only */}
          <div className="hidden lg:block">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-3 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Ramani ya maduka karibu
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bonyeza duka lolote upande wa kulia kuona location yake
                    katika ramani hii, au tumia &quot;Anza safari&quot; kuanza
                    directions za Google Maps.
                  </p>
                </div>
              </div>

              {/* Chips za maduka kwenye page hii */}
              {shopsOnPage.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {shopsOnPage.map((shop) => (
                    <div
                      key={shop.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-100 max-w-[60%]"
                    >
                      {shop.logo_url && (
                        <img
                          src={shop.logo_url}
                          alt={shop.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                      <span className="truncate">{shop.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenMapAll}
                  disabled={!coords || !hasAnyCoords}
                  className="px-3 py-1.5 rounded-full border text-[11px] font-medium border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fungua Google Maps (maduka yote kwenye page hii)
                </button>
              </div>

              {/* Ramani fupi, muonekano mzuri */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 h-72">
                {mapIframeSrc ? (
                  <iframe
                    title="Nearby shops map"
                    src={mapIframeSrc}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] text-slate-500 dark:text-slate-400 px-4">
                    Hakuna data ya ramani bado. Hakikisha location yako
                    imepatikana na kuna maduka yenye coordinates.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RESULTS / LIST PANEL */}
          <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
            {loading && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Inatafuta bidhaa karibu na ulipo...
              </div>
            )}

            {!loading && sortedProducts.length === 0 && !error && (
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                Hakuna matokeo bado. Hakikisha location imewashwa kisha jaribu
                tena au panua radius.
              </div>
            )}

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              {paginatedProducts.map((product) => {
                const numericDistance = getNumericDistanceKm(product);
                const proximityScore = getProximityScore(
                  numericDistance,
                  minDistance,
                  maxDistance,
                );

                const sellerId = product.seller?.id;
                const shopName = product.seller?.business_name;

                const productImage = product.image_url || product.image || null;
                const shopImage =
                  product.seller?.shop_image_url || product.seller?.shop_image || null;
                const mainImage = productImage || shopImage;

                const city =
                  product.seller?.location?.city || product.city || null;

                const canShowOnMap =
                  product.latitude != null && product.longitude != null;

                const sellerLogo = product.seller?.logo_url ?? null;

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col"
                  >
                    <div className="relative mb-3">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-40 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500">
                          Hakuna picha
                        </div>
                      )}

                      {shopName && (
                        <div className="absolute left-2 top-2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-100 shadow-sm max-w-[75%]">
                          {sellerLogo && (
                            <img
                              src={sellerLogo}
                              alt={shopName}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          )}
                          <span className="truncate">{shopName}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold mb-1 text-sm line-clamp-2 text-slate-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 space-y-1">
                      {shopName && <div>Seller: {shopName}</div>}
                      {city && <div>Mji: {city}</div>}
                      {proximityScore !== null && (
                        <div>
                          Ukaribu:{" "}
                          <span className="font-semibold">
                            {proximityScore}/10
                          </span>{" "}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            (1 = karibu sana)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between text-[11px]">
                      <span className="font-bold text-sm text-orange-600 dark:text-orange-400">
                        {product.price} {product.currency}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <Link
                        to={`/products/${product.id}`}
                        className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        View details
                      </Link>

                      <div className="flex flex-wrap gap-2">
                        {sellerId && (
                          <Link
                            to={`/shops/${sellerId}`}
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Visit shop
                          </Link>
                        )}

                        {canShowOnMap && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectProductOnMap(product);
                                // kwenye simu, ukibonyeza pia ifungue modal mara moja
                                setIsMapModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Onyesha kwenye ramani
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNavigateToShop(product)}
                              className="px-3 py-1.5 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-400"
                            >
                              Anza safari
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination ya nearby – 10/10 per page */}
            {sortedProducts.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <MainFooter />

      {/* MOBILE MAP MODAL */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 lg:hidden">
          <div className="bg-slate-950 text-slate-100 w-full h-full max-w-md mx-auto rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold">
                  Ramani ya maduka karibu
                </h3>
                <p className="text-[11px] text-slate-400">
                  Unaoonekana kama dot ya “current location” kwenye ramani.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="text-xs text-slate-300 hover:text-white"
              >
                Funga
              </button>
            </div>

            <div className="flex-1 bg-slate-900">
              {mapIframeSrc ? (
                <iframe
                  title="Nearby shops map (mobile)"
                  src={mapIframeSrc}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[11px] text-slate-400 px-4">
                  Hakuna data ya ramani bado. Hakikisha location imepatikana na
                  kuna maduka yenye coordinates.
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenMapAll}
                disabled={!coords || !hasAnyCoords}
                className="flex-1 px-3 py-1.5 rounded-full bg-orange-500 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fungua Google Maps (maduka yote kwenye page hii)
              </button>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyProductsPage;
