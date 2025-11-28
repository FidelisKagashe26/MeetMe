// src/pages/NotificationsPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

type NotifType = "order_new" | "order_status" | "chat_message" | "order_created";

interface NotificationData {
  order_id?: number;
  conversation_id?: number;
  product_id?: number;
  seller_id?: number;
  buyer_id?: number;
  // unaweza kuongeza vitu vingine baadaye
}

interface Notification {
  id: number;
  title: string;
  body: string;
  notif_type: NotifType;
  is_read: boolean;
  created_at: string;
  data?: NotificationData | null;
}

interface PaginatedNotificationResponse {
  count: number;
  results: Notification[];
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const isOrderType = (t: NotifType) =>
  t === "order_new" || t === "order_status" || t === "order_created";

const isChatType = (t: NotifType) => t === "chat_message";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedNotificationResponse>(
        "/api/notifications/"
      );
      setItems(res.data.results || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kupakia notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      setMarking(true);
      await apiClient.post("/api/notifications/mark_all_read/", {});
      await load();
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kutandika zote kama zimesomwa.");
    } finally {
      setMarking(false);
    }
  };

  const canOpenNotification = (n: Notification) =>
    isChatType(n.notif_type) || isOrderType(n.notif_type);

  const handleOpenNotification = (notif: Notification) => {
    if (!canOpenNotification(notif)) return;

    const data = notif.data || {};

    // optimistic mark read
    setItems((prev) =>
      prev.map((n) =>
        n.id === notif.id
          ? {
              ...n,
              is_read: true,
            }
          : n
      )
    );

    // sync na backend
    void apiClient
      .patch(`/api/notifications/${notif.id}/`, {
        is_read: true,
      })
      .catch((err) => {
        console.error(err);
        setError("Imeshindikana kuweka notification kama imesomwa (backend).");
      });

    // CHAT MESSAGE
    if (isChatType(notif.notif_type)) {
      if (data.conversation_id) {
        navigate(`/chat?conversation=${data.conversation_id}`);
      } else if (data.product_id && data.seller_id) {
        navigate(`/chat?product=${data.product_id}&seller=${data.seller_id}`);
      } else {
        navigate("/chat");
      }
      return;
    }

    // ORDER related
    if (isOrderType(notif.notif_type)) {
      if (data.order_id) {
        navigate(`/orders/${data.order_id}`);
      } else {
        console.warn("Order notification haina order_id kwenye data:", notif);
      }
      return;
    }
  };

  const renderTypeBadge = (n: Notification) => {
    const base =
      "inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-medium";

    if (isChatType(n.notif_type)) {
      return (
        <span
          className={`${base} bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300`}
        >
          Chat
        </span>
      );
    }

    if (isOrderType(n.notif_type)) {
      const label =
        n.notif_type === "order_new"
          ? "New order"
          : n.notif_type === "order_status"
          ? "Order status"
          : "Order created";
      return (
        <span
          className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300`}
        >
          {label}
        </span>
      );
    }

    return (
      <span
        className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}
      >
        {n.notif_type}
      </span>
    );
  };

  const getOpenLabel = (n: Notification) => {
    if (isChatType(n.notif_type)) return "Open chat";
    if (isOrderType(n.notif_type)) return "View order";
    return "Read more";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Arifa za orders, mazungumzo (chat) na mengine kwenye LINKA.
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking || unreadCount === 0}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {marking
                  ? "Inasafisha..."
                  : unreadCount > 0
                  ? `Mark all read (${unreadCount})`
                  : "Zote zimesomwa"}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                Inapakia notifications...
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/40">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                Hakuna notification kwa sasa.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((n) => {
                  const isUnread = !n.is_read;
                  const canOpen = canOpenNotification(n);

                  return (
                    <li
                      key={n.id}
                      onClick={() => canOpen && handleOpenNotification(n)}
                      className={`px-4 py-3 flex gap-3 transition-colors ${
                        isUnread
                          ? "bg-orange-50/60 dark:bg-orange-500/5 hover:bg-orange-100/70 dark:hover:bg-orange-500/10"
                          : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${canOpen ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="mt-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isUnread ? "bg-orange-500" : "bg-slate-300"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {n.title ||
                              (isChatType(n.notif_type)
                                ? "New chat message"
                                : "(Notification)")}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {n.created_at ? formatDate(n.created_at) : ""}
                          </div>
                        </div>

                        {n.body && (
                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                            {n.body}
                          </p>
                        )}

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderTypeBadge(n)}
                          </div>

                          {canOpen && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenNotification(n);
                              }}
                              className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-medium hover:bg-black"
                            >
                              {getOpenLabel(n)}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default NotificationsPage;
