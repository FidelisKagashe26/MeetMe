// src/pages/OrderDetailPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";

interface PartyUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

type BuyerInfo = PartyUser;
type SellerUser = PartyUser;

interface SellerInfo {
  id: number;
  business_name: string;
  description?: string;
  phone_number?: string;
  is_verified?: boolean;
  logo_url?: string | null;
  city?: string;
  country?: string;
  user?: SellerUser | null;
}

interface OrderProduct {
  id: number;
  name: string;
  price: string;
  currency: string;
  image_url?: string | null;
  shop_name: string;
}

type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

interface OrderDetail {
  id: number;
  product: OrderProduct;
  buyer: BuyerInfo;
  seller: SellerInfo;
  quantity: number;
  unit_price: string;
  total_price: string;
  status: OrderStatus;
  delivery_address?: string;
  contact_phone?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatMoney = (amount?: string, currency?: string) => {
  if (!amount) return "-";
  return `${amount} ${currency || ""}`.trim();
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError("Order haijapatikana.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<OrderDetail>(`/api/orders/${id}/`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kupakia taarifa za order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const orderNumber = order?.id ? `#${order.id}` : "Order";

  const buyer = order?.buyer || null;
  const seller = order?.seller || null;

  const isBuyer =
    !!user && buyer && typeof buyer.id === "number" && buyer.id === user.id;
  const isSellerUser =
    !!user &&
    seller &&
    ((seller.user && seller.user.id === user.id) || seller.id === user.id);

  const roleLabel = isBuyer
    ? "You are the buyer in this order."
    : isSellerUser
    ? "You are the seller in this order."
    : "You are viewing this order as a viewer.";

  const getPartyName = (p?: PartyUser | null) => {
    if (!p) return "-";
    const full = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    if (full) return full;
    if (p.username) return p.username;
    return p.email || "-";
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/orders");
    }
  };

  const handleOpenChat = () => {
    if (!order) return;
    // Ina-link kwenye ChatPage ambayo inatumia WebSocket kwa realtime
    const params = new URLSearchParams();
    params.set("product", String(order.product.id));
    params.set("seller", String(order.seller.id));
    params.set("order", String(order.id)); // future: ukitaka specific conversation per order
    navigate(`/chat?${params.toString()}`);
  };

  const product = order?.product;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          {/* Top bar / breadcrumb */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <button
                type="button"
                onClick={handleBack}
                className="text-slate-500 dark:text-slate-400 hover:text-orange-600 hover:underline"
              >
                Orders
              </button>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-200 line-clamp-1">
                {orderNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {order?.status && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-medium capitalize">
                  Status: {order.status}
                </span>
              )}
            </div>
          </div>

          {/* Heading */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Order {orderNumber}
              </h1>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                {roleLabel}
              </p>
            </div>
            {order && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {order.created_at && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Created: {formatDateTime(order.created_at)}
                  </span>
                )}
                {order.updated_at && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Updated: {formatDateTime(order.updated_at)}
                  </span>
                )}
              </div>
            )}
          </header>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              Inapakia taarifa za order...
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-500/40 shadow-sm px-4 py-6 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : !order ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              Order haijapatikana.
            </div>
          ) : (
            <>
              {/* SUMMARY + PARTIES */}
              <section className="grid gap-4 md:grid-cols-3">
                {/* Summary card */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Order summary
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-[12px] text-slate-600 dark:text-slate-300">
                    <div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Order number
                      </div>
                      <div className="font-medium">{orderNumber}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Product
                      </div>
                      <div className="font-medium">
                        {product?.name || "Product"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Quantity
                      </div>
                      <div className="font-medium">{order.quantity}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Unit price
                      </div>
                      <div className="font-medium">
                        {formatMoney(order.unit_price, product?.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Total amount
                      </div>
                      <div className="font-semibold text-orange-600">
                        {formatMoney(order.total_price, product?.currency)}
                      </div>
                    </div>
                    {order.contact_phone && (
                      <div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          Contact phone
                        </div>
                        <div className="font-medium">{order.contact_phone}</div>
                      </div>
                    )}
                  </div>

                  {order.delivery_address && (
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-[12px]">
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">
                        Delivery address
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 whitespace-pre-line">
                        {order.delivery_address}
                      </div>
                    </div>
                  )}
                </div>

                {/* Parties card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    People in this order
                  </h2>

                  {/* Buyer */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                          {getPartyName(buyer).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                            {getPartyName(buyer)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Buyer
                          </div>
                        </div>
                      </div>
                    </div>
                    {buyer?.email && (
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        ✉️ {buyer.email}
                      </div>
                    )}
                  </div>

                  {/* Seller */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px] font-semibold">
                          {(
                            seller?.business_name ||
                            getPartyName(seller?.user) ||
                            "S"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                            {seller?.business_name ||
                              getPartyName(seller?.user) ||
                              "Seller"}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Seller / Shop
                          </div>
                        </div>
                      </div>
                      {seller?.id && (
                        <Link
                          to={`/shops/${seller.id}`}
                          className="text-[10px] text-orange-600 hover:underline"
                        >
                          Open shop
                        </Link>
                      )}
                    </div>
                    {seller?.phone_number && (
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        📞 {seller.phone_number}
                      </div>
                    )}
                  </div>

                  {/* Quick chat button */}
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="w-full mt-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Open chat about this order
                  </button>
                </div>
              </section>

              {/* PRODUCT CARD */}
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Product in this order
                  </h2>
                  {product && (
                    <Link
                      to={`/products/${product.id}`}
                      className="text-[11px] text-orange-600 hover:underline"
                    >
                      View product
                    </Link>
                  )}
                </div>

                {!product ? (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    Hakuna product imehusishwa.
                  </div>
                ) : (
                  <div className="flex gap-3 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                        No image
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {product.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            Qty: {order.quantity}
                          </div>
                        </div>
                        <div className="text-right text-[11px]">
                          <div className="text-slate-500 dark:text-slate-400">
                            Unit: {formatMoney(product.price, product.currency)}
                          </div>
                          <div className="font-semibold text-orange-600">
                            {formatMoney(order.total_price, product.currency)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Shop: {product.shop_name}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* OPTIONAL NOTE */}
              {order.note && (
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Note from buyer
                  </h2>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-line">
                    {order.note}
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default OrderDetailPage;
