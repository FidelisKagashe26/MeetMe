// src/components/MainFooter.tsx
import React from "react";
import { Link } from "react-router-dom";

const MainFooter: React.FC = () => {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
        <div>
          <h3 className="font-semibold text-slate-800 mb-2">
            Marketplace
          </h3>
          <p className="text-[11px] text-slate-500">
            Tafuta bidhaa kutoka kwa wauzaji mbalimbali, linganisha bei,
            kisha chagua duka lililo karibu zaidi na wewe.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 mb-2">
            Quick links
          </h4>
          <div className="flex flex-col gap-1 text-[11px] text-slate-500">
            <Link to="/products" className="hover:text-orange-600">
              Browse products
            </Link>
            <Link to="/products/nearby" className="hover:text-orange-600">
              Products near me
            </Link>
            <Link to="/seller-profile" className="hover:text-orange-600">
              Become a seller
            </Link>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 mb-2">
            Help &amp; support
          </h4>
          <div className="flex flex-col gap-1 text-[11px] text-slate-500">
            <span>WhatsApp: +255 7xx xxx xxx</span>
            <span>Email: support@example.com</span>
            <span className="text-slate-400">
              Tunakuunganisha na maduka karibu yako.
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} Marketplace. All rights reserved.</span>
          <span>Built for local buyers &amp; sellers.</span>
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;
