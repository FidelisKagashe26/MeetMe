// src/components/MainHeader.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../lib/apiClient";

interface ProfileSettings {
  is_seller: boolean;
  preferred_language: "en" | "sw";
  theme: "light" | "dark" | "system";
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

const applyThemeToDocument = (theme: "light" | "dark" | "system") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    return;
  }
  root.classList.toggle("dark", theme === "dark");
};

const MainHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [language, setLanguage] = useState<"en" | "sw">("sw");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(
    null
  );
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  // ====== Initial local settings (localStorage) ======
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("linka_lang") as "en" | "sw" | null;
      const savedTheme = localStorage.getItem("linka_theme") as
        | "light"
        | "dark"
        | "system"
        | null;

      if (savedLang) setLanguage(savedLang);
      if (savedTheme) setTheme(savedTheme);
    } catch {
      // ignore
    }
  }, []);

  // ====== Load settings & seller profile from backend when user available ======
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

          if (data.preferred_language) {
            setLanguage(data.preferred_language);
          }
          if (data.theme) {
            setTheme(data.theme);
          }
        }

        if (sellerRes.status === "fulfilled") {
          setSellerProfile(sellerRes.value.data);
        }
      } catch {
        // ignore silently
      }
    };

    load();
  }, [user]);

  // ====== Apply theme to <html> ======
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem("linka_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // ====== Persist language locally ======
  useEffect(() => {
    try {
      localStorage.setItem("linka_lang", language);
    } catch {
      // ignore
    }
  }, [language]);

  // ====== Notifications ======
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
    fetchNotifications();
    // optional: unaweza kuongeza polling kama utahitaji
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const sellerName = sellerProfile?.business_name;
  const avatarUrl: string | null = null; // kwa sasa hatuna avatar/ logo URL kutoka backend

  const initials = useMemo(() => {
    const base = sellerName || displayName || "L";
    return base.trim().charAt(0).toUpperCase();
  }, [sellerName, displayName]);

  const isSeller = profileSettings?.is_seller ?? false;

  const handleChangeLanguage = async (lang: "en" | "sw") => {
    setLanguage(lang);
    if (!user) return;

    try {
      await apiClient.patch("/api/auth/settings/", {
        preferred_language: lang,
      });
    } catch {
      // ignore
    }
  };

  const handleChangeTheme = async (mode: "light" | "dark" | "system") => {
    setTheme(mode);
    if (!user) return;

    try {
      await apiClient.patch("/api/auth/settings/", {
        theme: mode,
      });
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* LEFT: BRAND + MOBILE MENU */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex md:hidden items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  d="M6 6l12 12M6 18L18 6"
                />
              ) : (
                <path
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  d="M3 6h18M3 12h18M3 18h12"
                />
              )}
            </svg>
          </button>

          {/* LOGO / BRAND */}
          <Link to="/products" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              L
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                LINKA
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                Tafuta bidhaa, pata duka karibu
              </div>
            </div>
          </Link>
        </div>

        {/* CENTER: NAV LINKS (DESKTOP) */}
        <nav className="hidden md:flex items-center gap-5 text-xs">
          <Link to="/products" className={isActive("/products")}>
            Products
          </Link>
          <Link to="/products/nearby" className={isActive("/products/nearby")}>
            Near Products
          </Link>
          <Link to="/sellers" className={isActive("/sellers")}>
            Sellers
          </Link>
          <Link to="/seller-profile" className={isActive("/seller-profile")}>
            Sell on LINKA
          </Link>
        </nav>

        {/* RIGHT: ACTIONS / AUTH AREA */}
        <div className="flex items-center gap-2">
          {/* DESKTOP: Language + Theme */}
          <div className="hidden lg:flex items-center gap-2 mr-1">
            {/* Language switch */}
            <div className="flex items-center text-[11px] rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => handleChangeLanguage("en")}
                className={`px-2 py-1 ${
                  language === "en"
                    ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleChangeLanguage("sw")}
                className={`px-2 py-1 ${
                  language === "sw"
                    ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300"
                }`}
              >
                SW
              </button>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-300 text-xs">
              <button
                type="button"
                onClick={() => handleChangeTheme("light")}
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  theme === "light"
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* sun */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="3.5" strokeWidth="1.6" />
                  <path
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    d="M12 3v2.5M12 18.5V21M4.22 4.22L5.9 5.9M18.1 18.1l1.68 1.68M3 12h2.5M18.5 12H21M4.22 19.78L5.9 18.1M18.1 5.9l1.68-1.68"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme("dark")}
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  theme === "dark"
                    ? "border-orange-500 text-orange-500"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* moon */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    d="M20 13.5A7.5 7.5 0 0 1 11.5 5a7.5 7.5 0 1 0 8.5 8.5Z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS ICON (only when logged in) */}
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

          {/* AUTH AREA */}
          {!user ? (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-full border border-orange-500 text-orange-600 text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-500/10"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 shadow-sm"
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {/* Avatar */}
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
                {/* Name + role (desktop) */}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === "sw" ? "Umeingia kama" : "Logged in as"}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[140px] truncate">
                    {sellerName || displayName}
                  </span>
                </div>
                {/* Chevron */}
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

              {/* PROFILE DROPDOWN */}
              {profileOpen && (
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
                        setProfileOpen(false);
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
                        {language === "sw" ? "Wasifu wa mtumiaji" : "My profile"}
                      </span>
                    </button>

                    {isSeller && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("/seller-profile");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        <span className="w-4 h-4 inline-flex items-center justifyCenter">
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
                        setProfileOpen(false);
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

                  {/* MOBILE/TABLET: LANG + THEME INSIDE DROPDOWN */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 pb-1 lg:hidden">
                    <div className="px-3 mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {language === "sw" ? "Mpangilio" : "Preferences"}
                    </div>
                    <div className="px-3 flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Language
                      </span>
                      <div className="flex items-center text-[11px] rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleChangeLanguage("en")}
                          className={`px-2 py-1 ${
                            language === "en"
                              ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeLanguage("sw")}
                          className={`px-2 py-1 ${
                            language === "sw"
                              ? "bg-slate-900 text-white dark:bg-orange-500 dark:text-white"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          SW
                        </button>
                      </div>
                    </div>
                    <div className="px-3 flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Theme
                      </span>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-300 text-xs">
                        <button
                          type="button"
                          onClick={() => handleChangeTheme("light")}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                            theme === "light"
                              ? "border-orange-500 text-orange-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {/* sun */}
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <circle cx="12" cy="12" r="3.5" strokeWidth="1.5" />
                            <path
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              d="M12 3v2.5M12 18.5V21M4.22 4.22L5.9 5.9M18.1 18.1l1.68 1.68M3 12h2.5M18.5 12H21M4.22 19.78L5.9 18.1M18.1 5.9l1.68-1.68"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeTheme("dark")}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                            theme === "dark"
                              ? "border-orange-500 text-orange-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {/* moon */}
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              d="M20 13.5A7.5 7.5 0 0 1 11.5 5a7.5 7.5 0 1 0 8.5 8.5Z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeTheme("system")}
                          className={`px-2 h-7 rounded-full border text-[11px] ${
                            theme === "system"
                              ? "border-orange-500 text-orange-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          Sys
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-medium"
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
                      <span>{language === "sw" ? "Toka (Logout)" : "Logout"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE NAV DROPDOWN */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
          <nav className="max-w-6xl mx-auto px-3 py-2 flex flex-col gap-1 text-xs">
            <Link
              to="/products"
              onClick={() => setMobileOpen(false)}
              className={`py-1.5 ${isActive("/products")}`}
            >
              Products
            </Link>
            <Link
              to="/products/nearby"
              onClick={() => setMobileOpen(false)}
              className={`py-1.5 ${isActive("/products/nearby")}`}
            >
              Near Products
            </Link>
            <Link
              to="/sellers"
              onClick={() => setMobileOpen(false)}
              className={`py-1.5 ${isActive("/sellers")}`}
            >
              Sellers
            </Link>
            <Link
              to="/seller-profile"
              onClick={() => setMobileOpen(false)}
              className={`py-1.5 ${isActive("/seller-profile")}`}
            >
              Sell on LINKA
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default MainHeader;
