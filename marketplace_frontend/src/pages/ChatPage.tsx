// src/pages/ChatPage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface PaginatedMessageList {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[]; // hatujajua schema halisi, tutafilter kwa runtime
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const productId = searchParams.get("product");
  const sellerId = searchParams.get("seller");

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("ordering", "created_at");

      // kama backend yako inaruhusu filter by product/seller, unaweza kuongeza hapa:
      if (productId) params.set("product", productId);
      if (sellerId) params.set("seller", sellerId);

      const res = await apiClient.get<PaginatedMessageList>(
        `/api/messages/?${params.toString()}`
      );
      setMessages(res.data.results);
    } catch (err) {
      console.error(err);
      setError("Imeshindikana kupakia messages. Jaribu tena baadae.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, sellerId]);

  const getMessageText = (msg: any): string => {
    return (
      msg.text ??
      msg.body ??
      msg.content ??
      msg.message ??
      JSON.stringify(msg)
    );
  };

  const isMine = (msg: any): boolean => {
    if (!user) return false;

    if (typeof msg.is_mine === "boolean") return msg.is_mine;
    if (typeof msg.isMine === "boolean") return msg.isMine;

    if (msg.sender_id && msg.sender_id === user.id) return true;
    if (msg.sender && msg.sender.id && msg.sender.id === user.id) return true;

    return false;
  };

  const getSenderLabel = (msg: any): string => {
    if (isMine(msg)) return "You";

    return (
      msg.sender_username ??
      msg.sender_name ??
      msg.sender?.username ??
      msg.sender ??
      "Other"
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setError(null);

    try {
      // HAPA: hakikisha unalinganisha fields na MessageCreateRequest yako:
      // nimeset text + product + seller kama assumption.
      const payload: Record<string, any> = {
        text: newMessage.trim(),
      };
      if (productId) payload.product = Number(productId);
      if (sellerId) payload.seller = Number(sellerId);

      await apiClient.post("/api/messages/", payload);

      setNewMessage("");
      await fetchMessages();
    } catch (err) {
      console.error(err);
      setError(
        "Imeshindikana kutuma ujumbe. Hakikisha uko online na jaribu tena."
      );
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 max-w-sm text-center">
            Tafadhali login kwanza ili kutumia chat.
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-5 flex flex-col gap-3">
        <header className="mb-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Chat with seller
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tuma ujumbe kwa muuzaji kujadiliana kuhusu product na details za
            miamala.
          </p>
        </header>

        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-500">
                Inapakia messages...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-500">
                Hakuna messages bado. Tuma ujumbe wa kwanza kuanza mazungumzo.
              </div>
            ) : (
              messages.map((msg) => {
                const mine = isMine(msg);
                const text = getMessageText(msg);
                const sender = getSenderLabel(msg);
                const created =
                  msg.created_at || msg.timestamp || msg.sent_at || null;

                return (
                  <div
                    key={msg.id ?? `${sender}-${created}-${text.slice(0, 8)}`}
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-[11px] ${
                        mine
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      <div className="text-[10px] opacity-80 mb-0.5">
                        {sender}
                        {created && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="font-mono">
                              {String(created).slice(0, 16)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap wrap-break-words">
                        {text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 bg-slate-50/60 dark:bg-slate-900/80"
          >
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none h-10"
              placeholder="Andika ujumbe wako hapa..."
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {sending ? "Inatuma..." : "Tuma"}
            </button>
          </form>
        </section>
      </main>

      <MainFooter />
    </div>
  );
};

export default ChatPage;
