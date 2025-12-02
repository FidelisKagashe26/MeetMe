// src/components/MainHeader.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../lib/apiClient";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemeMode } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { FiSun, FiMoon } from "react-icons/fi";
import { LuMonitor } from "react-icons/lu";

type BackendTheme = "light" | "dark" | "system" | "auto";

interface ProfileSettings {
  is_seller: boolean;
  preferred_language: "en" | "sw";
  theme: BackendTheme;
}

interface SellerProfile {
  id: number;
  business_name: string;
  description?: string;
  phone_number?: string;
  is_verified?: boolean;
  rating?: string | number;
  total_sales?: number;
  location?: {
    city?: string;
    country?: string;
  };
}

interface Notification {
  id: number;
  is_read: boolean;
  title?: string;
  body?: string;
  notif_type?: string;
  created_at?: string;
}

interface PaginatedNotificationResponse {
  count: number;
  results: Notification[];
}

const mapBackendThemeToMode = (value: BackendTheme | undefined): ThemeMode => {
  if (!value) return "auto";
  if (value === "light" || value === "dark") return value;
  // system/auto => auto
  return "auto";
};

const MainHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { mode, setMode } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [profileSettings, setProfileSettings] =
    useState<ProfileSettings | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(
    null
  );

  // ================= LOAD PROFILE SETTINGS & SELLER PROFILE =================
  useEffect(() => {
    if (!user) {
      setProfileSettings(null);
      setSellerProfile(null);
      setUnreadCount(0);
      return;
    }

    const load = async () => {
      try {
        const [settingsRes, sellerRes] = await Promise.allSettled([
          apiClient.get<ProfileSettings>("/api/auth/settings/"),
          apiClient.get<SellerProfile>("/api/sellers/me/"),
        ]);

        if (settingsRes.status === "fulfilled") {
          const data = settingsRes.value.data;
          setProfileSettings(data);

          // sync language kutoka backend kama ipo
          if (
            data.preferred_language &&
            data.preferred_language !== language
          ) {
            setLanguage(data.preferred_language);
          }

          // sync theme kutoka backend kama default wakati anaingia
          if (data.theme) {
            const newMode = mapBackendThemeToMode(data.theme);
            if (newMode !== mode) {
              setMode(newMode);
            }
          }
        }

        if (sellerRes.status === "fulfilled") {
          setSellerProfile(sellerRes.value.data);
        }
      } catch {
        // silent
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ================= NOTIFICATIONS =================
  const fetchNotifications = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoadingNotifications(true);
      const res = await apiClient.get<PaginatedNotificationResponse>(
        "/api/notifications/"
      );
      const unread = (res.data.results || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // ignore
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ================= HELPERS =================
  const isActive = (path: string) => {
    const active =
      location.pathname === path ||
      (path !== "/" && location.pathname.startsWith(path + "/"));

    return active
      ? "text-orange-600 dark:text-orange-400 font-semibold"
      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white";
  };

  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username;
  }, [user]);

  const sellerName = sellerProfile?.business_name || "";
  const avatarUrl: string | null = null;

  const initials = useMemo(() => {
    const base = sellerName || displayName || "L";
    return base.trim().charAt(0).toUpperCase();
  }, [sellerName, displayName]);

  const isSeller = profileSettings?.is_seller ?? false;

  // Hapa header buttons NI FRONTEND ONLY (hakuna PATCH backend)
  const handleChangeLanguage = (lang: "en" | "sw") => {
    setLanguage(lang);
  };

  const handleChangeTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const handleLogout = async () => {
    setDesktopProfileOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  // ================= RENDER =================
  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3">
        {/* LEFT: BRAND */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/products" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 via-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              L
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                LINKER
              </div>
              <div className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500">
                {language === "sw"
                  ? "Tafuta bidhaa, pata duka karibu"
                  : "Find products, shop nearby"}
              </div>
            </div>
          </Link>
        </div>

        {/* CENTER: DESKTOP NAV (kuanzia karibu na logo) */}
        <nav className="hidden md:flex items-center gap-4 text-[11px] ml-4">
          <Link to="/products" className={isActive("/products")}>
            {language === "sw" ? "Bidhaa" : "Products"}
          </Link>
          <Link
            to="/products/nearby"
            className={isActive("/products/nearby")}
          >
            {language === "sw" ? "Bidhaa karibu" : "Near products"}
          </Link>
          <Link to="/sellers" className={isActive("/sellers")}>
            {language === "sw" ? "Wauzaji" : "Sellers"}
          </Link>
          <Link
            to="/seller-profile"
            className={isActive("/seller-profile")}
          >
            {language === "sw" ? "Uza kwenye LINKER" : "Sell on LINKER"}
          </Link>
        </nav>

        {/* RIGHT: ACTIONS (push kulia) */}
        <div className="flex items-center gap-2 ml-auto">
          {/* DESKTOP: LANGUAGE + THEME */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Language switch */}
            <div className="flex items-center text-[10px] rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/80 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => handleChangeLanguage("en")}
                className={`px-2 py-1 ${
                  language === "en"
                    ? "bg-slate-900 text-white dark:bg-orange-500"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleChangeLanguage("sw")}
                className={`px-2 py-1 ${
                  language === "sw"
                    ? "bg-slate-900 text-white dark:bg-orange-500"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                SW
              </button>
            </div>

            {/* Theme */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300">
              <button
                type="button"
                onClick={() => handleChangeTheme("light")}
                className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                  mode === "light"
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                title="Light"
              >
                <FiSun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme("auto")}
                className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] ${
                  mode === "auto"
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                title="Auto (system / time)"
              >
                <LuMonitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme("dark")}
                className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                  mode === "dark"
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                title="Dark"
              >
                <FiMoon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DESKTOP: NOTIFICATIONS + PROFILE/LOGIN */}
          <div className="hidden md:flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  loadingNotifications ? "opacity-70 cursor-wait" : ""
                }`}
                aria-busy={loadingNotifications}
              >
                <span className="sr-only">Notifications</span>
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M15 17h5l-1.5-2V11a6.5 6.5 0 0 0-13 0v4L4 17h5"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 17a2 2 0 0 0 4 0"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            {!user ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-full border border-orange-500 text-orange-600 text-[11px] font-medium hover:bg-orange-50 dark:hover:bg-orange-500/10"
                >
                  {language === "sw" ? "Ingia" : "Login"}
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-[11px] font-medium hover:bg-orange-600 shadow-sm"
                >
                  {language === "sw" ? "Fungua akaunti" : "Create account"}
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDesktopProfileOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {language === "sw" ? "Umeingia kama" : "Logged in as"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 max-w-[140px] truncate">
                      {sellerName || displayName}
                    </span>
                  </div>
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden sm:block"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M8 10l4 4 4-4"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {desktopProfileOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-2 text-xs z-40">
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {isSeller
                            ? sellerName ||
                              (language === "sw" ? "Muuzaji" : "Seller")
                            : language === "sw"
                            ? "Mnunuaji"
                            : "Buyer"}
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopProfileOpen(false);
                          navigate("/account/profile");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        <span className="w-4 h-4 inline-flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M4 20.5a7.5 7.5 0 0 1 16 0"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span>
                          {language === "sw"
                            ? "Wasifu wa mtumiaji"
                            : "My profile"}
                        </span>
                      </button>

                      {isSeller && (
                        <button
                          type="button"
                          onClick={() => {
                            setDesktopProfileOpen(false);
                            navigate("/seller-profile");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          <span className="w-4 h-4 inline-flex items-center justify-center">
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <rect
                                x="3.5"
                                y="5"
                                width="17"
                                height="14"
                                rx="2"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M7 9h6M7 13h4"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span>
                            {language === "sw"
                              ? "Wasifu wa biashara"
                              : "Business profile"}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDesktopProfileOpen(false);
                          navigate("/account/change-password");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        <span className="w-4 h-4 inline-flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="M7 11V8a5 5 0 0 1 10 0v3"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <rect
                              x="5"
                              y="11"
                              width="14"
                              height="9"
                              rx="2"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M12 14v2"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span>
                          {language === "sw"
                            ? "Badili neno la siri"
                            : "Change password"}
                        </span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-[11px] font-medium"
                      >
                        <span className="w-4 h-4 inline-flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="M15 12H4"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                            <path
                              d="M11 8L15 12L11 16"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 4H17C18.104 4 19 4.896 19 6V18C19 19.104 18.104 20 17 20H8"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span>
                          {language === "sw" ? "Toka (Logout)" : "Logout"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MOBILE MENU BUTTON (hamburger icon) */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80"
            onClick={toggleMobileMenu}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98">
          <div className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-3 text-[11px]">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isSeller
                      ? sellerName ||
                        (language === "sw" ? "Muuzaji" : "Seller")
                      : language === "sw"
                      ? "Mnunuaji"
                      : "Buyer"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === "sw"
                    ? "Karibu LINKER"
                    : "Welcome to LINKER"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="px-3 py-1.5 rounded-full border border-orange-500 text-orange-600 text-[11px] font-medium"
                  >
                    {language === "sw" ? "Ingia" : "Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/register");
                    }}
                    className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-[11px] font-medium"
                  >
                    {language === "sw" ? "Jisajili" : "Register"}
                  </button>
                </div>
              </div>
            )}

            {/* NAV LINKS (MOBILE) */}
            <nav className="flex flex-col gap-1 text-[11px]">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 ${isActive("/products")}`}
              >
                {language === "sw" ? "Bidhaa" : "Products"}
              </Link>
              <Link
                to="/products/nearby"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 ${isActive("/products/nearby")}`}
              >
                {language === "sw" ? "Bidhaa karibu" : "Near products"}
              </Link>
              <Link
                to="/sellers"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 ${isActive("/sellers")}`}
              >
                {language === "sw" ? "Wauzaji" : "Sellers"}
              </Link>
              <Link
                to="/seller-profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 ${isActive("/seller-profile")}`}
              >
                {language === "sw" ? "Uza kwenye LINKER" : "Sell on LINKER"}
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/notifications");
                  }}
                  className="flex items-center justify-between py-1.5 text-slate-600 dark:text-slate-200"
                >
                  <span>
                    {language === "sw" ? "Arifa" : "Notifications"}
                  </span>
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] text-white font-semibold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {/* LANGUAGE + THEME (MOBILE) */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Language
                </span>
                <div className="flex items-center text-[11px] rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/90 dark:bg-slate-900/90">
                  <button
                    type="button"
                    onClick={() => handleChangeLanguage("en")}
                    className={`px-2 py-1 ${
                      language === "en"
                        ? "bg-slate-900 text-white dark:bg-orange-500"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeLanguage("sw")}
                    className={`px-2 py-1 ${
                      language === "sw"
                        ? "bg-slate-900 text-white dark:bg-orange-500"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    SW
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Theme
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => handleChangeTheme("light")}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                      mode === "light"
                        ? "border-orange-500 text-orange-500"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                    title="Light"
                  >
                    <FiSun className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeTheme("auto")}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                      mode === "auto"
                        ? "border-orange-500 text-orange-500"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                    title="Auto"
                  >
                    <LuMonitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeTheme("dark")}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                      mode === "dark"
                        ? "border-orange-500 text-orange-500"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                    title="Dark"
                  >
                    <FiMoon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* LOGOUT (MOBILE) */}
            {user && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-[11px] font-medium rounded-full"
                >
                  {language === "sw" ? "Toka (Logout)" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default MainHeader;
