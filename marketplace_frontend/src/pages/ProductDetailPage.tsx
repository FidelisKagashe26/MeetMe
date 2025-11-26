// src/pages/ProductDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import GoogleMapPreview, { type LatLng } from "../components/GoogleMapPreview";

interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url?: string | null;
  image?: string | null;
  distance_km?: number | string;
  city?: string;
  is_available?: boolean;
  shop_name?: string;
  seller_id?: number;
  seller?: {
    id: number;
    business_name: string;
  } | null;
  latitude?: string;
  longitude?: string;

  // optional extra shop info
  shop_phone?: string;
  shop_email?: string;
  shop_address?: string;

  // gallery
  images?: ProductImage[];
}

interface SuggestionProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url?: string | null;
  image?: string | null;
  city?: string | null;
  is_available?: boolean;
  images?: ProductImage[];

  // muhimu ili tuchuje products za duka husika tu
  seller_id?: number;
  seller?: {
    id: number;
    business_name?: string;
  } | null;
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: SuggestionProduct[];
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] =
    useState<boolean>(false);

  const fetchProduct = async () => {
    if (!id) {
      setError("Product not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<ProductDetail>(`/api/products/${id}/`);
      setProduct(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load product details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load suggested products from the same shop
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!product) return;

      const sellerId = product.seller_id ?? product.seller?.id;
      if (!sellerId) return;

      setLoadingSuggestions(true);
      try {
        const params = new URLSearchParams();
        params.set("seller_id", String(sellerId));
        params.set("page", "1");
        params.set("page_size", "8");
        // backend anaweza kupuuza "exclude"
        params.set("exclude", String(product.id));

        const res = await apiClient.get<PaginatedProductList>(
          `/api/products/?${params.toString()}`
        );

        const all = res.data.results || [];

        // 🔐 MUHIMU: hakikisha hapa tunabaki na products za duka husika TU
        const sameShop = all.filter(
          (p) =>
            (p.seller_id !== undefined && p.seller_id === sellerId) ||
            (p.seller && p.seller.id === sellerId)
        );

        // ondoa product inayotazamwa sasa
        const others = sameShop.filter((p) => p.id !== product.id);

        setSuggestions(others);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    void loadSuggestions();
  }, [product]);

  const handlePlaceOrder = () => {
    if (!product) return;

    if (!user) {
      navigate(`/login?next=/products/${product.id}`);
      return;
    }

    navigate(`/orders/new?product=${product.id}`);
  };

  const getMainImage = (p: ProductDetail): string | null => {
    const primary =
      p.images?.find((img) => img.is_primary) ?? p.images?.[0];

    return (
      p.image_url ||
      p.image ||
      (primary ? primary.image_url || primary.image : null) ||
      null
    );
  };

  const getSuggestionImage = (p: SuggestionProduct): string | null => {
    const primary =
      p.images?.find((img) => img.is_primary) ?? p.images?.[0];

    return (
      p.image_url ||
      p.image ||
      (primary ? primary.image_url || primary.image : null) ||
      null
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <MainHeader />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
          <div className="text-sm text-slate-600">Loading product...</div>
        </main>
        <MainFooter />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <MainHeader />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-red-100 p-4 text-sm text-red-600">
            {error || "Product not found."}
          </div>
          <div className="mt-4">
            <Link
              to="/products"
              className="inline-flex items-center text-xs text-orange-600 hover:underline"
            >
              ← Back to products
            </Link>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  const hasCoords = product.latitude && product.longitude;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${product.latitude},${product.longitude}`
    : undefined;

  const mapCenter: LatLng | null = (() => {
    if (!hasCoords) return null;
    const lat = parseFloat(product.latitude as string);
    const lng = parseFloat(product.longitude as string);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  })();

  const sellerId = product.seller_id ?? product.seller?.id;
  const shopName =
    product.shop_name || product.seller?.business_name || "Shop";

  const mainImage = getMainImage(product);

  const distanceDisplay = (() => {
    if (product.distance_km === undefined || product.distance_km === null) {
      return null;
    }
    const n = Number(product.distance_km);
    if (Number.isNaN(n)) return null;
    return `${n.toFixed(1)} km from you`;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-5">
        {/* Breadcrumb */}
        <div className="mb-3 text-[11px] text-slate-500 flex items-center gap-1">
          <Link to="/products" className="hover:text-orange-600 hover:underline">
            Products
          </Link>
          <span>/</span>
          <span className="text-slate-700 line-clamp-1">{product.name}</span>
        </div>

        {/* MAP + SHOP HERO */}
        {mapCenter && (
          <section className="mb-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
              <GoogleMapPreview center={mapCenter} height="230px" />
              <div className="absolute inset-x-3 bottom-3 md:bottom-4 flex flex-col md:flex-row justify-between gap-3 pointer-events-none">
                <div className="pointer-events-auto bg-white/95 rounded-2xl shadow px-3 py-2 text-[11px] min-w-[200px] max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                      {shopName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {shopName}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        {product.shop_address || product.city || "Location"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {product.shop_phone && (
                      <span>
                        Phone:{" "}
                        <a
                          href={`tel:${product.shop_phone}`}
                          className="text-orange-600 hover:underline"
                        >
                          {product.shop_phone}
                        </a>
                      </span>
                    )}
                    {distanceDisplay && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {distanceDisplay}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pointer-events-auto flex flex-col items-end gap-2">
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold hover:bg-black"
                    >
                      Open in Google Maps
                    </a>
                  )}
                  {sellerId && (
                    <Link
                      to={`/shops/${sellerId}`}
                      className="px-3 py-1.5 rounded-full bg-white/95 border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      Visit full shop
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MAIN CARD: image kushoto (desktop), details kulia */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* desktop: columns, mobile: stack */}
          <div className="flex flex-col md:flex-row w-full">
            {/* IMAGE SIDE */}
            <div className="shrink-0 bg-slate-100 md:border-r md:border-slate-200">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="h-96 object-contain"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-slate-400 text-xs">
                  No image available
                </div>
              )}
            </div>

            {/* DETAILS SIDE */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-3">
              {/* Title / Price */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-base md:text-lg font-semibold text-slate-900">
                    {product.name}
                  </h1>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">
                      Price
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {product.price} {product.currency}
                    </div>
                  </div>
                </div>
                {product.is_available === false && (
                  <div className="mt-1 inline-flex items-center rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[10px] font-medium">
                    Out of stock
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xs font-semibold text-slate-800 mb-1">
                  Description
                </h2>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Shop info + location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="border rounded-xl border-slate-200 p-3">
                  <h3 className="text-xs font-semibold text-slate-800 mb-1">
                    Shop information
                  </h3>
                  <div className="space-y-0.5 text-slate-600">
                    {shopName && (
                      <div className="font-medium text-slate-800">
                        {shopName}
                      </div>
                    )}
                    {product.shop_address && (
                      <div>{product.shop_address}</div>
                    )}
                    {product.city && <div>{product.city}</div>}
                    {product.shop_phone && (
                      <div>
                        Phone:{" "}
                        <a
                          href={`tel:${product.shop_phone}`}
                          className="text-orange-600 hover:underline"
                        >
                          {product.shop_phone}
                        </a>
                      </div>
                    )}
                    {product.shop_email && (
                      <div>
                        Email:{" "}
                        <a
                          href={`mailto:${product.shop_email}`}
                          className="text-orange-600 hover:underline"
                        >
                          {product.shop_email}
                        </a>
                      </div>
                    )}
                    {distanceDisplay && (
                      <div className="text-slate-500">{distanceDisplay}</div>
                    )}
                  </div>
                </div>

                <div className="border rounded-xl border-orange-100 bg-orange-50/40 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 mb-1">
                      Location &amp; directions
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      See the shop on Google Maps and start navigation from your
                      current location.
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex justify-center items-center px-3 py-1.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold hover:bg-orange-600"
                      >
                        Get directions
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 inline-flex justify-center items-center px-3 py-1.5 rounded-full bg-slate-200 text-slate-500 text-[11px] cursor-not-allowed"
                      >
                        Directions unavailable
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={product.is_available === false}
                  className="px-4 py-2 rounded-full bg-slate-900 text-white font-semibold hover:bg-black disabled:opacity-60"
                >
                  {user ? "Place order" : "Login to place order"}
                </button>

                <Link
                  to="/products"
                  className="px-3 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Back to products
                </Link>
                {sellerId && (
                  <Link
                    to={`/shops/${sellerId}`}
                    className="px-3 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Visit full shop
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* OTHER PRODUCTS FROM THIS SHOP */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              More from {shopName}
            </h3>
            {sellerId && (
              <Link
                to={`/shops/${sellerId}`}
                className="text-[11px] text-orange-600 hover:underline"
              >
                View all products from this shop →
              </Link>
            )}
          </div>

          {loadingSuggestions ? (
            <div className="text-[11px] text-slate-500">
              Loading other products...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-[11px] text-slate-500">
              This shop has no other products listed yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {suggestions.map((sp) => {
                const image = getSuggestionImage(sp);
                return (
                  <article
                    key={sp.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={sp.name}
                        className="w-full h-40 md:h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 md:h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-[11px]">
                        No image
                      </div>
                    )}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {sp.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {sp.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-orange-600">
                          {sp.price} {sp.currency}
                        </span>
                        <Link
                          to={`/products/${sp.id}`}
                          className="text-[11px] text-slate-700 hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <MainFooter />
    </div>
  );
};

export default ProductDetailPage;
