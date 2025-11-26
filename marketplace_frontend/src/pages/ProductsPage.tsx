// src/pages/ProductsPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface SellerMini {
  id: number;
  business_name: string;
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
  price: string; // decimal as string
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

  // gallery from backend
  images?: ProductImage[];
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

interface Coords {
  lat: number;
  lng: number;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // FORM
  const [query, setQuery] = useState<string>("");
  const [locationText, setLocationText] = useState<string>("");

  // Geolocation
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Active filters
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<string>("");
  const [activeCoords, setActiveCoords] = useState<Coords | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // Help panel
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));

      if (activeQuery) {
        params.set("search", activeQuery);
      }

      if (activeLocation) {
        params.set("location", activeLocation);
      }

      let url: string;

      if (activeCoords) {
        params.set("lat", String(activeCoords.lat));
        params.set("lng", String(activeCoords.lng));
        url = `/api/products/nearby/?${params.toString()}`;
      } else {
        url = `/api/products/?${params.toString()}`;
      }

      const res = await apiClient.get<PaginatedProductList>(url);
      setProducts(res.data.results);
      setCount(res.data.count);
    } catch (err) {
      console.error(err);
      setError("Failed to load products. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeQuery, activeLocation, activeCoords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
    setActiveLocation(locationText.trim());
    setActiveCoords(coords);
  };

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
        const nextCoords = { lat: latitude, lng: longitude };
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
      }
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

  // ==== KUCHAGUA PICHA KUU YA PRODUCT ====
  const getMainImage = (product: Product): string | null => {
    // Chukua primary image kama ipo, vinginevyo ya kwanza tu
    const primary =
      product.images?.find((img) => img.is_primary) ?? product.images?.[0];

    return (
      product.image_url ||
      product.image ||
      (primary ? primary.image_url || primary.image : null) ||
      null
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      {/* TOP + SEARCH + HELP */}
      <section className="border-b border-slate-200 bg-linear-to-b from-orange-50/60 to-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 py-5 md:py-6">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-base md:text-lg font-semibold text-slate-900">
                Marketplace products
              </h1>
              <p className="text-[11px] md:text-[12px] text-slate-500">
                Search items from different shops, you decide how to filter.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-slate-400">
                  Active products
                </span>
                <span className="text-lg font-bold text-orange-500">
                  {count}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="px-3 py-1.5 rounded-full border border-slate-300 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {showHelp ? "Hide help" : "Help"}
              </button>
            </div>
          </div>

          {/* HELP PANEL (imehamishwa hapa badala ya kujaa juu kabisa) */}
          {showHelp && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-3 text-[11px] text-slate-600 shadow-sm">
              <p className="mb-1 font-medium text-slate-800">
                How this marketplace works
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Type product name kwenye{" "}
                  <span className="font-semibold">
                    "What are you looking for?"
                  </span>
                </li>
                <li>
                  Tumia{" "}
                  <span className="font-semibold">"Where are you?"</span> au{" "}
                  <span className="font-semibold">"Use my location"</span> kupata
                  products zilizo karibu.
                </li>
                <li>
                  Bofya <span className="font-semibold">"Visit shop"</span> kufungua
                  shop yote, au{" "}
                  <span className="font-semibold">"Map"</span> kufungua Google
                  Maps.
                </li>
                <li>
                  Tumia <span className="font-semibold">"Clear location"</span> au{" "}
                  <span className="font-semibold">"Clear all"</span> kuondoa
                  filters na kuanza upya.
                </li>
              </ul>
            </div>
          )}

          {/* SEARCH CARD */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 px-3 py-3 md:px-4 md:py-3 flex flex-col md:flex-row gap-3 items-stretch"
          >
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 mb-1">
                What are you looking for?
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                placeholder="e.g. HP laptop, smartphone, sofa..."
              />
            </div>

            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 mb-1">
                Where are you?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="e.g. Dodoma, Sinza, Mlimani City..."
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                  className="whitespace-nowrap px-3 py-2 rounded-xl border border-orange-500 text-orange-600 text-[11px] font-medium hover:bg-orange-50 disabled:opacity-60"
                >
                  {geoLoading ? "Detecting..." : "Use my location"}
                </button>
              </div>
              {coords && (
                <div className="mt-1 text-[10px] text-green-600">
                  Location detected ✔ (lat: {coords.lat.toFixed(3)}, lng:{" "}
                  {coords.lng.toFixed(3)})
                </div>
              )}
              {geoError && (
                <div className="mt-1 text-[10px] text-red-600">{geoError}</div>
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {activeQuery || activeLocation || activeCoords ? (
              <>
                <span>Active filters:</span>
                {activeQuery && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    product: "{activeQuery}"
                  </span>
                )}
                {activeLocation && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    location: "{activeLocation}"
                  </span>
                )}
                {activeCoords && !activeLocation && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    using current location
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="ml-1 px-2 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Clear location
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
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
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              {activeCoords ? "Products near you" : "Products on the marketplace"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {count} product{count === 1 ? "" : "s"} found
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-600">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-slate-600 bg-white p-4 rounded-lg shadow-sm border border-dashed border-slate-200">
            No products found{" "}
            {activeQuery || activeLocation
              ? "for your current search."
              : "at the moment."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((product) => {
              const hasCoords = product.latitude && product.longitude;

              const mapsUrl = hasCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${product.latitude},${product.longitude}`
                : undefined;

              const distanceRaw =
                product.distance_km !== undefined && product.distance_km !== null
                  ? Number(product.distance_km)
                  : null;
              const distanceLabel =
                distanceRaw !== null && !Number.isNaN(distanceRaw)
                  ? `~ ${distanceRaw.toFixed(1)} km away`
                  : null;

              const sellerId =
                product.seller_id ?? product.seller?.id ?? undefined;

              const shopName =
                product.shop_name ||
                product.seller?.business_name ||
                "Unknown shop";

              const mainImage = getMainImage(product);

              return (
                <article
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                >
                  <div className="relative">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-40 md:h-44 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 md:h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        No image
                      </div>
                    )}
                    <div className="absolute left-2 top-2 bg-white/90 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm line-clamp-1 max-w-[80%]">
                      {shopName}
                    </div>
                    {distanceLabel && (
                      <div className="absolute right-2 bottom-2 bg-slate-900/85 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                        {distanceLabel}
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-orange-600">
                        {product.price} {product.currency}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400 flex flex-wrap gap-x-2">
                      {shopName && (
                        <span className="font-medium text-slate-600">
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
                      <Link
                        to={`/products/${product.id}`}
                        className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium hover:bg-black text-[11px]"
                      >
                        View details &amp; order
                      </Link>

                      <div className="flex items-center gap-1">
                        {sellerId && (
                          <Link
                            to={`/shops/${sellerId}`}
                            className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            Visit shop
                          </Link>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-full border border-orange-400 text-orange-600 hover:bg-orange-50"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-full border bg-white disabled:opacity-50 hover:bg-slate-50"
            >
              Prev
            </button>
            <span className="text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-full border bg-white disabled:opacity-50 hover:bg-slate-50"
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
