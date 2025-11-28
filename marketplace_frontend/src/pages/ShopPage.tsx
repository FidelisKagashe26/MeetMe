// src/pages/ShopPage.tsx
import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import GoogleMapPreview, { type LatLng } from "../components/GoogleMapPreview";

interface ShopLocation {
  id: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;
}

interface ShopDetail {
  id: number;
  business_name: string;
  description: string;
  phone_number: string;
  is_verified: boolean;
  rating: string | number;
  total_sales: number;
  location?: ShopLocation | null;
}

// ====== PRODUCT IMAGE (GALLERY) ======
interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface ShopProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url?: string | null;
  image?: string | null;
  city?: string | null;
  is_active?: boolean;

  // gallery kutoka backend
  images?: ProductImage[];

  // likes info kutoka backend (optional)
  likes_count?: number;
  is_liked?: boolean;
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShopProduct[];
}

interface ProductLikeToggleResponse {
  id: number;
  product: number;
  is_liked: boolean;
  likes_count: number;
}

const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // likes state
  const [likeBusyId, setLikeBusyId] = useState<number | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);

  const loadShop = async () => {
    if (!id) {
      setError("Shop not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const shopRes = await apiClient.get<ShopDetail>(`/api/sellers/${id}/`);
      setShop(shopRes.data);

      const params = new URLSearchParams();
      params.set("seller_id", id);
      params.set("page", "1");
      params.set("page_size", "48");

      const productRes = await apiClient.get<PaginatedProductList>(
        `/api/products/?${params.toString()}`
      );
      setProducts(productRes.data.results || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load shop information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mapCenter: LatLng | null = (() => {
    if (!shop || !shop.location) return null;
    const { latitude, longitude } = shop.location;
    if (!latitude || !longitude) return null;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  })();

  const mapsUrl =
    shop && shop.location && shop.location.latitude && shop.location.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${shop.location.latitude},${shop.location.longitude}`
      : undefined;

  const shopName = shop?.business_name || "Shop";

  const ratingDisplay = (() => {
    if (!shop) return null;
    const n = Number(shop.rating);
    if (Number.isNaN(n)) return null;
    return n.toFixed(1);
  })();

  // ==== KUCHAGUA PICHA KUU KWA PRODUCT (kama ProductsPage) ====
  const getMainImage = (product: ShopProduct): string | null => {
    const primary =
      product.images?.find((img) => img.is_primary) ?? product.images?.[0];

    return (
      product.image_url ||
      product.image ||
      (primary ? primary.image_url || primary.image : null) ||
      null
    );
  };

  // ==== LIKE TOGGLE HANDLER ====
  const handleToggleLike = async (productId: number) => {
    if (!productId) return;
    setLikeError(null);
    setLikeBusyId(productId);

    try {
      const res = await apiClient.post<ProductLikeToggleResponse>(
        "/api/product-likes/toggle/",
        {
          product: productId,
        }
      );

      const { is_liked, likes_count } = res.data;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                is_liked,
                likes_count,
              }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      setLikeError(
        "Imeshindikana kubadilisha like. Hakikisha umeingia (login) kisha jaribu tena."
      );
    } finally {
      setLikeBusyId(null);
    }
  };

  // ==== CHAT HANDLER (chat seller kuhusu product) ====
  const handleOpenChat = (productId: number) => {
    if (!id) return;
    navigate(`/chat?product=${productId}&seller=${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Link
              to="/products"
              className="hover:text-orange-600 hover:underline"
            >
              Products
            </Link>
            <span>/</span>
            <span className="text-slate-700 line-clamp-1">{shopName}</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-[11px] text-slate-600 hover:underline"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading shop...</div>
        ) : error || !shop ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-100 p-4 text-sm text-red-600">
            {error || "Shop not found."}
          </div>
        ) : (
          <>
            {/* MAP + HERO */}
            <section className="mb-5">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                {mapCenter ? (
                  <GoogleMapPreview center={mapCenter} height="260px" />
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                    No map location available for this shop.
                  </div>
                )}

                {/* SHOP CARD OVER MAP */}
                <div className="absolute inset-x-3 bottom-3 md:bottom-4 flex flex-col md:flex-row justify-between gap-3 pointer-events-none">
                  <div className="pointer-events-auto bg-white/95 rounded-2xl shadow px-3 py-3 flex-1 min-w-[220px] max-w-lg">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                        {shopName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h1 className="text-sm font-semibold text-slate-900 line-clamp-1">
                            {shopName}
                          </h1>
                          {shop.is_verified && (
                            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2">
                          {shop.description}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                          {shop.location?.city && (
                            <span>{shop.location.city}</span>
                          )}
                          {shop.location?.country && (
                            <span>• {shop.location.country}</span>
                          )}
                          {ratingDisplay && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              Rating: {ratingDisplay} ★
                            </span>
                          )}
                          {shop.total_sales > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {shop.total_sales}+ sales
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-auto flex flex-col items-end gap-2">
                    {shop.phone_number && (
                      <a
                        href={`tel:${shop.phone_number}`}
                        className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold hover:bg-black"
                      >
                        Call shop
                      </a>
                    )}
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-full bg-white/95 border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* PRODUCTS GRID */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Products from {shopName}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Browse all items available in this shop.
                  </p>
                </div>
                <Link
                  to="/products"
                  className="text-[11px] text-orange-600 hover:underline"
                >
                  Back to all products
                </Link>
              </div>

              {likeError && (
                <div className="mb-2 text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {likeError}
                </div>
              )}

              {products.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-slate-200 p-4 text-[11px] text-slate-500">
                  This shop has no products listed yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((p) => {
                    const img = getMainImage(p);
                    const likesCount = p.likes_count ?? 0;
                    const isLiked = Boolean(p.is_liked);

                    return (
                      <article
                        key={p.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col overflow-hidden relative"
                      >
                        {/* LIKE BADGE / BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(p.id)}
                          disabled={likeBusyId === p.id}
                          className="absolute right-2 top-2 z-10 px-2 py-1 rounded-full bg-white/90 border border-slate-200 text-[11px] flex items-center gap-1 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <span
                            className={
                              isLiked
                                ? "text-red-500 text-sm"
                                : "text-slate-400 text-sm"
                            }
                          >
                            {isLiked ? "♥" : "♡"}
                          </span>
                          <span className="text-slate-700">{likesCount}</span>
                        </button>

                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-36 object-cover"
                          />
                        ) : (
                          <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                            No image
                          </div>
                        )}

                        <div className="p-3 flex flex-col gap-1 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {p.description}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-orange-600">
                              {p.price} {p.currency}
                            </span>
                            {p.is_active === false && (
                              <span className="text-[11px] text-red-500 font-semibold">
                                Hidden
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                            <Link
                              to={`/products/${p.id}`}
                              className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium hover:bg-black"
                            >
                              View details
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenChat(p.id)}
                              className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              Chat seller
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <MainFooter />
    </div>
  );
};

export default ShopPage;
