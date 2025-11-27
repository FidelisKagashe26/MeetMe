// src/pages/MyProductsPage.tsx
import React, { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url?: string | null;
  image?: string | null;
  city?: string | null;
  is_available?: boolean;
}

const MyProductsPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<Product[]>("/api/products/mine/");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kupakia products zako. Jaribu tena baadae.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMyProducts();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 max-w-sm text-center">
            Tafadhali login kwanza ili kuona products zako.
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              My products
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Orodha ya products unazouza kwenye LINKA marketplace.
            </p>
          </div>
          <Link
            to="/products/new"
            className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600"
          >
            + Add new product
          </Link>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-600">Inapakia products...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-slate-600 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            Huna product yoyote bado. Anza kwa kubofya{" "}
            <span className="font-semibold">“Add new product”</span>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
              >
                {product.image_url || product.image ? (
                  <img
                    src={product.image_url || product.image || ""}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                    No image
                  </div>
                )}

                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {product.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-orange-500">
                      {product.price} {product.currency}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {product.city || "—"}
                    </span>
                  </div>

                  {product.is_available === false && (
                    <span className="mt-1 text-[10px] text-red-500 font-semibold">
                      Out of stock
                    </span>
                  )}

                  <div className="mt-3 flex justify-between gap-2 text-[11px]">
                    <Link
                      to={`/products/${product.id}`}
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-black"
                    >
                      View
                    </Link>
                    <Link
                      to={`/products/${product.id}/edit`}
                      className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <MainFooter />
    </div>
  );
};

export default MyProductsPage;
