// src/pages/OrderCreatePage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

interface ProductImage {
  id: number;
  image: string;
  image_url?: string | null;
  is_primary?: boolean;
}

interface ProductSummary {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url: string | null;
  image?: string | null;
  shop_name?: string;
  city?: string;
  is_available?: boolean;
  seller_id?: number;
  // gallery kutoka backend
  images?: ProductImage[];
}

interface OrderCreatePayload {
  product: number;
  quantity: number;
  note?: string;
  delivery_address?: string;
  contact_phone?: string;
}

const OrderCreatePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const productIdParam = searchParams.get("product");

  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(true);
  const [productError, setProductError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // If user is not logged in, send them to login
  useEffect(() => {
    if (!user) {
      const nextUrl = productIdParam
        ? `/orders/new?product=${productIdParam}`
        : "/orders/new";

      navigate(`/login?next=${encodeURIComponent(nextUrl)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProduct = async () => {
    if (!productIdParam) {
      setProductError("No product selected for order.");
      setLoadingProduct(false);
      return;
    }

    setLoadingProduct(true);
    setProductError(null);

    try {
      const res = await apiClient.get<ProductSummary>(
        `/api/products/${productIdParam}/`
      );
      setProduct(res.data);
    } catch (err) {
      console.error(err);
      setProductError("Failed to load product information.");
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !user) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const payload: OrderCreatePayload = {
      product: product.id,
      quantity,
      delivery_address: deliveryAddress || undefined,
      contact_phone: contactPhone || undefined,
      note: note || undefined,
    };

    try {
      await apiClient.post("/api/orders/", payload);
      setSubmitSuccess(
        "Order placed successfully. The seller will contact you soon."
      );
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sellerId = product?.seller_id;

  // chukua picha kuu: field za juu + gallery
  const getMainImage = (p: ProductSummary | null): string | null => {
    if (!p) return null;

    const primary =
      p.images?.find((img) => img.is_primary) ?? p.images?.[0];

    return (
      p.image_url ||
      p.image ||
      (primary ? primary.image_url || primary.image : null) ||
      null
    );
  };

  const mainImage = getMainImage(product);

  // order total (numeric) – tukionyesha chini ya unit price
  const unitPrice = product ? Number(product.price) : 0;
  const orderTotal =
    product && !Number.isNaN(unitPrice) ? unitPrice * quantity : 0;

  const formattedTotal =
    orderTotal > 0
      ? orderTotal.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : "0";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      {/* upana mkubwa zaidi desktop: max-w-7xl + lg:px-8 */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-5">
        {/* Breadcrumb */}
        <div className="mb-3 text-[11px] text-slate-500 flex items-center gap-1">
          <Link to="/products" className="hover:text-orange-600 hover:underline">
            Products
          </Link>
          <span>/</span>
          <span className="text-slate-700">Place order</span>
        </div>

        {/* Desktop: product kushoto, form kulia; mobile: stack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PRODUCT SUMMARY */}
          <section className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Product summary
              </h2>
              {sellerId && (
                <Link
                  to={`/shops/${sellerId}`}
                  className="text-[11px] text-orange-600 hover:underline"
                >
                  Visit full shop
                </Link>
              )}
            </div>

            <div className="p-4 flex flex-col gap-3">
              {loadingProduct ? (
                <div className="text-sm text-slate-600">Loading product...</div>
              ) : productError || !product ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
                  {productError || "Product not found."}
                </div>
              ) : (
                <>
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-52 md:h-60 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      No image
                    </div>
                  )}

                  <div>
                    <h1 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {product.name}
                    </h1>
                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-3">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-1">
                    <div>
                      <div className="text-slate-500 text-[11px]">
                        Unit price
                      </div>
                      <div className="text-base font-bold text-orange-600">
                        {product.price} {product.currency}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        Qty: <span className="font-semibold">{quantity}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Total:{" "}
                        <span className="font-semibold text-slate-900">
                          {formattedTotal} {product.currency}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      {product.shop_name && (
                        <div className="font-medium text-slate-700">
                          {product.shop_name}
                        </div>
                      )}
                      {product.city && <div>{product.city}</div>}
                      {product.is_available === false && (
                        <div className="text-red-500 font-semibold mt-1">
                          Out of stock
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ORDER FORM */}
          <section className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Confirm your order
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Fill in the details below so the seller can deliver or arrange
                pickup with you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Quantity */}
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value)))
                  }
                  className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  required
                />
                {product && !Number.isNaN(unitPrice) && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Estimated total:{" "}
                    <span className="font-semibold text-slate-900">
                      {formattedTotal} {product.currency}
                    </span>
                  </p>
                )}
              </div>

              {/* Delivery address */}
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Delivery or meeting address
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  rows={2}
                  placeholder="Where should the seller deliver or where will you meet?"
                />
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="+2557..."
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  The seller will use this number to contact you about the order.
                </p>
              </div>

              {/* Note to seller */}
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Note to the seller (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  rows={3}
                  placeholder="Example: I prefer black color, can we meet tomorrow afternoon?"
                />
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded-lg">
                  {submitSuccess}
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="submit"
                  disabled={
                    submitting || !product || product.is_available === false
                  }
                  className="px-4 py-2 rounded-full bg-slate-900 text-white font-semibold hover:bg-black disabled:opacity-60"
                >
                  {submitting ? "Placing order..." : "Place order"}
                </button>
                <Link
                  to={product ? `/products/${product.id}` : "/products"}
                  className="px-3 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Back to product
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default OrderCreatePage;
