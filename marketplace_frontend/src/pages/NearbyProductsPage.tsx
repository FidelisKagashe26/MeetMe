// src/pages/NearbyProductsPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
// import { useAuth } from "../contexts/AuthContext";
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

type NearbyResponse = Product[] | PaginatedProductList;

interface NearbySearchPayload {
  latitude: string;
  longitude: string;
  radius: number;
  sort_by: "distance" | "price" | "rating";
  category?: string;
  min_price?: string;
  max_price?: string;
}

const NearbyProductsPage: React.FC = () => {
  // const { user } = useAuth();

  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [radius, setRadius] = useState<string>("10");
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<"distance" | "price" | "rating">(
    "distance"
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProducts([]);

    const payload: NearbySearchPayload = {
      latitude,
      longitude,
      radius: radius ? parseInt(radius, 10) : 10,
      sort_by: sortBy,
    };

    if (category.trim()) payload.category = category.trim();
    if (minPrice.trim()) payload.min_price = minPrice.trim();
    if (maxPrice.trim()) payload.max_price = maxPrice.trim();

    try {
      const res = await apiClient.post<NearbyResponse>(
        "/api/products/search_nearby/",
        payload
      );

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
          setError("Failed to search nearby products.");
        }
      } else {
        setError("Failed to search nearby products.");
      }
    } finally {
      setLoading(false);
    }
  };

  // if (!user) {
  //   return (
  //     <div className="min-h-screen flex flex-col bg-slate-50">
  //       <MainHeader />
  //       <main className="flex-1 flex items-center justify-center px-4">
  //         <div className="bg-white rounded-lg shadow p-4 text-sm">
  //           You must be logged in to search nearby products.
  //         </div>
  //       </main>
  //       <MainFooter />
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      {/* MAIN */}
      <main className="flex-1 max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              Search Nearby Products
            </h2>
            <p className="text-xs text-slate-600">
              Weka location (latitude &amp; longitude) ya user, radius na
              optional filters kisha system itarudisha bidhaa zilizo karibu.
            </p>
          </div>
          <Link
            to="/products"
            className="text-[11px] text-orange-600 hover:underline"
          >
            ← Back to products
          </Link>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-4 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">Latitude *</label>
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="-6.1630"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Longitude *</label>
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="35.7516"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">
                Radius (km) <span className="text-slate-400">(default 10)</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">
                Category <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g. Laptops"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">
                Min price <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">
                Max price <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="2000000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "distance" | "price" | "rating")
                }
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="distance">Distance</option>
                <option value="price">Price</option>
                <option value="rating">Seller rating</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search nearby"}
            </button>
          </div>

          {error && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </form>

        {/* RESULTS */}
        <div>
          {loading && <div className="text-xs">Loading results...</div>}

          {!loading && products.length === 0 && !error && (
            <div className="text-xs text-slate-500">
              Hakuna matokeo bado, jaribu kutafuta.
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
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
