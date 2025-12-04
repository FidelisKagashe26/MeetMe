// src/pages/SellerProfilePage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import GoogleMapPreview, { type LatLng } from "../components/GoogleMapPreview";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface LocationPayload {
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude: string;
  longitude: string;
  mapbox_place_id?: string;
}

interface SellerProfilePayload {
  business_name: string;
  description: string;
  phone_number: string;
  location: LocationPayload;
  logo?: string; // URL/relative path from backend (non-file)
  shop_image?: string; // URL/relative path ya picha ya nje (non-file)
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

const SellerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isSw = language === "sw";

  const [form, setForm] = useState<SellerProfilePayload>({
    business_name: "",
    description: "",
    phone_number: "",
    logo: "",
    shop_image: "",
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

  const steps: { id: SellerStep; labelEn: string; labelSw: string }[] = [
    { id: "profile", labelEn: "Profile", labelSw: "Wasifu" },
    { id: "location", labelEn: "Location", labelSw: "Location" },
    { id: "products", labelEn: "Products", labelSw: "Bidhaa" },
  ];

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
      setLogoPreview(
        sellerSummary?.logo_url ||
          sellerSummary?.logo ||
          form.logo ||
          null,
      );
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
        sellerSummary?.shop_image_url ||
          sellerSummary?.shop_image ||
          form.shop_image ||
          null,
      );
      return;
    }
    setShopImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setShopImagePreview(objectUrl);
  };

  const loadMyProducts = async (sellerPk: number) => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const params = new URLSearchParams();
      params.set("seller_id", String(sellerPk));
      params.set("page", "1");
      params.set("page_size", "100");

      const res = await apiClient.get<PaginatedProductList>(
        `/api/products/?${params.toString()}`,
      );

      const all = res.data.results || [];

      // 🔐 MUHIMU: hakikisha muuzaji anaona BIDHAA ZAKE TU
      const mineOnly = all.filter(
        (p) =>
          p.seller_id === sellerPk || (p.seller && p.seller.id === sellerPk),
      );

      setMyProducts(mineOnly);
      setCompleted((prev) => ({
        ...prev,
        products: mineOnly.length > 0,
      }));
    } catch (err) {
      console.error(err);
      setProductsError(
        isSw
          ? "Imeshindikana kupakia bidhaa zako."
          : "Failed to load your products.",
      );
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
        logo: mine.logo_url || mine.logo || "",
        shop_image: mine.shop_image_url || mine.shop_image || "",
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
      void loadMyProducts(mine.id);
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
        setError(
          isSw
            ? "Imeshindikana kupakia wasifu wa muuzaji."
            : "Failed to load seller profile.",
        );
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
      setError(
        isSw
          ? "Geolocation haipatikani kwenye browser hii."
          : "Geolocation is not available in this browser.",
      );
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
        setError(
          isSw
            ? "Imeshindikana kusoma location yako."
            : "Failed to read your current location.",
        );
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

  const handleSubmitProfileOrLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: SellerProfilePayload = {
        business_name: form.business_name,
        description: form.description,
        phone_number: form.phone_number,
        logo: form.logo || undefined,
        shop_image: form.shop_image || undefined,
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
        // ✅ UPDATE SELLER (JSON)
        const res = await apiClient.put<SellerProfileResponse>(
          `/api/sellers/${sellerId}/`,
          payload,
        );
        baseSeller = res.data;
      } else {
        // ✅ CREATE SELLER (JSON)
        const res = await apiClient.post<SellerProfileResponse>(
          "/api/sellers/",
          payload,
        );
        baseSeller = res.data;
      }

      let finalSeller = baseSeller;

      // ✅ PATCH LOGO file
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

      // Sync state na seller wa mwisho (anayojumuisha logo na shop_image)
      setSellerId(finalSeller.id);
      setSellerSummary(finalSeller);
      setForm((prev) => ({
        ...prev,
        business_name: finalSeller.business_name || prev.business_name,
        description: finalSeller.description || prev.description,
        phone_number: finalSeller.phone_number || prev.phone_number,
        logo:
          finalSeller.logo_url ||
          finalSeller.logo ||
          prev.logo,
        shop_image:
          finalSeller.shop_image_url ||
          finalSeller.shop_image ||
          prev.shop_image,
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
        void loadMyProducts(finalSeller.id);
      }

      const msg =
        activeStep === "profile"
          ? isSw
            ? "Wasifu wa muuzaji umehifadhiwa."
            : "Seller profile updated."
          : isSw
          ? "Location ya duka imehifadhiwa."
          : "Shop location updated.";

      setSuccess(msg);

      // move to step inayofuata
      if (activeStep === "profile") {
        setActiveStep("location");
      } else if (activeStep === "location") {
        setActiveStep("products");
      }
    } catch (err) {
      console.error(err);
      setError(
        isSw
          ? "Imeshindikana kuhifadhi taarifa za muuzaji."
          : "Failed to save seller profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const stepStatus = (step: SellerStep) => {
    if (step === "profile") return completed.profile;
    if (step === "location") return completed.location;
    return completed.products;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 text-xs md:text-sm">
            {isSw
              ? "Lazima uingie (login) ili kudhibiti wasifu wa muuzaji."
              : "You must be logged in to manage seller profile."}
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
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
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
                  ? form.business_name ||
                    (isSw ? "Dashibodi ya muuzaji" : "Seller dashboard")
                  : isSw
                  ? "Weka taarifa za duka lako"
                  : "Set up your seller account"}
              </h2>
              <p className="text-[11px] md:text-[12px] text-slate-500 dark:text-slate-400">
                {isSw
                  ? "Simamia taarifa za duka, location na bidhaa kutoka sehemu moja."
                  : "Manage your shop details, location and products from one place."}
              </p>
              {sellerSummary && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {isSw ? "Rating" : "Rating"}:{" "}
                    {sellerSummary.rating || "N/A"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {isSw ? "Mauzo yote" : "Total sales"}:{" "}
                    {sellerSummary.total_sales}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      sellerSummary.is_verified
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {sellerSummary.is_verified
                      ? isSw
                        ? "Duka limesajiliwa (verified)"
                        : "Verified shop"
                      : isSw
                      ? "Bado halijathibitishwa"
                      : "Not verified"}
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
                {isSw ? "Angalia ukurasa wa duka" : "View public shop page"}
              </Link>
            )}

            {/* logo upload quick action */}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-100 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <span>
                {isSw ? "Badili logo ya kampuni" : "Change company logo"}
              </span>
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
            {isSw ? "Inapakia taarifa..." : "Loading current profile..."}
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
            <div className="flex items-center justify-between gap-3 mb-5 text-[11px] md:text-xs">
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
                      {isSw ? step.labelSw : step.labelEn}
                    </span>
                  </button>
                );
              })}
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
                          {isSw ? "Jina la biashara" : "Business name"}
                        </label>
                        <input
                          name="business_name"
                          value={form.business_name}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={
                            isSw
                              ? "mf. Microspace Dodoma"
                              : "e.g. Microspace Dodoma"
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {isSw ? "Namba ya simu" : "Phone number"}
                        </label>
                        <input
                          name="phone_number"
                          value={form.phone_number}
                          onChange={handleChange}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="+2557..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                        {isSw ? "Maelezo mafupi ya duka" : "Description"}
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows={4}
                        placeholder={
                          isSw
                            ? "Elezea kwa ufupi unachouza au huduma unazotoa."
                            : "Short description about your store/services."
                        }
                      />
                    </div>

                    {/* LOGO + SHOP IMAGE FIELDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* COMPANY LOGO FIELD */}
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {isSw
                            ? "Logo ya kampuni / brand"
                            : "Company / brand logo"}
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden text-[10px] text-slate-500 dark:text-slate-300">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {isSw ? "Hakuna logo" : "No logo"}
                              </span>
                            )}
                          </div>
                          <label className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            {isSw ? "Chagua picha..." : "Choose image..."}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoFileChange}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {isSw
                            ? "Logo itaonekana kama kitambulisho kidogo karibu na jina la duka kwenye sehemu mbalimbali."
                            : "Logo will be used as a small avatar next to your shop name across the app."}
                        </p>
                      </div>

                      {/* SHOP FRONT IMAGE FIELD */}
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {isSw
                            ? "Picha ya nje ya duka (facade)"
                            : "Shop front photo (facade)"}
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden text-[10px] text-slate-500 dark:text-slate-300">
                            {shopImagePreview ? (
                              <img
                                src={shopImagePreview}
                                alt="Shop front preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {isSw
                                  ? "Hakuna picha ya duka"
                                  : "No shop photo"}
                              </span>
                            )}
                          </div>
                          <label className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            {isSw
                              ? "Weka picha ya duka..."
                              : "Upload shop photo..."}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleShopImageFileChange}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {isSw
                            ? "Picha hii itaonekana kwenye Nearby products na kwenye ukurasa wa orodha ya maduka (Sellers). Chagua picha ya mbele ya duka ili mteja akifikia atambue haraka."
                            : "This photo will be shown on Nearby products and on the Sellers list page. Use a clear front view of your shop so customers can recognize it quickly."}
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
                        {isSw ? "Location ya biashara" : "Business location"}
                      </h3>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={geoLoading}
                        className="px-3 py-1.5 rounded-full border border-orange-500 text-[11px] font-medium text-orange-600 bg-white dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:opacity-60"
                      >
                        {geoLoading
                          ? isSw
                            ? "Inatafuta location..."
                            : "Detecting..."
                          : isSw
                          ? "Tumia location ya sasa"
                          : "Use my current location"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-200 mb-1">
                          {isSw ? "Anuani (mtaa / jengo)" : "Address"}
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
                          {isSw ? "Jiji / mji" : "City"}
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
                          {isSw ? "Mkoa / state" : "State"}
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
                          {isSw ? "Nchi" : "Country"}
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
                          {isSw ? "Postal code" : "Postal code"}
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
                          Latitude
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
                          Longitude
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
                      <GoogleMapPreview center={mapCenter} height="260px" />
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {isSw
                          ? "Ramani inaonyesha location kulingana na latitude & longitude ulizoweka."
                          : "Map shows the position based on the latitude & longitude you entered."}
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
                        {isSw
                          ? "Rudi hatua iliyotangulia"
                          : "Back to previous step"}
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
                        ? isSw
                          ? "Inahifadhi wasifu..."
                          : "Saving profile..."
                        : isSw
                        ? "Inahifadhi location..."
                        : "Saving location..."
                      : activeStep === "profile"
                      ? isSw
                        ? "Hifadhi na nenda hatua inayofuata"
                        : "Save & go to next step"
                      : isSw
                      ? "Hifadhi location (unaweza kuruka bidhaa)"
                      : "Save location (you can skip products)"}
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
                      {isSw ? "Bidhaa zako" : "Your products"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isSw
                        ? "Hizi ni bidhaa zote zilizounganishwa na duka lako. Hatua hii ni ya hiari."
                        : "These are all products linked to your shop. This step is optional."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep("location")}
                      className="hidden sm:inline-flex px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {isSw ? "Rudi location" : "Back to location"}
                    </button>
                    <Link
                      to="/products/new"
                      className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-[11px] font-semibold hover:bg-black dark:hover:bg-white"
                    >
                      {isSw ? "+ Ongeza bidhaa mpya" : "+ Add new product"}
                    </Link>
                    {sellerId && (
                      <Link
                        to={`/shops/${sellerId}`}
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {isSw ? "Tazama duka kwa wateja" : "View public shop"}
                      </Link>
                    )}
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isSw ? "Inapakia bidhaa zako..." : "Loading your products..."}
                  </div>
                ) : productsError ? (
                  <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-100 dark:border-red-900">
                    {productsError}
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    {isSw
                      ? "Bado hujaongeza bidhaa yoyote. Unaweza kuendelea kutumia mfumo bila kuongeza bidhaa sasa."
                      : "You don't have any products yet. You can still continue using the system without adding products now."}
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
                          {img ? (
                            <img
                              src={img}
                              alt={p.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[11px]">
                              {isSw ? "Hakuna picha" : "No image"}
                            </div>
                          )}
                          <div className="p-3 flex flex-col gap-1 flex-1">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                              {p.name}
                            </h4>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">
                              {p.price} {p.currency}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {p.is_active
                                ? isSw
                                  ? "Inaonekana kwa wateja"
                                  : "Active"
                                : isSw
                                ? "Imefichwa"
                                : "Hidden"}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <Link
                                to={`/products/${p.id}`}
                                className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-black dark:hover:bg-white"
                              >
                                {isSw ? "Tazama" : "Preview"}
                              </Link>
                              <Link
                                to={`/products/${p.id}/edit`}
                                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                {isSw ? "Hariri" : "Edit"}
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
