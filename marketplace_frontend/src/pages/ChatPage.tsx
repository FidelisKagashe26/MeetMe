// src/pages/ChatPage.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface UserMini {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  is_seller?: boolean;
}

type MessageStatus = "sent" | "delivered" | "read";

interface Message {
  id: number;
  conversation: number;
  sender: UserMini;
  text: string;
  status: MessageStatus;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface SellerMini {
  id: number;
  business_name: string;
  is_verified?: boolean;
  rating?: string;
  rating_count?: number;
  total_sales?: number;
  items_sold?: number;
  logo_url?: string | null;
  user: UserMini;
}

interface ProductMini {
  id: number;
  name: string;
  price: string;
  currency: string;
  image_url?: string | null;
  likes_count?: number;
  sales_count?: number;
  units_sold?: number;
}

interface Conversation {
  id: number;
  buyer: UserMini;
  seller: SellerMini;
  product: ProductMini | null;
  created_at: string;
  last_message_at: string;
  last_message: Message;
  unread_count: number;
  is_typing_other_side: boolean;
}

interface ConversationParticipantState {
  id: number;
  conversation: number;
  user: UserMini;
  is_typing: boolean;
  last_typing_at: string | null;
  last_seen_at: string | null;
  last_read_at: string | null;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
  participant_states: ConversationParticipantState[];
}

interface ConversationCreatePayload {
  seller_id: number;
  product_id?: number;
}

interface MessageCreatePayload {
  conversation: number;
  text: string;
}

type DRFErrorResponse =
  | {
      error?: string;
      detail?: string;
      non_field_errors?: string[];
    }
  | Record<string, unknown>;

const extractErrorMessage = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const typed = data as DRFErrorResponse;

  if (typeof typed.error === "string") return typed.error;
  if (typeof typed.detail === "string") return typed.detail;

  if (
    Array.isArray(typed.non_field_errors) &&
    typed.non_field_errors.length > 0 &&
    typeof typed.non_field_errors[0] === "string"
  ) {
    return typed.non_field_errors[0];
  }

  return null;
};

const getProductMainImage = (product: ProductMini | null): string | null => {
  if (!product) return null;
  if (product.image_url) return product.image_url;
  return null;
};

const buildWebSocketUrl = (conversationPk: number): string => {
  const base =
    (apiClient.defaults.baseURL as string | undefined) ||
    window.location.origin;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(window.location.origin);
  }

  const isSecure = url.protocol === "https:";
  url.protocol = isSecure ? "wss:" : "ws:";

  url.pathname = `/ws/chat/${conversationPk}/`;

  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token");

  if (token) url.searchParams.set("token", token);

  return url.toString();
};

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const productIdParam = searchParams.get("product");
  const sellerIdParam = searchParams.get("seller");
  const conversationParam = searchParams.get("conversation");
  const orderIdParam = searchParams.get("order"); // future use

  const conversationFromUrl =
    conversationParam !== null && !Number.isNaN(Number(conversationParam))
      ? Number(conversationParam)
      : null;

  const [conversationId, setConversationId] =
    useState<number | null>(conversationFromUrl);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  const [conversationDetail, setConversationDetail] =
    useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participantStates, setParticipantStates] = useState<
    ConversationParticipantState[]
  >([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");

  // Fallback context wakati bado hatujapata conversation
  const [fallbackProduct, setFallbackProduct] = useState<ProductMini | null>(
    null
  );
  const [fallbackSeller, setFallbackSeller] = useState<SellerMini | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);

  const effectiveProduct =
    conversationDetail?.product || fallbackProduct || null;
  const effectiveSeller =
    conversationDetail?.seller || fallbackSeller || null;

  // WebSocket realtime state
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const [wsConnected, setWsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Auto scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  const shopName =
    effectiveSeller?.business_name ?? "Seller shop";

  const productImage = getProductMainImage(effectiveProduct);

  const otherTyping = participantStates.some(
    (ps) => ps.user.id !== user?.id && ps.is_typing
  );

  const formatDateTimeShort = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderLabel = (sender: UserMini): string => {
    if (!user) return sender.username || sender.email || "Other";
    if (sender.id === user.id) return "You";
    if (sender.username) return sender.username;
    const full = `${sender.first_name || ""} ${sender.last_name || ""}`.trim();
    if (full) return full;
    if (sender.email) return sender.email;
    return "Other";
  };

  const renderStatusTick = (status: MessageStatus, mine: boolean) => {
    if (!mine) return null;
    if (status === "sent")
      return <span className="ml-1 text-[9px] opacity-80">✓</span>;
    if (status === "delivered")
      return <span className="ml-1 text-[9px] opacity-80">✓✓</span>;
    if (status === "read")
      return (
        <span className="ml-1 text-[9px] opacity-80 text-emerald-300">
          ✓✓
        </span>
      );
    return null;
  };

  // ================== REST REFRESH ==================
  const refreshConversation = useCallback(
    async (conversationPk: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<ConversationDetail>(
          `/api/conversations/${conversationPk}/`
        );
        const data = res.data;
        setConversationDetail(data);
        setMessages(data.messages || []);
        setParticipantStates(data.participant_states || []);

        // mark all as seen (non blocking)
        void apiClient
          .post(`/api/conversations/${conversationPk}/mark_seen/`, {})
          .catch((markError) => {
            console.error("Failed to mark messages as seen", markError);
          });
      } catch (err) {
        console.error(err);
        setError("Imeshindikana kupakia messages. Jaribu tena baadae.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ================== HANDLE WS EVENTS ==================
  const handleIncomingEvent = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const dataRaw = JSON.parse(event.data) as Record<string, unknown>;
        if (!dataRaw || typeof dataRaw !== "object") return;

        const type = dataRaw.type as string | undefined;

        if (type === "message.created" && dataRaw.message) {
          const incoming = dataRaw.message as Message;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === incoming.id);
            if (exists) {
              return prev.map((m) => (m.id === incoming.id ? incoming : m));
            }
            return [...prev, incoming];
          });

          setConversationDetail((prev) =>
            prev
              ? {
                  ...prev,
                  last_message: incoming,
                  last_message_at: incoming.created_at,
                }
              : prev
          );

          if (user && incoming.sender.id !== user.id && conversationId) {
            void apiClient
              .post(`/api/conversations/${conversationId}/mark_seen/`, {})
              .catch((err) =>
                console.error("Failed to mark seen via websocket event", err)
              );
          }

          scrollToBottom();
          return;
        }

        if (type === "message.updated" && dataRaw.message) {
          const updated = dataRaw.message as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
          return;
        }

        if (type === "conversation.typing" && dataRaw.state) {
          const state = dataRaw.state as ConversationParticipantState;
          setParticipantStates((prev) => {
            const idx = prev.findIndex((ps) => ps.id === state.id);
            if (idx === -1) return [...prev, state];
            const clone = [...prev];
            clone[idx] = state;
            return clone;
          });
          return;
        }

        if (type === "conversation.bulk_state") {
          if (Array.isArray(dataRaw.messages)) {
            setMessages(dataRaw.messages as Message[]);
          }
          if (Array.isArray(dataRaw.participant_states)) {
            setParticipantStates(
              dataRaw.participant_states as ConversationParticipantState[]
            );
          }
          scrollToBottom();
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    },
    [conversationId, scrollToBottom, user]
  );

  // ================== BOOTSTRAP CONVERSATION ==================
  useEffect(() => {
    if (!user) return;
    if (hasBootstrapped) return;

    const bootstrap = async () => {
      try {
        setError(null);
        setLoading(true);

        // 1) Kama URL tayari ina conversation, tumia hiyo
        if (conversationFromUrl) {
          setConversationId(conversationFromUrl);
          setHasBootstrapped(true);
          return;
        }

        // 2) Kama state tayari ina conversation, tumia hiyo
        if (conversationId) {
          setHasBootstrapped(true);
          return;
        }

        // 3) Otherwise, jaribu ku-create kwa seller + product
        if (!sellerIdParam) {
          setError(
            "Haijabainika muuzaji wa hii chat. Tafadhali fungua chat kupitia product."
          );
          setLoading(false);
          setHasBootstrapped(true);
          return;
        }

        const payload: ConversationCreatePayload = {
          seller_id: Number(sellerIdParam),
        };

        if (productIdParam) {
          const productPk = Number(productIdParam);
          if (!Number.isNaN(productPk)) {
            payload.product_id = productPk;
          }
        }

        // orderIdParam unaweza kuitumia baadaye upande wa backend bila kubadilisha hapa
        void orderIdParam;

        const res = await apiClient.post<Conversation>(
          "/api/conversations/",
          payload
        );
        setConversationId(res.data.id);
      } catch (errorInit: unknown) {
        console.error(errorInit);

        let message =
          "Imeshindikana kufungua mazungumzo na muuzaji. Jaribu tena baadae.";

        if (axios.isAxiosError(errorInit)) {
          const specific = extractErrorMessage(errorInit.response?.data);
          if (specific) {
            if (
              specific
                .toLowerCase()
                .includes("you cannot start a conversation with yourself")
            ) {
              message =
                "Huwezi kuanza mazungumzo na akaunti yako mwenyewe. Jaribu kutumia akaunti ya mnunuaji tofauti.";
            } else {
              message = specific;
            }
          }
        }

        setError(message);
      } finally {
        setLoading(false);
        setHasBootstrapped(true);
      }
    };

    void bootstrap();
  }, [
    user,
    hasBootstrapped,
    conversationFromUrl,
    conversationId,
    productIdParam,
    sellerIdParam,
    orderIdParam,
  ]);

  // ================== LOAD CONVERSATION DETAIL ==================
  useEffect(() => {
    if (!user) return;
    if (!conversationId) return;
    void refreshConversation(conversationId);
  }, [user, conversationId, refreshConversation]);

  // ================== FALLBACK CONTEXT (product / seller) ==================
  useEffect(() => {
    const loadFallbackContext = async () => {
      try {
        if (conversationId) return;

        if (productIdParam) {
          const productPk = Number(productIdParam);
          if (!Number.isNaN(productPk)) {
            const prodRes = await apiClient.get<ProductMini>(
              `/api/products/${productPk}/`
            );
            setFallbackProduct(prodRes.data);
          }
        }

        if (sellerIdParam) {
          const sellerPk = Number(sellerIdParam);
          if (!Number.isNaN(sellerPk)) {
            const sellerRes = await apiClient.get<SellerMini>(
              `/api/sellers/${sellerPk}/`
            );
            setFallbackSeller(sellerRes.data);
          }
        }
      } catch (err) {
        console.error("Failed to load fallback chat context", err);
      }
    };

    void loadFallbackContext();
  }, [conversationId, productIdParam, sellerIdParam]);

  // ================== WEBSOCKET CONNECTION ==================
  useEffect(() => {
    if (!user) return;
    if (!conversationId) return;

    const url = buildWebSocketUrl(conversationId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      try {
        ws.send(
          JSON.stringify({
            action: "join",
            conversation: conversationId,
          })
        );
      } catch (err) {
        console.error("Failed to send join event", err);
      }
    };

    ws.onmessage = (ev) => {
      handleIncomingEvent(ev);
    };

    ws.onerror = (ev) => {
      console.error("WebSocket error", ev);
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      setWsConnected(false);
    };
  }, [conversationId, handleIncomingEvent, user]);

  // ================== AUTO SCROLL ==================
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // ================== TYPING ==================
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!wsRef.current) return;
      try {
        wsRef.current.send(
          JSON.stringify({
            action: "typing",
            is_typing: typing,
            conversation: conversationId,
          })
        );
      } catch (err) {
        console.error("Failed to send typing event", err);
      }
    },
    [conversationId]
  );

  const handleChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!conversationId) return;

    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        sendTyping(true);
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
        sendTyping(false);
        typingTimeoutRef.current = undefined;
      }, 2500);
    } else {
      setIsTyping(false);
      sendTyping(false);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend) return;

    if (!conversationId) {
      setError(
        "Hatukuweza kutambua mazungumzo. Tafadhali fungua chat tena kupitia product."
      );
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: MessageCreatePayload = {
        conversation: conversationId,
        text: textToSend,
      };

      const res = await apiClient.post<Message>("/api/messages/", payload);
      setNewMessage("");

      // optimistic add (ikiwa WS haijaja bado au imechelewa)
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === res.data.id);
        if (exists) return prev;
        return [...prev, res.data];
      });

      if (!wsConnected) {
        await refreshConversation(conversationId);
      }
    } catch (errorSend) {
      console.error(errorSend);
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
            miamala kwa muda halisi (real-time).
          </p>
        </header>

        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* SELLER HEADER */}
          {effectiveSeller && (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                {effectiveSeller.logo_url ? (
                  <img
                    src={effectiveSeller.logo_url}
                    alt={shopName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-[11px] font-semibold flex items-center justify-center text-slate-700">
                    {shopName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {shopName}
                  </span>
                  {effectiveSeller.is_verified && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
                      ✔ Verified seller
                    </span>
                  )}
                </div>
              </div>
              {conversationDetail && (
                <div className="text-[10px] text-slate-400">
                  {otherTyping
                    ? "Anaandika..."
                    : wsConnected
                    ? "Online"
                    : "Recently online"}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES LIST */}
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
                const mine = msg.sender.id === user.id;
                const senderLabel = getSenderLabel(msg.sender);
                const createdLabel = formatDateTimeShort(msg.created_at);

                return (
                  <div
                    key={msg.id}
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
                      <div className="text-[10px] opacity-80 mb-0.5 flex items-center justify-between gap-2">
                        <span>{senderLabel}</span>
                        <span className="font-mono flex items-center">
                          {createdLabel}
                          {renderStatusTick(msg.status, mine)}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap wrap-break-words">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {otherTyping && (
              <div className="px-1 pt-1 text-[11px] text-slate-500 italic">
                Muuzaji anaandika...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* PINNED PRODUCT (WhatsApp style) */}
          {effectiveProduct && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
              {productImage ? (
                <img
                  src={productImage}
                  alt={effectiveProduct.name}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-400">
                  No image
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                  {effectiveProduct.name}
                </div>
                <div className="text-[10px] text-orange-600 font-semibold">
                  {effectiveProduct.price} {effectiveProduct.currency}
                </div>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900"
                >
                  Soma maelezo ya bidhaa
                </button>
              </div>
            </div>
          )}

          {/* INPUT */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 bg-slate-50/60 dark:bg-slate-900/80"
          >
            <textarea
              value={newMessage}
              onChange={handleChangeMessage}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none h-10"
              placeholder="Andika ujumbe wako hapa..."
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={
                sending || !newMessage.trim() || conversationId === null
              }
              className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {sending ? "Inatuma..." : "Tuma"}
            </button>
          </form>
        </section>
      </main>

      <MainFooter />

      {/* PRODUCT MODAL */}
      {productModalOpen && effectiveProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 relative">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="absolute top-2 right-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>

            <div className="flex gap-3 mb-3">
              {productImage ? (
                <img
                  src={productImage}
                  alt={effectiveProduct.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                  No image
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {effectiveProduct.name}
                </div>
                <div className="mt-1 text-[12px] text-orange-600 font-bold">
                  {effectiveProduct.price} {effectiveProduct.currency}
                </div>
                {effectiveProduct.likes_count !== undefined && (
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    ❤️ {effectiveProduct.likes_count} likes
                  </div>
                )}
                {effectiveProduct.sales_count !== undefined && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    🛒 {effectiveProduct.sales_count} sales
                  </div>
                )}
              </div>
            </div>

            {effectiveSeller && (
              <div className="mb-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2 flex items-center gap-2">
                {effectiveSeller.logo_url ? (
                  <img
                    src={effectiveSeller.logo_url}
                    alt={shopName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-[11px] font-semibold flex items-center justify-center text-slate-700">
                    {shopName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
                    {shopName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Seller wa hii bidhaa
                  </span>
                </div>
              </div>
            )}

            {conversationDetail && (
              <div className="mb-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="font-semibold mb-1 text-[11px] text-slate-800 dark:text-slate-200">
                  Washiriki wa mazungumzo
                </div>
                <div>
                  👤 <span className="font-medium">Wewe</span> (buyer)
                </div>
                <div>
                  🏪 <span className="font-medium">{shopName}</span> (seller)
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex-1"
              >
                Funga na endelea kuchat
              </button>
              <Link
                to={`/products/${effectiveProduct.id}`}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-medium hover:bg-black"
              >
                Fungua product page
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
