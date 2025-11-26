// src/components/MainHeader.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const MainHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "text-orange-600 font-semibold" : "text-slate-600";

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-100 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* LOGO / BRAND */}
        <Link
          to="/"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            M
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              Marketplace
            </div>
            <div className="text-[11px] text-slate-400">
              Tafuta bidhaa, pata duka lililo karibu
            </div>
          </div>
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-5 text-xs">
          <Link to="/" className={isActive("/")}>
            Home
          </Link>
          <Link to="/products" className={isActive("/products")}>
            Browse Products
          </Link>
          <Link to="/products/nearby" className={isActive("/products/nearby")}>
            Nearby
          </Link>
          <Link to="/seller-profile" className={isActive("/seller-profile")}>
            Sell on Marketplace
          </Link>
        </nav>

        {/* AUTH AREA */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-full border border-orange-500 text-orange-600 text-xs font-medium hover:bg-orange-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 shadow-sm"
            >
                Create account
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-500">
                Hi,{" "}
                <span className="font-semibold text-slate-700">
                  {user.first_name || user.username}
                </span>
              </span>
              <Link
                to="/seller-profile"
                className="px-3 py-1.5 rounded-full border border-orange-500 text-orange-600 text-xs font-medium hover:bg-orange-50"
              >
                Seller area
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
