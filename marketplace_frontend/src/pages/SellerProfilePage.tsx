// src/pages/SellerProfilePage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
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
}

interface SellerProfileResponse {
  id: number;
  business_name: string;
  description: string;
  phone_number: string;
  is_verified: boolean;
  rating: string;
  total_sales: number;
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

interface PaginatedSellerProfileList {
  count: number;
  next: string | null;
  previous: string | null;
  results: SellerProfileResponse[];
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
  // muhimu kwa kuchuja bidhaa zake tu
  seller_id?: number;
  seller?: {
    id: number;
    business_name?: string;
  } | null;
  // gallery
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

type SellerTab = "profile" | "location" | "products";

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

  const [activeTab, setActiveTab] = useState<SellerTab>("profile");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  const loadMyProducts = async (sellerPk: number) => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const params = new URLSearchParams();
      params.set("seller_id", String(sellerPk));
      params.set("page", "1");
      params.set("page_size", "100");

      const res = await apiClient.get<PaginatedProductList>(
        `/api/products/?${params.toString()}`
      );

      const all = res.data.results || [];

      // 🔐 MUHIMU: hakikisha muuzaji anaona BIDHAA ZAKE TU
      const mineOnly = all.filter(
        (p) =>
          p.seller_id === sellerPk || (p.seller && p.seller.id === sellerPk)
      );

      setMyProducts(mineOnly);
    } catch (err) {
      console.error(err);
      setProductsError("Failed to load your products.");
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
      const res = await apiClient.get<PaginatedSellerProfileList>(
        "/api/sellers/"
      );
      const mine = res.data.results.find((s) => s.user.id === user.id);

      if (mine) {
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
        void loadMyProducts(mine.id);
      } else {
        setSellerId(null);
        setSellerSummary(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load seller profile.");
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
      setError("Geolocation haipatikani kwenye browser hii.");
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
        setError("Imeshindikana kusoma location yako.");
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
      }
    );
  };

  const handleSubmitProfileOrLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (sellerId) {
        const res = await apiClient.put<SellerProfileResponse>(
          `/api/sellers/${sellerId}/`,
          {
            business_name: form.business_name,
            description: form.description,
            phone_number: form.phone_number,
            is_verified: sellerSummary?.is_verified ?? false,
          }
        );

        setSellerSummary(res.data);
        setSuccess("Seller profile updated successfully.");
      } else {
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

        const res = await apiClient.post<SellerProfileResponse>(
          "/api/sellers/",
          payload
        );
        setSellerId(res.data.id);
        setSellerSummary(res.data);
        setSuccess("Seller profile created successfully.");
        void loadMyProducts(res.data.id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save seller profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm">
            You must be logged in to manage seller profile.
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  const mapCenter: LatLng = (() => {
    const { latitude, longitude } = form.location;
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }
    return DEFAULT_CENTER;
  })();

  const tabs: { id: SellerTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "location", label: "Location" },
    { id: "products", label: "Your products" },
  ];

  const sellerInitial =
    form.business_name?.charAt(0)?.toUpperCase() ||
    user.username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      {/* main container enlarged */}
      <main className="flex-1 max-w-6xl mx-auto py-8 px-4">
        {/* top header with seller badge */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              {sellerInitial}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                {sellerId
                  ? form.business_name || "Seller dashboard"
                  : "Set up your seller account"}
              </h2>
              <p className="text-[11px] md:text-[12px] text-slate-500">
                Manage your shop details, location and products from one place.
              </p>
              {sellerSummary && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Rating: {sellerSummary.rating || "N/A"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Total sales: {sellerSummary.total_sales}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      sellerSummary.is_verified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sellerSummary.is_verified
                      ? "Verified shop"
                      : "Not verified"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sellerId && (
              <Link
                to={`/shops/${sellerId}`}
                className="px-3 py-1.5 rounded-full border border-slate-300 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                View public shop page
              </Link>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-sm text-slate-600 mb-3">
            Loading current profile...
          </div>
        )}

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded-lg">
            {success}
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-7 lg:p-8">
            {/* Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-full border text-xs font-medium transition ${
                      activeTab === tab.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-500 hover:text-orange-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PROFILE / LOCATION FORMS */}
            {(activeTab === "profile" || activeTab === "location") && (
              <form
                onSubmit={handleSubmitProfileOrLocation}
                className="space-y-4"
              >
                {activeTab === "profile" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1.2fr] gap-4">
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Business name
                        </label>
                        <input
                          name="business_name"
                          value={form.business_name}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="e.g. Microspace Dodoma"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Phone number
                        </label>
                        <input
                          name="phone_number"
                          value={form.phone_number}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="+2557..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows={4}
                        placeholder="Short description about your store/services"
                      />
                    </div>
                  </>
                )}

                {activeTab === "location" && (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Business location
                      </h3>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={geoLoading}
                        className="px-3 py-1.5 rounded-full border border-orange-500 text-[11px] font-medium text-orange-600 bg-white hover:bg-orange-50 disabled:opacity-60"
                      >
                        {geoLoading ? "Detecting..." : "Use my current location"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Address
                        </label>
                        <input
                          name="location.address"
                          value={form.location.address}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          name="location.city"
                          value={form.location.city}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          State
                        </label>
                        <input
                          name="location.state"
                          value={form.location.state}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Country
                        </label>
                        <input
                          name="location.country"
                          value={form.location.country}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Postal code
                        </label>
                        <input
                          name="location.postal_code"
                          value={form.location.postal_code}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Latitude
                        </label>
                        <input
                          name="location.latitude"
                          value={form.location.latitude}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="-6.1630"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-700 mb-1">
                          Longitude
                        </label>
                        <input
                          name="location.longitude"
                          value={form.location.longitude}
                          onChange={handleChange}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="35.7516"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <GoogleMapPreview center={mapCenter} height="260px" />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Ramani inaonyesha location kulingana na latitude &
                        longitude ulizoweka.
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
                  >
                    {saving
                      ? sellerId
                        ? "Saving changes..."
                        : "Creating profile..."
                      : sellerId
                      ? "Save changes"
                      : "Create profile"}
                  </button>
                </div>
              </form>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === "products" && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Your products
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Hizi ni bidhaa zote zilizounganishwa na duka lako.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/products/new"
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold hover:bg-black"
                    >
                      + Add new product
                    </Link>
                    {sellerId && (
                      <Link
                        to={`/shops/${sellerId}`}
                        className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        View public shop
                      </Link>
                    )}
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="text-[11px] text-slate-500">
                    Loading your products...
                  </div>
                ) : productsError ? (
                  <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded">
                    {productsError}
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
                    You don&apos;t have any products yet. Start by adding a new
                    product.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    {myProducts.map((p) => {
                      const img = getMainProductImage(p);
                      return (
                        <article
                          key={p.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={p.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-[11px]">
                              No image
                            </div>
                          )}
                          <div className="p-3 flex flex-col gap-1 flex-1">
                            <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                              {p.name}
                            </h4>
                            <div className="text-[11px] text-slate-600">
                              {p.price} {p.currency}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {p.is_active ? "Active" : "Hidden"}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <Link
                                to={`/products/${p.id}`}
                                className="px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-black"
                              >
                                Preview
                              </Link>
                              <Link
                                to={`/products/${p.id}/edit`}
                                className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                Edit
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
