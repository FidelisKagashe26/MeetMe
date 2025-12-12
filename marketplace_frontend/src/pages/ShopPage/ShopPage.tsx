// src/pages/ShopPage/ShopPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";
import GoogleMapPreview, { type LatLng } from "../../components/GoogleMapPreview";
import { useLanguage } from "../../contexts/LanguageContext";
import { getShopPageTexts } from "./ShopPageTexts";

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

  logo?: string | null;
  logo_url?: string | null;
  shop_image?: string | null;
  shop_image_url?: string | null;
}

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

  images?: ProductImage[];

  likes_count?: number;
  is_liked?: boolean;

  category?: CategoryMini | null;
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

type CategoryFilterValue = "all" | "uncategorized" | number;

// ====== HELPERS ======
const getShopCoverImage = (shop: ShopDetail | null): string | null => {
  if (!shop) return null;
  return shop.shop_image_url || shop.shop_image || null;
};

const getShopLogoImage = (shop: ShopDetail | null): string | null => {
  if (!shop) return null;
  return shop.logo_url || shop.logo || null;
};

const getShopInitial = (shop: ShopDetail | null): string => {
  if (!shop) return "";
  return shop.business_name?.charAt(0)?.toUpperCase() || "";
};

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

const formatPrice = (raw: string | number | null | undefined): string => {
  if (raw === null || raw === undefined) return "";
  const str = String(raw);
  if (!str) return "";

  const isNegative = str.startsWith("-");
  const numeric = isNegative ? str.slice(1) : str;

  const [intPartRaw, fracPart] = numeric.split(".");
  const intPart = intPartRaw.replace(/\D/g, "") || "0";

  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const withSign = isNegative ? `-${intFormatted}` : intFormatted;
  return fracPart ? `${withSign}.${fracPart}` : withSign;
};

const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = getShopPageTexts(language);

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [likeBusyId, setLikeBusyId] = useState<number | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterValue>("all");

  const loadShop = async () => {
    if (!id) {
      setError(texts.shopNotFound);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1) Shop details
      const shopRes = await apiClient.get<ShopDetail>(`/api/sellers/${id}/`);
      setShop(shopRes.data);

      // 2) Shop products
      let shopProducts: ShopProduct[] = [];

      try {
        const productsRes = await apiClient.get<
          PaginatedProductList | ShopProduct[]
        >(`/api/sellers/${id}/products/`);

        const raw = productsRes.data as PaginatedProductList | ShopProduct[];

        if (Array.isArray(raw)) {
          shopProducts = raw;
        } else if (raw && Array.isArray(raw.results)) {
          shopProducts = raw.results;
        }
      } catch (innerErr) {
        // fallback: /api/products/?seller_id=...
        console.error("Fallback to /api/products/ with seller_id", innerErr);
        const params = new URLSearchParams();
        params.set("seller_id", id);
        params.set("page", "1");
        params.set("page_size", "48");

        const productRes = await apiClient.get<PaginatedProductList>(
          `/api/products/?${params.toString()}`,
        );
        shopProducts = productRes.data.results || [];
      }

      setProducts(shopProducts);
    } catch (err) {
      console.error(err);
      setError(texts.failedToLoadShop);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // reset category each time unapoingia duka jipya
  useEffect(() => {
    setSelectedCategory("all");
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

  const coverImage = getShopCoverImage(shop);
  const logoImage = getShopLogoImage(shop);
  const initial = getShopInitial(shop);

  const categoriesFromShop: CategoryMini[] = useMemo(() => {
    const map = new Map<number, CategoryMini>();
    for (const p of products) {
      if (p.category) {
        map.set(p.category.id, {
          id: p.category.id,
          name: p.category.name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [products]);

  const hasUncategorized = useMemo(
    () => products.some((p) => !p.category),
    [products],
  );

  const visibleProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    if (selectedCategory === "uncategorized") {
      return products.filter((p) => !p.category);
    }
    return products.filter(
      (p) => p.category && p.category.id === selectedCategory,
    );
  }, [selectedCategory, products]);

  const handleToggleLike = async (productId: number) => {
    if (!productId) return;
    setLikeError(null);
    setLikeBusyId(productId);

    try {
      const res = await apiClient.post<ProductLikeToggleResponse>(
        "/api/product-likes/toggle/",
        {
          product: productId,
        },
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
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
      setLikeError(texts.likeError);
    } finally {
      setLikeBusyId(null);
    }
  };

  const handleOpenChat = (productId: number) => {
    if (!id) return;
    navigate(`/chat?product=${productId}&seller=${id}`);
  };

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active !== false).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-5 md:py-7">
        {/* Breadcrumb + Back */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Link
              to="/products"
              className="hover:text-orange-600 dark:hover:text-orange-400 hover:underline"
            >
              {texts.breadcrumbProducts}
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 line-clamp-1">
              {shopName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-[11px] md:text-xs text-slate-600 dark:text-slate-300 hover:underline"
          >
            ← {texts.backLabel}
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {texts.loadingShopDetails}
          </div>
        ) : error || !shop ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-700 p-4 text-sm text-red-600 dark:text-red-300">
            {error || texts.shopNotFound}
          </div>
        ) : (
          <>
            {/* HERO: SHOP OVERVIEW */}
            <section className="mb-6 space-y-4">
              {/* Shop banner + info */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Cover image */}
                <div className="relative h-44 md:h-56 w-full">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={shopName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-r from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center text-xs md:text-sm text-slate-200" />
                  )}

                  {/* gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Logo + title */}
                  <div className="absolute left-4 bottom-3 md:left-6 md:bottom-5 flex items-end gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-white/90 dark:border-slate-900 flex items-center justify-center overflow-hidden text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                      {logoImage ? (
                        <img
                          src={logoImage}
                          alt={`${shopName} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{initial || "S"}</span>
                      )}
                    </div>

                    <div className="text-white space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base md:text-lg lg:text-xl font-semibold leading-tight">
                          {shopName}
                        </h1>
                        {shop.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            {language === "sw" ? "Imethibitishwa" : "Verified"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-200/90">
                        {shop.location?.city && (
                          <span>{shop.location.city}</span>
                        )}
                        {shop.location?.country && (
                          <span>
                            {shop.location.city ? "• " : ""}
                            {shop.location.country}
                          </span>
                        )}
                        {ratingDisplay && (
                          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                            {texts.statsRatingLabel}: {ratingDisplay} ★
                          </span>
                        )}
                        {shop.total_sales > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                            {texts.statsSalesLabel}:{" "}
                            {formatPrice(shop.total_sales)}+
                          </span>
                        )}
                        {totalProducts > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                            {texts.statsProductsLabel}: {totalProducts}
                          </span>
                        )}
                        {activeProducts > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                            {texts.statsProductsActiveLabel}: {activeProducts}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description + actions */}
                <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-[11px] md:text-sm lg:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
                    {shop.description ? (
                      <p className="line-clamp-3">{shop.description}</p>
                    ) : (
                      <p className="italic">{texts.heroNoDescription}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {shop.phone_number && (
                      <a
                        href={`tel:${shop.phone_number}`}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-[11px] md:text-xs font-semibold hover:bg-black dark:hover:bg-white"
                      >
                        {texts.heroCallShop}
                      </a>
                    )}
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] md:text-xs text-slate-700 dark:text-slate-100 hover:border-orange-500 hover:text-orange-600"
                      >
                        {texts.heroOpenInGoogleMaps}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Map card */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {texts.mapTitle}
                    </h2>
                    <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400">
                      {texts.mapSubtitle}
                    </p>
                  </div>
                  {shop.location?.address && (
                    <span className="hidden md:inline-flex text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">
                      {shop.location.address}
                    </span>
                  )}
                </div>
                {mapCenter ? (
                  <GoogleMapPreview center={mapCenter} height="260px" />
                ) : (
                  <div className="h-56 flex items-center justify-center text-[11px] md:text-sm text-slate-500 dark:text-slate-400 px-4 text-center">
                    {texts.mapNoLocation}
                  </div>
                )}
              </div>
            </section>

            {/* PRODUCTS GRID */}
            <section>
              <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                <div>
                  <h2 className="text-sm md:text-base lg:text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {texts.productsSectionTitle(shopName)}
                  </h2>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
                    {texts.productsSectionSubtitle}
                  </p>
                </div>
                <Link
                  to="/products"
                  className="text-[11px] md:text-xs text-orange-600 dark:text-orange-400 hover:underline"
                >
                  {texts.productsBackToAll}
                </Link>
              </div>

              {/* Category filters */}
              {(categoriesFromShop.length > 0 || hasUncategorized) && (
                <div className="mb-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {texts.filtersTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    {texts.filtersSubtitle}
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
                      {texts.filtersAllLabel}
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
                        {texts.filtersUncategorizedLabel}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {likeError && (
                <div className="mb-3 text-[11px] text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 px-3 py-2 rounded-xl">
                  {likeError}
                </div>
              )}

              {products.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 md:p-5 text-[11px] md:text-sm text-slate-500 dark:text-slate-300">
                  {texts.productsEmptyForShop}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 md:p-5 text-[11px] md:text-sm text-slate-500 dark:text-slate-300">
                  {texts.productsEmptyForCategory}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 lg:gap-6">
                  {visibleProducts.map((p) => {
                    const img = getMainImage(p);
                    const likesCount = p.likes_count ?? 0;
                    const isLiked = Boolean(p.is_liked);

                    return (
                      <article
                        key={p.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow flex flex-col overflow-hidden relative"
                      >
                        {/* like button */}
                        <button
                          type="button"
                          onClick={() => void handleToggleLike(p.id)}
                          disabled={likeBusyId === p.id}
                          className="absolute right-2 top-2 z-10 px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
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
                          <span className="text-slate-700 dark:text-slate-200">
                            {likesCount}
                          </span>
                        </button>

                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-44 md:h-52 object-cover"
                          />
                        ) : (
                          <div className="w-full h-44 md:h-52 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                            {texts.productNoImage}
                          </div>
                        )}

                        <div className="p-4 md:p-5 flex flex-col gap-1.5 flex-1">
                          <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                            {p.name}
                          </h3>
                          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {p.description}
                          </p>

                          {p.category && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 w-fit">
                              {p.category.name}
                            </span>
                          )}

                          <div className="mt-1 flex items-center justify-between text-[11px] md:text-xs">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {formatPrice(p.price)} {p.currency}
                            </span>
                            {p.is_active === false ? (
                              <span className="text-[10px] text-red-500 dark:text-red-400 font-semibold">
                                {texts.productHiddenLabel}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                {texts.productAvailableLabel}
                              </span>
                            )}
                          </div>

                          {/* CTA strip */}
                          <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] md:text-xs">
                            <Link
                              to={`/products/${p.id}`}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-medium hover:bg-black dark:hover:bg-white"
                            >
                              {texts.productViewDetails}
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenChat(p.id)}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400"
                            >
                              {texts.productChatSeller}
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
