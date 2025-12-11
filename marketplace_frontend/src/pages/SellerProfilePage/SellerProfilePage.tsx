// src/pages/seller/SellerProfilePage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import GoogleMapPreview, { type LatLng } from "../../components/GoogleMapPreview";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";

// Phone input ya mataifa yote
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { sellerProfileTexts } from "./sellerProfileTexts";

// -------------------- TYPES --------------------

interface LocationPayload {
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  mapbox_place_id: string;
}

interface SellerProfilePayload {
  business_name: string;
  description: string;
  phone_number: string;
  location: LocationPayload;
}

interface SellerProfileResponse {
  id: number;
  business_name: string;
  description: string;
  phone_number: string;
  is_verified: boolean;
  rating: string;
  total_sales: number;
  logo?: string | null;
  logo_url?: string | null;
  shop_image?: string | null;
  shop_image_url?: string | null;
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  location: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    latitude: string;
    longitude: string;
  } | null;
}

interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface MyProduct {
  id: number;
  name: string;
  price: string;
  currency: string;
  is_active: boolean;
  image_url?: string | null;
  image?: string | null;
  seller_id?: number;
  seller?:
    | {
        id: number;
        business_name?: string;
      }
    | null;
  images?: ProductImage[];
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: MyProduct[];
}

const DEFAULT_CENTER: LatLng = {
  lat: -6.163,
  lng: 35.7516,
};

type SellerStep = "profile" | "location" | "products";

// HELPER: chukua picha kuu ya bidhaa (image_url / image / images[])
const getMainProductImage = (p: MyProduct): string | null => {
  const primary = p.images?.find((img) => img.is_primary) ?? p.images?.[0];

  return (
    p.image_url ||
    p.image ||
    (primary ? primary.image_url || primary.image : null) ||
    null
  );
};

// -------------------- COMPONENT --------------------

const SellerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isSw = language === "sw";

  const tx = (key: keyof typeof sellerProfileTexts) =>
    isSw ? sellerProfileTexts[key].sw : sellerProfileTexts[key].en;

  // -------- FORM STATE --------
  const [form, setForm] = useState<SellerProfilePayload>({
    business_name: "",
    description: "",
    phone_number: "",
    location: {
      address: "",
      city: "",
      state: "",
      country: "Tanzania",
      postal_code: "",
      latitude: "",
      longitude: "",
      mapbox_place_id: "",
    },
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [shopImagePreview, setShopImagePreview] = useState<string | null>(null);

  const [sellerId, setSellerId] = useState<number | null>(null);
  const [sellerSummary, setSellerSummary] =
    useState<SellerProfileResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState<SellerStep>("profile");
  const [completed, setCompleted] = useState<{
    profile: boolean;
    location: boolean;
    products: boolean;
  }>({
    profile: false,
    location: false,
    products: false,
  });

  const steps: { id: SellerStep; labelKey: keyof typeof sellerProfileTexts }[] =
    [
      { id: "profile", labelKey: "stepProfileLabel" },
      { id: "location", labelKey: "stepLocationLabel" },
      { id: "products", labelKey: "stepProductsLabel" },
    ];

  const activeIndex = steps.findIndex((s) => s.id === activeStep);

  // -------- HANDLERS --------

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("location.")) {
      const key = name.replace("location.", "") as keyof LocationPayload;
      setForm((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [key]: value,
        },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setLogoFile(null);
      // fallback: tumia kile kimetoka backend
      setLogoPreview(sellerSummary?.logo_url || sellerSummary?.logo || null);
      return;
    }
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const handleShopImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setShopImageFile(null);
      setShopImagePreview(
        sellerSummary?.shop_image_url || sellerSummary?.shop_image || null,
      );
      return;
    }
    setShopImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setShopImagePreview(objectUrl);
  };

  /**
   * Products za muuzaji aliye login
   * - Inatumia /api/products/mine/
   * - Ina-handle response iwe ARRAY au paginated (results[])
   */
  const loadMyProducts = async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await apiClient.get<PaginatedProductList | MyProduct[]>(
        "/api/products/mine/",
      );

      const raw = res.data;
      const list: MyProduct[] = Array.isArray(raw) ? raw : raw.results || [];

      setMyProducts(list);
      setCompleted((prev) => ({
        ...prev,
        products: list.length > 0,
      }));
    } catch (err) {
      console.error(err);
      setProductsError(tx("loadProductsError"));
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCurrentSellerProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ API sahihi: seller wa current user
      const res = await apiClient.get<SellerProfileResponse>("/api/sellers/me/");
      const mine = res.data;

      setSellerId(mine.id);
      setSellerSummary(mine);

      setForm({
        business_name: mine.business_name || "",
        description: mine.description || "",
        phone_number: mine.phone_number || "",
        location: {
          address: mine.location?.address || "",
          city: mine.location?.city || "",
          state: mine.location?.state || "",
          country: mine.location?.country || "Tanzania",
          postal_code: mine.location?.postal_code || "",
          latitude: mine.location?.latitude || "",
          longitude: mine.location?.longitude || "",
          mapbox_place_id: "",
        },
      });

      setLogoPreview(mine.logo_url || mine.logo || null);
      setShopImagePreview(mine.shop_image_url || mine.shop_image || null);

      setCompleted((prev) => ({
        ...prev,
        profile: true,
        location: !!mine.location,
      }));

      void loadMyProducts();
    } catch (err) {
      console.error(err);

      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // hana seller profile bado – sio error, ni setup mpya
        setSellerId(null);
        setSellerSummary(null);
        setCompleted({
          profile: false,
          location: false,
          products: false,
        });
      } else {
        setError(tx("loadProfileError"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentSellerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError(tx("geolocationNotAvailable"));
      return;
    }

    setError(null);
    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latStr = latitude.toFixed(6);
        const lngStr = longitude.toFixed(6);

        setForm((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            latitude: latStr,
            longitude: lngStr,
          },
        }));

        setGeoLoading(false);
      },
      (geoError) => {
        console.error(geoError);
        setError(tx("geolocationReadError"));
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
      },
    );
  };

  const mapCenter: LatLng = (() => {
    const { latitude, longitude } = form.location;
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }
    return DEFAULT_CENTER;
  })();

  const sellerInitial =
    form.business_name?.charAt(0)?.toUpperCase() ||
    user?.username?.charAt(0)?.toUpperCase() ||
    "";

  /**
   * SUBMIT HANDLER:
   * - Step 1 (profile): HAITUMI DB. Ina-validate na kukusogeza "location" tu.
   * - Step 2 (location): Hapo ndipo tunatuma profile + location (na logo/shop_image) backend.
   */
  const handleSubmitProfileOrLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // ---------- STEP 1: PROFILE ONLY (NO API) ----------
    if (activeStep === "profile") {
      if (!form.business_name.trim()) {
        setError(tx("profileStep1MissingNameError"));
        return;
      }

      setCompleted((prev) => ({
        ...prev,
        profile: true,
      }));

      setActiveStep("location");
      setSuccess(tx("profileStep1CompletedMessage"));
      return;
    }

    // Kama si "location" hapa, hakuna cha kufanya kwa submit
    if (activeStep !== "location") {
      return;
    }

    // ---------- STEP 2: LOCATION + PROFILE -> TUMA BACKEND ----------
    // Hakikisha bado tuna business_name (kama mtu ameruka moja kwa moja kwenda step 2)
    if (!form.business_name.trim()) {
      setError(tx("profileStep2MissingNameError"));
      setActiveStep("profile");
      return;
    }

    setSaving(true);

    try {
      const payload: SellerProfilePayload = {
        business_name: form.business_name,
        description: form.description,
        phone_number: form.phone_number,
        location: {
          address: form.location.address,
          city: form.location.city,
          state: form.location.state,
          country: form.location.country,
          postal_code: form.location.postal_code,
          latitude: form.location.latitude,
          longitude: form.location.longitude,
          mapbox_place_id: form.location.mapbox_place_id,
        },
      };

      let baseSeller: SellerProfileResponse;

      if (sellerId) {
        // ✅ UPDATE SELLER (JSON bila files)
        const res = await apiClient.put<SellerProfileResponse>(
          `/api/sellers/${sellerId}/`,
          payload,
        );
        baseSeller = res.data;
      } else {
        // ✅ CREATE SELLER (JSON bila files)
        const res = await apiClient.post<SellerProfileResponse>(
          "/api/sellers/",
          payload,
        );
        baseSeller = res.data;
      }

      let finalSeller: SellerProfileResponse = baseSeller;

      // ✅ PATCH LOGO file (multipart/form-data) kama user kachagua
      if (logoFile) {
        try {
          const fd = new FormData();
          fd.append("logo", logoFile);

          const logoRes = await apiClient.patch<SellerProfileResponse>(
            `/api/sellers/${baseSeller.id}/`,
            fd,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            },
          );

          finalSeller = logoRes.data;
        } catch (uploadErr) {
          console.error("Failed to upload seller logo", uploadErr);
        }
      }

      // ✅ PATCH SHOP IMAGE file (picha ya nje ya duka)
      if (shopImageFile) {
        try {
          const fdShop = new FormData();
          fdShop.append("shop_image", shopImageFile);

          const shopRes = await apiClient.patch<SellerProfileResponse>(
            `/api/sellers/${baseSeller.id}/`,
            fdShop,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            },
          );

          finalSeller = shopRes.data;
        } catch (uploadErr) {
          console.error("Failed to upload shop_image", uploadErr);
        }
      }

      // Sync state na seller wa mwisho (anayojumuisha logo & shop_image)
      setSellerId(finalSeller.id);
      setSellerSummary(finalSeller);
      setForm((prev) => ({
        ...prev,
        business_name: finalSeller.business_name || prev.business_name,
        description: finalSeller.description || prev.description,
        phone_number: finalSeller.phone_number || prev.phone_number,
        location: {
          ...prev.location,
          address: finalSeller.location?.address || prev.location.address,
          city: finalSeller.location?.city || prev.location.city,
          state: finalSeller.location?.state || prev.location.state,
          country: finalSeller.location?.country || prev.location.country,
          postal_code:
            finalSeller.location?.postal_code || prev.location.postal_code,
          latitude: finalSeller.location?.latitude || prev.location.latitude,
          longitude: finalSeller.location?.longitude || prev.location.longitude,
          mapbox_place_id: prev.location.mapbox_place_id,
        },
      }));
      setLogoPreview(finalSeller.logo_url || finalSeller.logo || null);
      setShopImagePreview(
        finalSeller.shop_image_url || finalSeller.shop_image || null,
      );
      setLogoFile(null);
      setShopImageFile(null);

      setCompleted((prev) => ({
        ...prev,
        profile: true,
        location: !!finalSeller.location,
      }));

      if (!sellerId) {
        // kama ilikuwa creation mpya, load bidhaa baada ya kuwa na sellerId
        void loadMyProducts();
      }

      setSuccess(tx("saveProfileSuccess"));

      // Baada ya hatua ya pili, peleka user hatua ya tatu (optional products)
      setActiveStep("products");
    } catch (err) {
      console.error(err);
      setError(tx("saveProfileError"));
    } finally {
      setSaving(false);
    }
  };

  const stepStatus = (step: SellerStep) => {
    if (step === "profile") return completed.profile;
    if (step === "location") return completed.location;
    return completed.products;
  };

  // -------------------- RENDER --------------------

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 text-xs md:text-sm">
            {tx("mustLogin")}
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 max-w-6xl mx-auto py-6 md:py-8 px-3 sm:px-4">
        {/* top header with seller badge + logo */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  sellerInitial
                )}
              </div>
            </div>
            <div>
              <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-50">
                {sellerId
                  ? form.business_name || tx("headerExistingTitle")
                  : tx("headerNewTitle")}
              </h2>
              <p className="text-[11px] md:text-[12px] text-slate-500 dark:text-slate-400">
                {tx("headerSubtitle")}
              </p>
              {sellerSummary && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {tx("headerRatingLabel")}: {sellerSummary.rating || "N/A"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {tx("headerTotalSalesLabel")}: {sellerSummary.total_sales}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      sellerSummary.is_verified
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {sellerSummary.is_verified
                      ? tx("headerVerified")
                      : tx("headerNotVerified")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {sellerId && (
              <Link
                to={`/shops/${sellerId}`}
                className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {tx("viewPublicShopPage")}
              </Link>
            )}

            {/* logo upload quick action */}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-100 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <span>{tx("changeCompanyLogo")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
            </label>
          </div>
        </div>

        {loading && (
          <div className="text-[11px] md:text-sm text-slate-600 dark:text-slate-300 mb-3">
            {tx("loadingProfile")}
          </div>
        )}

        {error && (
          <div className="mb-3 text-[11px] md:text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 p-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-[11px] md:text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 p-2 rounded-lg">
            {success}
          </div>
        )}

        {!loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 md:p-7 lg:p-8">
            {/* PROGRESS STEPS */}
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 mb-2 text-[11px] md:text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {`${tx("stepCounterPrefix")} ${activeIndex + 1} ${tx(
                    "stepCounterOf",
                  )} ${steps.length}`}
                </span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                  {tx("stepTapHint")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] md:text-xs">
                {steps.map((step, index) => {
                  const isActive = activeStep === step.id;
                  const isDone = stepStatus(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border text-[11px] ${
                          isActive
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                            : isDone
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isDone && !isActive ? "✓" : index + 1}
                      </div>
                      <span
                        className={`${
                          isActive
                            ? "text-orange-600 dark:text-orange-400 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {tx(step.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FORM STEPS */}
            {(activeStep === "profile" || activeStep === "location") && (
              <form
                onSubmit={handleSubmitProfileOrLocation}
                className="space-y-4"
              >
                {/* PROFILE STEP */}
                {activeStep === "profile" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1.2fr] gap-4">
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("profileBusinessNameLabel")}
                        </label>
                        <input
                          name="business_name"
                          value={form.business_name}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={tx("profileBusinessNamePlaceholder")}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("profilePhoneLabel")}
                        </label>
                        <div className="w-full">
                          <PhoneInput
                            country="tz" // default Tanzania
                            value={form.phone_number}
                            onChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                phone_number: value || "",
                              }))
                            }
                            enableSearch
                            inputProps={{
                              name: "phone_number",
                              id: "phone_number",
                              autoComplete: "tel",
                            }}
                            containerClass="w-full"
                            inputClass="!w-full !text-xs md:!text-sm !bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100 !border !border-slate-200 dark:!border-slate-700 !rounded-xl !px-3 !py-2 focus:!outline-none focus:!ring-2 focus:!ring-orange-500 focus:!border-orange-500"
                            buttonClass="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700"
                            dropdownClass="!bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100"
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {tx("profilePhoneHint")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                        {tx("profileDescriptionLabel")}
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows={4}
                        placeholder={tx("profileDescriptionPlaceholder")}
                      />
                    </div>

                    {/* LOGO + SHOP IMAGE FIELDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* COMPANY LOGO FIELD */}
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("logoLabel")}
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden text-[10px] text-slate-500 dark:text-slate-300">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{tx("logoNone")}</span>
                            )}
                          </div>
                          <label className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            {tx("logoChooseImageBtn")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoFileChange}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {tx("logoHelpText")}
                        </p>
                      </div>

                      {/* SHOP FRONT IMAGE FIELD */}
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("shopImageLabel")}
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[220px] aspect-4/3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden text-[10px] text-slate-500 dark:text-slate-300">
                            {shopImagePreview ? (
                              <img
                                src={shopImagePreview}
                                alt="Shop front preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{tx("shopImageNone")}</span>
                            )}
                          </div>
                          <label className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            {tx("shopImageUploadBtn")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleShopImageFileChange}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {tx("shopImageHelpText")}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* LOCATION STEP */}
                {activeStep === "location" && (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {tx("locationTitle")}
                      </h3>
                      <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400">
                        {tx("locationSubtitle")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("addressLabel")}
                        </label>
                        <input
                          name="location.address"
                          value={form.location.address}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("cityLabel")}
                        </label>
                        <input
                          name="location.city"
                          value={form.location.city}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("stateLabel")}
                        </label>
                        <input
                          name="location.state"
                          value={form.location.state}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("countryLabel")}
                        </label>
                        <input
                          name="location.country"
                          value={form.location.country}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("postalCodeLabel")}
                        </label>
                        <input
                          name="location.postal_code"
                          value={form.location.postal_code}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("latitudeLabel")}
                        </label>
                        <input
                          name="location.latitude"
                          value={form.location.latitude}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="-6.1630"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {tx("longitudeLabel")}
                        </label>
                        <input
                          name="location.longitude"
                          value={form.location.longitude}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="35.7516"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <GoogleMapPreview center={mapCenter} height="260px" />
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={geoLoading}
                          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-orange-500 text-[11px] font-medium text-orange-600 dark:text-orange-300 shadow-sm hover:bg-white dark:hover:bg-slate-900 disabled:opacity-60"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {geoLoading
                            ? tx("mapDetecting")
                            : tx("mapUseCurrent")}
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {tx("mapHelpText")}
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-3 flex items-center justify-between gap-2">
                  <div>
                    {activeStep !== "profile" && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStep(
                            activeStep === "location" ? "profile" : "location",
                          )
                        }
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {tx("backToPreviousStep")}
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-xs md:text-sm font-semibold hover:bg-black dark:hover:bg-white disabled:opacity-60"
                  >
                    {saving
                      ? activeStep === "profile"
                        ? tx("savingProfile")
                        : tx("savingLocation")
                      : activeStep === "profile"
                      ? tx("saveAndNext")
                      : tx("saveProfileAndLocation")}
                  </button>
                </div>
              </form>
            )}

            {/* PRODUCTS STEP */}
            {activeStep === "products" && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {tx("productsTitle")}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tx("productsSubtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep("location")}
                      className="hidden sm:inline-flex px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {tx("backToLocation")}
                    </button>
                    <Link
                      to="/products/new"
                      className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-[11px] font-semibold hover:bg-black dark:hover:bg-white"
                    >
                      {tx("productsAddNew")}
                    </Link>
                    {sellerId && (
                      <Link
                        to={`/shops/${sellerId}`}
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {tx("productsViewPublic")}
                      </Link>
                    )}
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tx("productsLoading")}
                  </div>
                ) : productsError ? (
                  <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-100 dark:border-red-900">
                    {productsError}
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    {tx("productsEmpty")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    {myProducts.map((p) => {
                      const img = getMainProductImage(p);
                      return (
                        <article
                          key={p.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
                        >
                          <div className="w-full aspect-4/3 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                            {img ? (
                              <img
                                src={img}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                                {tx("productsNoImage")}
                              </span>
                            )}
                          </div>
                          <div className="p-3 flex flex-col gap-1 flex-1">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                              {p.name}
                            </h4>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">
                              {p.price} {p.currency}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {p.is_active
                                ? tx("productVisible")
                                : tx("productHidden")}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <Link
                                to={`/products/${p.id}`}
                                className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-black dark:hover:bg-white"
                              >
                                {tx("productPreviewButton")}
                              </Link>
                              <Link
                                to={`/products/${p.id}/edit`}
                                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                {tx("productEditButton")}
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <MainFooter />
    </div>
  );
};

export default SellerProfilePage;
