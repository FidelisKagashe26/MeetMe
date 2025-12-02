// src/components/MainFooter.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

const MainFooter: React.FC = () => {
  const year = new Date().getFullYear();
  const { language } = useLanguage();

  const isSw = language === "sw";

  return (
    <footer className="mt-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isSw ? "Marketplace ya LINKER" : "LINKER Marketplace"}
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {isSw
              ? "Tafuta bidhaa kutoka kwa wauzaji mbalimbali, linganisha bei, kisha chagua duka lililo karibu zaidi na wewe."
              : "Search products from different sellers, compare prices and choose a shop closest to you."}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isSw ? "Kurasa muhimu" : "Quick links"}
          </h4>
          <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
            <Link
              to="/products"
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              {isSw ? "Vinjari bidhaa" : "Browse products"}
            </Link>
            <Link
              to="/products/nearby"
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              {isSw ? "Bidhaa karibu nami" : "Products near me"}
            </Link>
            <Link
              to="/seller-profile"
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              {isSw ? "Jiunge kama muuzaji" : "Become a seller"}
            </Link>
            <Link
              to="/notifications"
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              {isSw ? "Arifa" : "Notifications"}
            </Link>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {isSw ? "Msaada & Mawasiliano" : "Help & support"}
          </h4>
          <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
            <span>
              WhatsApp:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                +255 7xx xxx xxx
              </span>
            </span>
            <span>
              Email:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                support@example.com
              </span>
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              {isSw
                ? "Tunakuunganisha na maduka karibu yako."
                : "We connect you with nearby shops."}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="text-center sm:text-left">
            © {year} LINKER.{" "}
            {isSw ? "Haki zote zimehifadhiwa." : "All rights reserved."}
          </span>
          <span className="text-center sm:text-right">
            {isSw
              ? "Imejengwa kwa wanunuaji na wauzaji wa ndani."
              : "Built for local buyers & sellers."}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;
