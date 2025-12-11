// src/pages/ProductDetailPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getProductDetailPageTexts } from "./ProductDetailPageTexts";
import GoogleMapPreview, { type LatLng } from "../../components/GoogleMapPreview";

interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface CategoryMini {
  id: number;
  name: string;
}

interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url?: string | null;
  image?: string | null;
  distance_km?: number | string | null;
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

  // category info (kutoka API: Product.category: Category)
  category?: CategoryMini | null;
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

  seller_id?: number;
  seller?: {
    id: number;
    business_name?: string;
  } | null;

  category?: CategoryMini | null;
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: SuggestionProduct[];
}

type SuggestionsApiResponse = SuggestionProduct[] | PaginatedProductList;

type CategoryFilterValue = "all" | "uncategorized" | number;

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { language } = useLanguage();
  const texts = getProductDetailPageTexts(language);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] =
    useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterValue>("all");

  const fetchProduct = async () => {
    if (!id) {
      setError(texts.productNotFound);
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
      setError(texts.failedToLoadProduct);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // reset category filter when product changes
  useEffect(() => {
    setSelectedCategory("all");
  }, [product?.id]);

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

        const res = await apiClient.get<SuggestionsApiResponse>(
          `/api/products/?${params.toString()}`,
        );

        let all: SuggestionProduct[] = [];

        if (Array.isArray(res.data)) {
          all = res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
          all = res.data.results;
        }

        // hakikisha products ni za duka husika tu
        const sameShop = all.filter(
          (p) =>
            (p.seller_id !== undefined && p.seller_id === sellerId) ||
            (p.seller && p.seller.id === sellerId),
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

  // categories kutoka kwa product + suggestions za duka hili
  const categoriesFromShop: CategoryMini[] = useMemo(() => {
    const map = new Map<number, CategoryMini>();

    if (product?.category) {
      map.set(product.category.id, {
        id: product.category.id,
        name: product.category.name,
      });
    }

    for (const sp of suggestions) {
      if (sp.category) {
        map.set(sp.category.id, {
          id: sp.category.id,
          name: sp.category.name,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [product, suggestions]);

  const hasUncategorized = useMemo(
    () =>
      (!!product && !product.category) ||
      suggestions.some((sp) => !sp.category),
    [product, suggestions],
  );

  const visibleSuggestions = useMemo(() => {
    if (selectedCategory === "all") return suggestions;
    if (selectedCategory === "uncategorized") {
      return suggestions.filter((sp) => !sp.category);
    }
    return suggestions.filter(
      (sp) => sp.category && sp.category.id === selectedCategory,
    );
  }, [selectedCategory, suggestions]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <MainHeader />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {texts.loadingProduct}
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <MainHeader />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-red-100 dark:border-red-500/40 p-4 text-sm text-red-600 dark:text-red-400">
            {error || texts.productNotFound}
          </div>
          <div className="mt-4">
            <Link
              to="/products"
              className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              ← {texts.backToProducts}
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
    const raw = product.distance_km;
    if (raw === undefined || raw === null) {
      return null;
    }
    const n =
      typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(n)) return null;
    return texts.distanceLabel(n);
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MainHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-5">
        {/* Breadcrumb */}
        <div className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Link
            to="/products"
            className="hover:text-orange-600 dark:hover:text-orange-400 hover:underline"
          >
            {texts.breadcrumbProducts}
          </Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-200 line-clamp-1">
            {product.name}
          </span>
        </div>

        {/* MAP + SHOP HERO */}
        {mapCenter && (
          <section className="mb-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 relative">
              <GoogleMapPreview center={mapCenter} height="230px" />
              <div className="absolute inset-x-3 bottom-3 md:bottom-4 flex flex-col md:flex-row justify-between gap-3 pointer-events-none">
                <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow px-3 py-2 text-[11px] min-w-[200px] max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-semibold">
                      {shopName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {shopName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {product.shop_address ||
                          product.city ||
                          texts.locationFallback}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    {product.shop_phone && (
                      <span>
                        {texts.phoneLabel}:{" "}
                        <a
                          href={`tel:${product.shop_phone}`}
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          {product.shop_phone}
                        </a>
                      </span>
                    )}
                    {distanceDisplay && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
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
                      className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold hover:bg-black dark:hover:bg-white"
                    >
                      {texts.openInGoogleMaps}
                    </a>
                  )}
                  {sellerId && (
                    <Link
                      to={`/shops/${sellerId}`}
                      className="px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {texts.visitFullShop}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MAIN CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex flex-col md:flex-row w-full">
            {/* IMAGE SIDE */}
            <div className="shrink-0 bg-slate-100 dark:bg-slate-800 md:border-r md:border-slate-200 dark:md:border-slate-700 flex items-center justify-center">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="h-96 object-contain"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                  {texts.noImageAvailable}
                </div>
              )}
            </div>

            {/* DETAILS SIDE */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-3">
              {/* Title / Price */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                    {product.name}
                  </h1>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {texts.priceLabel}
                    </div>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {product.price} {product.currency}
                    </div>
                  </div>
                </div>
                {product.is_available === false && (
                  <div className="mt-1 inline-flex items-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-medium">
                    {texts.outOfStock}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {texts.descriptionTitle}
                </h2>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Shop info + location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="border rounded-xl border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-950/40">
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    {texts.shopInfoTitle}
                  </h3>
                  <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                    {shopName && (
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {shopName}
                      </div>
                    )}
                    {product.shop_address && (
                      <div>{product.shop_address}</div>
                    )}
                    {product.city && <div>{product.city}</div>}
                    {product.shop_phone && (
                      <div>
                        {texts.phoneLabel}:{" "}
                        <a
                          href={`tel:${product.shop_phone}`}
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          {product.shop_phone}
                        </a>
                      </div>
                    )}
                    {product.shop_email && (
                      <div>
                        {texts.emailLabel}:{" "}
                        <a
                          href={`mailto:${product.shop_email}`}
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          {product.shop_email}
                        </a>
                      </div>
                    )}
                    {distanceDisplay && (
                      <div className="text-slate-500 dark:text-slate-400">
                        {distanceDisplay}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-xl border-orange-100 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/5 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {texts.locationDirectionsTitle}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {texts.locationDirectionsDescription}
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
                        {texts.getDirections}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 inline-flex justify-center items-center px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] cursor-not-allowed"
                      >
                        {texts.directionsUnavailable}
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
                  className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-black dark:hover:bg-white disabled:opacity-60"
                >
                  {user
                    ? texts.placeOrderLoggedIn
                    : texts.loginToPlaceOrder}
                </button>

                <Link
                  to="/products"
                  className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {texts.backToProducts}
                </Link>

                {sellerId && (
                  <Link
                    to={`/shops/${sellerId}`}
                    className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {texts.visitFullShop}
                  </Link>
                )}

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {texts.startNavigation}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* OTHER PRODUCTS FROM THIS SHOP */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {texts.moreFromShopTitle(shopName)}
            </h3>
            {sellerId && (
              <Link
                to={`/shops/${sellerId}`}
                className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
              >
                {texts.viewAllProductsFromShop}
              </Link>
            )}
          </div>

          {/* Category filters */}
          {(categoriesFromShop.length > 0 || hasUncategorized) && (
            <div className="mb-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {texts.categoriesTitle}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                {texts.categoriesFromThisShopLabel}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={
                    "px-3 py-1.5 rounded-full border text-[11px] " +
                    (selectedCategory === "all"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800")
                  }
                >
                  {texts.categoriesAllLabel}
                </button>

                {categoriesFromShop.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={
                      "px-3 py-1.5 rounded-full border text-[11px] " +
                      (selectedCategory === cat.id
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800")
                    }
                  >
                    {cat.name}
                  </button>
                ))}

                {hasUncategorized && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("uncategorized")}
                    className={
                      "px-3 py-1.5 rounded-full border text-[11px] " +
                      (selectedCategory === "uncategorized"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800")
                    }
                  >
                    {texts.categoriesUncategorizedLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {loadingSuggestions ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {texts.loadingOtherProducts}
            </div>
          ) : visibleSuggestions.length === 0 ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedCategory === "all"
                ? texts.noOtherProducts
                : texts.noOtherProductsForCategory}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {visibleSuggestions.map((sp) => {
                const image = getSuggestionImage(sp);
                return (
                  <article
                    key={sp.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={sp.name}
                        className="w-full h-40 md:h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 md:h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[11px]">
                        {texts.suggestionNoImage}
                      </div>
                    )}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {sp.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {sp.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {sp.price} {sp.currency}
                        </span>
                        <Link
                          to={`/products/${sp.id}`}
                          className="text-[11px] text-slate-700 dark:text-slate-100 hover:underline"
                        >
                          {texts.suggestionViewLabel}
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
