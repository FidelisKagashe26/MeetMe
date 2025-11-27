// src/pages/NotificationsPage.tsx
import React, { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";

interface Notification {
  id: number;
  title: string;
  body: string;
  notif_type: string;
  is_read: boolean;
  created_at: string;
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

const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arifa za order, mazungumzo na mengine kwenye LINKA.
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            Inapakia notifications...
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/40 rounded-2xl">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            Hakuna notification kwa sasa.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 flex gap-3 ${
                  n.is_read
                    ? "bg-white dark:bg-slate-900"
                    : "bg-orange-50/60 dark:bg-orange-500/5"
                }`}
              >
                <div className="mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      n.is_read ? "bg-slate-300" : "bg-orange-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {n.title || "(Notification)"}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {n.created_at ? formatDate(n.created_at) : ""}
                    </div>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {n.body}
                    </p>
                  )}
                  {n.notif_type && (
                    <span className="inline-flex mt-1 px-2 py-[3px] rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                      {n.notif_type}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
