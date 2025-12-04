// src/pages/ProductsPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";

interface SellerUserMini {
  id: number;
  username: string;
  avatar_url?: string | null;
}

interface SellerMini {
  id: number;
  business_name: string;
  user?: SellerUserMini;
  logo_url?: string | null; // LOGO ya duka
}

interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string; // decimal kama string
  currency: string;

  image_url?: string | null;
  image?: string | null;

  distance_km?: string | number | null;
  city?: string | null;
  is_available?: boolean;
  shop_name?: string;
  seller_id?: number;
  seller?: SellerMini | null;
  latitude?: string | null;
  longitude?: string | null;

  images?: ProductImage[];
  likes_count?: number;
  is_liked_by_me?: boolean;
  is_liked?: boolean;
}

interface Coords {
  lat: number;
  lng: number;
}

interface ConversationCreateResponse {
  id: number;
}

/**
 * Helper: geuza distance_km (string/number/null) kuwa number safi au null
 */
const getNumericDistanceKm = (
  raw: string | number | null | undefined,
): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (Number.isNaN(raw)) return null;
    return raw;
  }
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const PAGE_SIZE = 20;

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [query, setQuery] = useState<string>("");
  const [locationText, setLocationText] = useState<string>("");

  // Geolocation (raw)
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Active filters (haya tunayoyatuma API)
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<string>("");
  const [activeCoords, setActiveCoords] = useState<Coords | null>(null);

  // Help panel
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Per-product loading states
  const [likeLoading, setLikeLoading] = useState<Record<number, boolean>>({});
  const [chatLoading, setChatLoading] = useState<Record<number, boolean>>({});

  /**
   * Helper: chukua picha kuu ya product
   */
  const getMainImage = (product: Product): string | null => {
    if (product.image_url) return product.image_url;
    if (product.image) return product.image;

    const primary =
      product.images?.find((img) => img.is_primary) ?? product.images?.[0];

    if (primary?.image_url) return primary.image_url;
    if (primary?.image) return primary.image;

    return null;
  };

  /**
   * Fetch products kutoka API
   *
   * MUHIMU:
   * - Tunatumia /api/products/ PEKE YAKE.
   * - Backend inarudisha ARRAY ya products (si {count, results}).
   * - Kama activeCoords ipo → tunatuma lat & lng KU-PANGA kwa distance
   *   (backend haifiltri kwa radius, ina-sort tu).
   */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {};

      if (activeQuery) params.search = activeQuery;
      if (activeLocation) params.location = activeLocation;
      if (activeCoords) {
        params.lat = activeCoords.lat;
        params.lng = activeCoords.lng;
      }

      const res = await apiClient.get<Product[]>("/api/products/", {
        params,
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load products. Please try again in a moment.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCoords, activeLocation, activeQuery]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  /**
   * Submit ya search form
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
    setActiveLocation(locationText.trim());
    setActiveCoords(coords); // kama kuna coords → sort by distance
  };

  /**
   * Geolocation
   */
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Your browser does not support geolocation.");
      return;
    }

    setGeoError(null);
    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nextCoords: Coords = { lat: latitude, lng: longitude };
        setCoords(nextCoords);

        if (!locationText) {
          setLocationText("Current location");
        }

        setGeoLoading(false);
      },
      (err) => {
        console.error(err);
        setGeoError("Could not get your location. Please try again.");
        setGeoLoading(false);
      },
    );
  };

  const handleClearLocation = () => {
    setCoords(null);
    setActiveCoords(null);
    setLocationText("");
    setActiveLocation("");
    setPage(1);
  };

  const handleClearAll = () => {
    setQuery("");
    setLocationText("");
    setCoords(null);
    setActiveQuery("");
    setActiveLocation("");
    setActiveCoords(null);
    setPage(1);
  };

  /**
   * Toggle like kwa product
   */
  const handleToggleLike = async (productId: number) => {
    if (!user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setLikeLoading((prev) => ({ ...prev, [productId]: true }));

    try {
      await apiClient.post("/api/product-likes/toggle/", {
        product_id: productId,
      });
      await fetchProducts();
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setLikeLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  /**
   * Fungua chat na seller wa product
   */
  const handleOpenChat = async (productId: number, sellerId?: number) => {
    if (!user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    if (!sellerId) {
      navigate(`/products/${productId}`);
      return;
    }

    setChatLoading((prev) => ({ ...prev, [productId]: true }));

    try {
      const res = await apiClient.post<ConversationCreateResponse>(
        "/api/conversations/",
        {
          seller_id: sellerId,
          product_id: productId,
        },
      );

      const conversationId = res.data.id;
      const params = new URLSearchParams();
      params.set("conversation", String(conversationId));
      params.set("product", String(productId));
      params.set("seller", String(sellerId));

      navigate(`/chat?${params.toString()}`);
    } catch (err) {
      console.error("Failed to open conversation", err);
      const params = new URLSearchParams();
      params.set("product", String(productId));
      if (sellerId) params.set("seller", String(sellerId));
      navigate(`/chat?${params.toString()}`);
    } finally {
      setChatLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // ======== CLIENT-SIDE PAGINATION (20/20) ========
  const count = products.length;

  const totalPages =
    count > 0 ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedProducts = products.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MainHeader />

      {/* TOP + SEARCH + HELP */}
      <section className="border-b border-slate-200/70 dark:border-slate-800 bg-linear-to-b from-orange-50/70 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-5 md:py-6">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                Marketplace products
              </h1>
              <p className="text-[11px] md:text-[12px] text-slate-500 dark:text-slate-400">
                Search items from different shops, chat in real time with
                sellers and place your orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Active products
                </span>
                <span className="text-lg font-extrabold text-orange-500">
                  {count}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
              >
                {showHelp ? "Hide help" : "Help"}
              </button>
            </div>
          </div>

          {/* HELP PANEL */}
          {showHelp && (
            <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/90 p-3 text-[11px] text-slate-600 dark:text-slate-300 shadow-sm">
              <p className="mb-1 font-semibold text-slate-800 dark:text-white">
                How this marketplace works
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Andika jina la bidhaa kwenye{" "}
                  <span className="font-semibold">
                    &quot;What are you looking for?&quot;
                  </span>
                </li>
                <li>
                  Tumia{" "}
                  <span className="font-semibold">
                    &quot;Where are you?&quot;
                  </span>{" "}
                  au{" "}
                  <span className="font-semibold">Use my location</span> kupata
                  bidhaa zilizo karibu nawe (backend inapanga kwa distance bila
                  limit ya radius).
                </li>
                <li>
                  Bofya{" "}
                  <span className="font-semibold">
                    View details &amp; order
                  </span>{" "}
                  kuona maelezo na kuanza oda.
                </li>
                <li>
                  Bofya <span className="font-semibold">Chat</span> kuanza{" "}
                  <span className="font-semibold">real-time chat</span> na
                  muuzaji.
                </li>
              </ul>
            </div>
          )}

          {/* SEARCH CARD */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-3 md:px-4 md:py-3 flex flex-col md:flex-row gap-3 items-stretch"
          >
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                What are you looking for?
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                placeholder="e.g. HP laptop, smartphone, sofa..."
              />
            </div>

            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Where are you?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="e.g. Dodoma, Sinza, Mlimani City..."
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                  className="whitespace-nowrap px-3 py-2 rounded-xl border border-orange-500 text-orange-600 dark:text-orange-400 text-[11px] font-medium bg-white dark:bg-slate-950 hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:opacity-60"
                >
                  {geoLoading ? "Detecting..." : "Use my location"}
                </button>
              </div>
              {coords && (
                <div className="mt-1 text-[10px] text-green-600 dark:text-emerald-400">
                  Location detected ✔ (lat: {coords.lat.toFixed(3)}, lng:{" "}
                  {coords.lng.toFixed(3)})
                </div>
              )}
              {geoError && (
                <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                  {geoError}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 shadow-sm"
              >
                Search
              </button>
            </div>
          </form>

          {/* FILTER ACTIONS */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {activeQuery || activeLocation || activeCoords ? (
              <>
                <span>Active filters:</span>
                {activeQuery && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    product: &quot;{activeQuery}&quot;
                  </span>
                )}
                {activeLocation && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    location: &quot;{activeLocation}&quot;
                  </span>
                )}
                {activeCoords && !activeLocation && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    using current location
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="ml-1 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Clear location
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Clear all
                </button>
              </>
            ) : (
              <span>No filters applied. Showing general products.</span>
            )}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
              {activeCoords ? "Products near you" : "Products on the marketplace"}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {count} product{count === 1 ? "" : "s"} found
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/40 p-2 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-dashed border-slate-200 dark:border-slate-700">
            No products found{" "}
            {activeQuery || activeLocation || activeCoords
              ? "for your current search."
              : "at the moment."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedProducts.map((product) => {
              const hasCoords = product.latitude && product.longitude;

              const distanceRaw = getNumericDistanceKm(product.distance_km);
              const distanceLabel =
                distanceRaw !== null
                  ? `~ ${distanceRaw.toFixed(1)} km away`
                  : null;

              const sellerId =
                product.seller_id ?? product.seller?.id ?? undefined;

              const shopName =
                product.shop_name ||
                product.seller?.business_name ||
                "Unknown shop";

              const mainImage = getMainImage(product);

              const isLiked =
                product.is_liked_by_me ?? product.is_liked ?? false;
              const likesCount = product.likes_count ?? 0;
              const isLikeBusy = !!likeLoading[product.id];
              const isChatBusy = !!chatLoading[product.id];

              const sellerLogo = product.seller?.logo_url ?? null;

              return (
                <article
                  key={product.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                >
                  <div className="relative">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-40 md:h-44 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 md:h-44 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                        No image
                      </div>
                    )}

                    {/* Shop badge - LOGO YA DUKA */}
                    <div className="absolute left-2 top-2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-100 shadow-sm max-w-[70%]">
                      {sellerLogo && (
                        <img
                          src={sellerLogo}
                          alt={shopName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                      <span className="truncate">{shopName}</span>
                    </div>

                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => void handleToggleLike(product.id)}
                      disabled={isLikeBusy}
                      className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium shadow-sm border border-slate-100 dark:border-slate-700 disabled:opacity-60"
                    >
                      <span
                        className={
                          isLiked
                            ? "text-red-500 text-xs"
                            : "text-slate-400 dark:text-slate-500 text-xs"
                        }
                      >
                        ♥
                      </span>
                      {likesCount > 0 && (
                        <span className="text-slate-700 dark:text-slate-100">
                          {likesCount}
                        </span>
                      )}
                    </button>

                    {/* Distance */}
                    {distanceLabel && hasCoords && (
                      <div className="absolute right-2 bottom-2 bg-slate-900/85 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                        {distanceLabel}
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {product.price} {product.currency}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-2">
                      {shopName && (
                        <span className="font-medium text-slate-600 dark:text-slate-200">
                          {shopName}
                        </span>
                      )}
                      {product.city && <span>{product.city}</span>}
                      {product.is_available === false && (
                        <span className="text-red-500 font-semibold">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex gap-2">
                        <Link
                          to={`/products/${product.id}`}
                          className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium hover:bg-black dark:hover:bg-slate-200 text-[11px]"
                        >
                          View details &amp; order
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            void handleOpenChat(product.id, sellerId)
                          }
                          disabled={isChatBusy}
                          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isChatBusy ? "Opening..." : "Chat"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {sellerId && (
                          <Link
                            to={`/shops/${sellerId}`}
                            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Visit shop
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Client-side pagination – 20/20 per page */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <button
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
      </main>

      <MainFooter />
    </div>
  );
};

export default ProductsPage;
