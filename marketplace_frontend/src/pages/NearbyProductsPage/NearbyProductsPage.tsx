// src/pages/NearbyProductsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import axios from "axios";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";
import { useLanguage } from "../../contexts/LanguageContext";
import { getNearbyProductsPageTexts } from "./nearbyProductsPageTexts";

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

// ====== ERROR MESSAGE CONSTANTS (SW original) ======
const GEO_ERROR_NO_SUPPORT = "Browser wako hauna support ya geolocation.";
const GEO_ERROR_PERMISSION_DENIED =
  "Umezima ruhusa ya location. Tafadhali ruhusu location kwenye browser ya LINKER.";
const GEO_ERROR_GENERIC = "Imeshindikana kupata location ya kifaa.";
const GEO_ERROR_NEED_LOCATION_FIRST =
  "Hatukupata location ya kifaa chako bado. Hakikisha umeruhusu location kwenye kifaa chako na kwenye browser.";
const GEO_ERROR_NO_SHOP_COORDS =
  "Hatuna coordinates kamili za duka hili kwa sasa.";
const GEO_ERROR_INVALID_SHOP_COORDS =
  "Coordinates za duka hili sio sahihi.";
const GEO_ERROR_NO_COORDS_LIST =
  "Hatuna coordinates za maduka haya kwa sasa kuonyesha kwenye ramani.";

const API_ERROR_GENERIC = "Imeshindikana kutafuta bidhaa karibu.";

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

interface ShopChip {
  key: string;
  name: string;
  logo_url: string | null;
}

const NearbyProductsPage: React.FC = () => {
  const { language } = useLanguage();
  const texts = getNearbyProductsPageTexts(language);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [radius] = useState<number>(10); // km – tunaitumia kwa backend tu, hatuonyeshi user

  // searchInput = anachoandika kwenye box, searchTerm = kinachotumika kufilter baada ya kubonyeza Search
  const [searchInput, setSearchInput] = useState<string>("");
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

  // ====== GET BROWSER LOCATION (auto on mount) ======
  const askLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(GEO_ERROR_NO_SUPPORT);
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
          setLocationError(GEO_ERROR_PERMISSION_DENIED);
        } else {
          setLocationError(GEO_ERROR_GENERIC);
        }
      },
    );
  };

  // mara ya kwanza kabisa, jaribu kuchukua location moja kwa moja
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
          // Nearby page tunaMALIZA na radius – tunaituma hapa tu (user haioni)
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
          setError(API_ERROR_GENERIC);
        }
      } else {
        setError(API_ERROR_GENERIC);
      }
    } finally {
      setLoading(false);
    }
  };

  // kila tukipata coords mpya → tafuta karibu
  useEffect(() => {
    if (coords) {
      void fetchNearby({ lat: coords.lat, lng: coords.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, radius]);

  // ====== SEARCH (si auto – mpaka abofye Search) ======
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  // filter ndogo ya client-side kwa searchTerm (iliyothibitishwa kwa kubonyeza Search)
  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.seller?.business_name || "").toLowerCase().includes(term)
    );
  });

  // pangilia bidhaa kwa ukaribu (karibu → mbali) bila kumwonyesha user kilometa
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
      setLocationError(GEO_ERROR_NEED_LOCATION_FIRST);
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
      setLocationError(GEO_ERROR_NO_COORDS_LIST);
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
      setLocationError(GEO_ERROR_NEED_LOCATION_FIRST);
      return;
    }

    const lat = product.latitude;
    const lng = product.longitude;
    if (lat == null || lng == null) {
      setLocationError(GEO_ERROR_NO_SHOP_COORDS);
      return;
    }

    const latNum = typeof lat === "number" ? lat : parseFloat(lat);
    const lngNum = typeof lng === "number" ? lng : parseFloat(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setLocationError(GEO_ERROR_INVALID_SHOP_COORDS);
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

  const getLocationErrorText = () => {
    if (!locationError) return null;
    switch (locationError) {
      case GEO_ERROR_NO_SUPPORT:
        return texts.geolocationNoSupport;
      case GEO_ERROR_PERMISSION_DENIED:
        return texts.geolocationPermissionDenied;
      case GEO_ERROR_GENERIC:
        return texts.geolocationGenericError;
      case GEO_ERROR_NEED_LOCATION_FIRST:
        return texts.locationNeededForMap;
      case GEO_ERROR_NO_SHOP_COORDS:
        return texts.noCoordinatesForShop;
      case GEO_ERROR_INVALID_SHOP_COORDS:
        return texts.invalidCoordinatesForShop;
      case GEO_ERROR_NO_COORDS_LIST:
        return texts.noCoordinatesForList;
      default:
        return locationError;
    }
  };

  const getErrorText = () => {
    if (!error) return null;
    if (error === API_ERROR_GENERIC) {
      return texts.apiGenericError;
    }
    return error;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      {/* MAIN */}
      <main className="flex-1 max-w-6xl mx-auto py-6 px-4">
        {/* BACK LINK TOP */}
        <div className="mb-2">
          <Link
            to="/products"
            className="text-[11px] text-orange-600 hover:underline"
          >
            {texts.backToAllProducts}
          </Link>
        </div>

        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl font-semibold mb-1 text-slate-900 dark:text-slate-100">
              {texts.pageTitle}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              {texts.pageSubtitle}
            </p>
          </div>
        </div>

        {/* LOCATION & SEARCH BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-4 mb-6 space-y-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {texts.searchLabel}
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={texts.searchPlaceholder}
                className="w-full border rounded-full px-3 py-1.5 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold hover:bg-orange-400 shadow-sm"
              >
                {texts.searchButton}
              </button>

              {/* Button ya kufungua ramani kama modal kwa mobile */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                disabled={!coords && !hasAnyCoords}
                className="sm:hidden px-3 py-1.5 rounded-full border text-[11px] font-medium border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {texts.openMapMobileButton}
              </button>
            </div>
          </form>

          {getLocationErrorText() && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {getLocationErrorText()}
            </div>
          )}

          {getErrorText() && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {getErrorText()}
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
                    {texts.mapPanelTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {texts.mapPanelDescription}
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
                  {texts.mapOpenAllButton}
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
                    {texts.mapPanelNoData}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RESULTS / LIST PANEL */}
          <div className="lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
            {loading && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {texts.loadingText}
              </div>
            )}

            {!loading && sortedProducts.length === 0 && !error && (
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                {texts.noResultsText}
              </div>
            )}

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              {paginatedProducts.map((product) => {
                const sellerId = product.seller?.id;
                const shopName = product.seller?.business_name;

                const productImage = product.image_url || product.image || null;
                const shopImage =
                  product.seller?.shop_image_url ||
                  product.seller?.shop_image ||
                  null;
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
                        <div className="w-full h-44 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-44 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500">
                          {texts.noImage}
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
                      {shopName && (
                        <div>
                          {texts.sellerLabel}: {shopName}
                        </div>
                      )}
                      {city && (
                        <div>
                          {texts.cityLabel}: {city}
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
                        {texts.cardViewDetails}
                      </Link>

                      <div className="flex flex-wrap gap-2">
                        {sellerId && (
                          <Link
                            to={`/shops/${sellerId}`}
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            {texts.cardVisitShop}
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
                              {texts.cardShowOnMap}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNavigateToShop(product)}
                              className="px-3 py-1.5 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-400"
                            >
                              {texts.cardStartDirections}
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
                  {texts.paginationPrev}
                </button>
                <span>
                  {texts.paginationPageLabel(currentPage, totalPages)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {texts.paginationNext}
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
                  {texts.mobileMapTitle}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {texts.mobileMapSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="text-xs text-slate-300 hover:text-white"
              >
                {texts.mobileMapCloseTop}
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
                  {texts.mapPanelNoData}
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
                {texts.mapOpenAllButtonMobile}
              </button>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                {texts.mobileMapCloseBottom}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyProductsPage;
