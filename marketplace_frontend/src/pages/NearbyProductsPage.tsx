// src/pages/NearbyProductsPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import axios from "axios";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface SellerLite {
  id?: number;
  business_name: string;
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
  distance?: string | null;
  distance_km?: string | null;
  seller?: SellerLite;
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

// backend anaweza kurudisha list tu au paginated
type NearbyResponse = Product[] | PaginatedProductList;

// query params kwa /api/products/nearby/
interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  // location?: string; // kama utataka baadaye
}

const NearbyProductsPage: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radius, setRadius] = useState<number>(10); // km
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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
            "Umezima ruhusa ya location. Fungua settings za browser kuruhusu location kwa LINKA."
          );
        } else {
          setLocationError("Imeshindikana kupata location ya kifaa.");
        }
      }
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
      const res = await apiClient.get<NearbyResponse>("/api/products/nearby/", {
        params: {
          lat: params.lat,
          lng: params.lng,
          radius: params.radius ?? radius,
          limit: params.limit ?? 30,
        },
      });

      let dataProducts: Product[] = [];

      if (Array.isArray(res.data)) {
        dataProducts = res.data;
      } else if ("results" in res.data) {
        dataProducts = res.data.results;
      }

      setProducts(dataProducts);
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

  // kila tukipata coords mpya → tafuta karibu
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      {/* MAIN */}
      <main className="flex-1 max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              Bidhaa karibu na ulipo
            </h2>
            <p className="text-xs text-slate-600">
              Tunatumia location ya kifaa chako (GPS / browser) kuonyesha bidhaa
              za karibu.
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
        <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={askLocation}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black"
              >
                Tumia location yangu
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <label htmlFor="radius" className="whitespace-nowrap">
                  Radius:
                </label>
                <select
                  id="radius"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  className="border rounded px-2 py-1 text-[11px]"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>

              {coords && (
                <div className="text-[11px] text-slate-400">
                  Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                </div>
              )}
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tafuta ndani ya matokeo (jina la bidhaa / duka)..."
                className="w-full border rounded-full px-3 py-1.5 text-[11px]"
              />
            </div>
          </div>

          {locationError && (
            <div className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded">
              {locationError}
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* RESULTS */}
        <div>
          {loading && (
            <div className="text-xs text-slate-500 mb-2">
              Inatafuta bidhaa karibu na ulipo...
            </div>
          )}

          {!loading && filteredProducts.length === 0 && !error && (
            <div className="text-xs text-slate-500">
              Hakuna matokeo bado. Hakikisha location imewashwa kisha jaribu
              tena.
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const distanceValue =
                product.distance_km ?? product.distance ?? null;
              const sellerId = product.seller?.id;
              const shopName = product.seller?.business_name;
              const mainImage = product.image_url || product.image || null;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex flex-col"
                >
                  {mainImage && (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-semibold mb-1 text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="text-[11px] text-slate-500 mb-2 space-y-1">
                    {shopName && <div>Seller: {shopName}</div>}
                    {distanceValue && <div>Distance: {distanceValue} km</div>}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-[11px]">
                    <span className="font-bold text-sm">
                      {product.price} {product.currency}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                    <Link
                      to={`/products/${product.id}`}
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium hover:bg-black"
                    >
                      View details
                    </Link>
                    {sellerId && (
                      <Link
                        to={`/shops/${sellerId}`}
                        className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Visit shop
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default NearbyProductsPage;
