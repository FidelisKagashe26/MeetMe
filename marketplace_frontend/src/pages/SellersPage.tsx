// src/pages/SellersPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface SellerLocation {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

interface SellerProfile {
  id: number;
  business_name: string;
  description: string;
  phone_number: string;
  is_verified: boolean;
  rating: number;
  total_sales: number;
  location?: SellerLocation | null;
  // kama backend amerudisha distance (km) tunaweza kuitumia baadaye
  distance?: number | string | null;
}

interface PaginatedSellers {
  count: number;
  results: SellerProfile[];
}

type LoadMode = "all" | "search" | "nearby";

const SellersPage: React.FC = () => {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<LoadMode>("all");

  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);

  // helper: load sellers based on mode
  const loadSellers = async (
    options?: Partial<{
      mode: LoadMode;
      query: string;
      coords: { lat: number; lng: number };
      radius: number;
    }>
  ) => {
    const effectiveMode = options?.mode ?? mode;
    const q = options?.query ?? searchQuery;
    const c = options?.coords ?? coords;
    const r = options?.radius ?? radiusKm;

    try {
      setLoading(true);
      setError(null);

      if (effectiveMode === "nearby") {
        if (!c) {
          throw new Error("Hakuna location ya mtumiaji.");
        }

        // IMPORTANT: backend anahitaji `latitude` na `longitude`, sio `lat`/`lng`
        const res = await apiClient.get<SellerProfile[]>(
          "/api/sellers/nearby/",
          {
            params: {
              latitude: c.lat,
              longitude: c.lng,
              radius: r,
              limit: 30,
            },
          }
        );

        const list = res.data || [];
        setSellers(list);
        setTotalCount(list.length ?? null);

        // chagua default seller wa kwanza kwenye near me
        if (list.length > 0) {
          setSelectedSellerId(list[0].id);
        } else {
          setSelectedSellerId(null);
        }
      } else {
        // all or search
        const res = await apiClient.get<PaginatedSellers>("/api/sellers/", {
          params: q ? { search: q } : undefined,
        });
        setSellers(res.data.results || []);
        setTotalCount(res.data.count ?? null);

        // kwenye mode nyingine tusiforce selection ya seller
        setSelectedSellerId(null);
      }
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kupakia maduka. Jaribu tena baadae.");
    } finally {
      setLoading(false);
    }
  };

  // load ya kwanza (all sellers)
  useEffect(() => {
    void loadSellers({ mode: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    const newMode: LoadMode = trimmed ? "search" : "all";
    setMode(newMode);
    void loadSellers({
      mode: newMode,
      query: trimmed,
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setMode("all");
    void loadSellers({ mode: "all", query: "" });
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setError("Kifaa chako hakina msaada wa GPS (geolocation).");
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const newCoords = { lat, lng };
        setCoords(newCoords);
        setMode("nearby");

        void loadSellers({
          mode: "nearby",
          coords: newCoords,
        });

        setLocating(false);
      },
      (geoError) => {
        console.error(geoError);
        setLocating(false);
        setError(
          "Imeshindikana kupata location yako. Ruhusu browser kutumia location kisha jaribu tena."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value) && value > 0 && value <= 100) {
      setRadiusKm(value);
      if (mode === "nearby" && coords) {
        void loadSellers({
          mode: "nearby",
          coords,
          radius: value,
        });
      }
    }
  };

  const formatDistance = (distance: SellerProfile["distance"]) => {
    if (distance === null || distance === undefined) return null;
    const num =
      typeof distance === "string" ? parseFloat(distance) : Number(distance);
    if (Number.isNaN(num)) return null;
    if (num < 1) {
      return `${(num * 1000).toFixed(0)} m`;
    }
    return `${num.toFixed(1)} km`;
  };

  const buildMapSearchUrl = (seller: SellerProfile) => {
    const latitude = seller.location?.latitude;
    const longitude = seller.location?.longitude;
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return null;
    }

    const latNum =
      typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
    const lngNum =
      typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return null;
    }

    // kawaida kwa "open in maps" (tab mpya)
    return `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;
  };

  const buildDirectionsUrl = (seller: SellerProfile) => {
    const latitude = seller.location?.latitude;
    const longitude = seller.location?.longitude;
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return null;
    }

    const latNum =
      typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
    const lngNum =
      typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return null;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}`;
  };

  const buildMapEmbedUrl = (seller: SellerProfile | null) => {
    // kama tuna seller aliyechaguliwa, tutumie location yake
    let latitude: number | string | null | undefined = seller?.location?.latitude;
    let longitude: number | string | null | undefined = seller?.location?.longitude;

    // kama hakuna coords ya seller, tumia coords ya user (center tu)
    if (
      (latitude === null || latitude === undefined) &&
      (longitude === null || longitude === undefined) &&
      coords
    ) {
      latitude = coords.lat;
      longitude = coords.lng;
    }

    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return null;
    }

    const latNum =
      typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
    const lngNum =
      typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return null;
    }

    // Google Maps embed bila API key: pointer moja kwenye duka/center
    return `https://www.google.com/maps?q=${latNum},${lngNum}&z=14&output=embed`;
  };

  // reusable card kwa "all/search" mode
  const renderSellerGridCard = (seller: SellerProfile) => {
    const distanceLabel = formatDistance(seller.distance);
    const mapUrl = buildMapSearchUrl(seller);

    return (
      <Link
        key={seller.id}
        to={`/shops/${seller.id}`}
        className="group rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:border-orange-500/70 hover:shadow-md transition"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">
            {seller.business_name}
          </h2>
          {seller.is_verified && (
            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
          )}
        </div>

        {seller.location && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            {seller.location.city || ""}{" "}
            {seller.location.city && seller.location.country && "•"}{" "}
            {seller.location.country || ""}
          </div>
        )}

        {seller.description && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">
            {seller.description}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          <span>
            ⭐{" "}
            {Number.isFinite(seller.rating)
              ? seller.rating.toFixed(1)
              : seller.rating}{" "}
            • {seller.total_sales} sales
            {distanceLabel && mode === "nearby" && <> • {distanceLabel}</>}
          </span>
          {seller.phone_number && (
            <span className="truncate">{seller.phone_number}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px]">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              onClick={(e) => e.stopPropagation()}
            >
              Tazama kwenye ramani
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">
              Hakuna coordinates za ramani
            </span>
          )}

          <span className="text-slate-400 dark:text-slate-500">
            Fungua kuona bidhaa →
          </span>
        </div>
      </Link>
    );
  };

  // kwa near me tunataka list ya sellers wachache + ramani pembeni
  const nearbyLayout =
    mode === "nearby" && sellers.length > 0 ? (() => {
      const displayed = sellers.slice(0, 5);
      const selectedSeller =
        sellers.find((s) => s.id === selectedSellerId) || displayed[0] || null;
      const mapEmbedUrl = buildMapEmbedUrl(selectedSeller);

      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
          {/* List ya maduka max 5 */}
          <div className="space-y-3">
            {displayed.map((seller) => {
              const isSelected = seller.id === selectedSellerId;
              const distanceLabel = formatDistance(seller.distance);
              const directionsUrl = buildDirectionsUrl(seller);

              return (
                <button
                  key={seller.id}
                  type="button"
                  onClick={() => setSelectedSellerId(seller.id)}
                  className={`w-full text-left rounded-2xl border p-4 shadow-sm transition ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10"
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {seller.business_name}
                    </h2>
                    {seller.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Verified
                      </span>
                    )}
                  </div>

                  {seller.location && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {seller.location.city || ""}{" "}
                      {seller.location.city &&
                        seller.location.country &&
                        "•"}{" "}
                      {seller.location.country || ""}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>
                      ⭐{" "}
                      {Number.isFinite(seller.rating)
                        ? seller.rating.toFixed(1)
                        : seller.rating}{" "}
                      • {seller.total_sales} sales
                      {distanceLabel && <> • {distanceLabel}</>}
                    </span>
                    {seller.phone_number && (
                      <span className="truncate">{seller.phone_number}</span>
                    )}
                  </div>

                  {seller.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {seller.description}
                    </p>
                  )}

                  {/* Quick actions: simu, directions, bidhaa */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {seller.phone_number && (
                      <a
                        href={`tel:${seller.phone_number}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-600"
                      >
                        Piga simu
                      </a>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-600"
                      >
                        Maelekezo
                      </a>
                    )}
                    <Link
                      to={`/shops/${seller.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                    >
                      Angalia bidhaa
                    </Link>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ramani upande wa kulia */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-[340px] sm:h-[380px]">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Ramani ya maduka karibu na wewe
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bofya duka upande wa kushoto kuona pointer yake kwenye ramani.
                </p>
              </div>
              {selectedSellerId && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Duka lililochaguliwa:{" "}
                  <span className="font-medium">
                    {
                      sellers.find((s) => s.id === selectedSellerId)
                        ?.business_name
                    }
                  </span>
                </span>
              )}
            </div>
            {mapEmbedUrl ? (
              <iframe
                title="Sellers near me map"
                src={mapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 px-4 text-center">
                Hakuna coordinates kamili za ramani kwa duka lililochaguliwa.
                Hakikisha maduka yana latitude/longitude kwenye backend.
              </div>
            )}
          </div>
        </div>
      );
    })() : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Title + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Sellers kwenye LINKA
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tafuta wauzaji kwa jina, mji, nchi au tumia{" "}
                <span className="font-semibold text-orange-600">
                  near me
                </span>{" "}
                kuona maduka yaliyo karibu na ulipo.
              </p>
              {typeof totalCount === "number" && (
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Jumla ya maduka:{" "}
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {totalCount}
                  </span>
                  {mode === "nearby" && " (karibu na wewe)"}
                </p>
              )}
            </div>

            {/* Quick mode badges */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span
                className={`px-2.5 py-1 rounded-full border ${
                  mode === "all"
                    ? "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-500/10"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300"
                }`}
              >
                Orodha yote
              </span>
              {mode === "nearby" && (
                <span className="px-2.5 py-1 rounded-full border border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10">
                  Near me: {radiusKm} km
                </span>
              )}
            </div>
          </div>

          {/* Search + Near me controls */}
          <div className="mb-5 space-y-3">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tafuta seller kwa jina, mji, nchi..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white pr-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-2 my-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Futa
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600"
              >
                Tafuta
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNearMe}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-600 disabled:opacity-60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {locating ? "Inatafuta location yako..." : "Sellers near me"}
                </button>

                {mode === "nearby" && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Radius:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={radiusKm}
                      onChange={handleRadiusChange}
                      className="w-14 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white"
                    />
                    <span>km</span>
                  </div>
                )}
              </div>

              {coords && (
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  Location yako imekadiriwa:{" "}
                  <span className="font-mono">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* List / loading states */}
          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Inapakia maduka...
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Hakuna seller aliyeonekana kwa vigezo ulivyoweka.
            </div>
          ) : mode === "nearby" && nearbyLayout ? (
            nearbyLayout
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.map((seller) => renderSellerGridCard(seller))}
            </div>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default SellersPage;
