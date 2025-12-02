// src/pages/LoginPage.tsx

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

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

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isSw = language === "sw";

  const searchParams = new URLSearchParams(location.search);
  const nextParam = searchParams.get("next") || "/";

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ username, password });
      navigate(nextParam, { replace: true });
    } catch (err: unknown) {
      console.error("Login failed:", err);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const messageFromBackend = extractErrorMessage(err.response?.data);

        if (messageFromBackend) {
          setError(messageFromBackend);
        } else if (status === 400 || status === 401) {
          setError(
            isSw
              ? "Kuongeza kumeshindikana. Hakikisha username/nenosiri viko sahihi kisha jaribu tena."
              : "Login failed. Please check your credentials and try again.",
          );
        } else {
          setError(
            isSw
              ? "Kwa sasa haiwezekani kuingia. Tafadhali jaribu tena baadae."
              : "Unable to sign in right now. Please try again later.",
          );
        }
      } else {
        setError(
          isSw
            ? "Kumetokea hitilafu. Tafadhali jaribu tena."
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || authLoading;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {isSw ? "Ingia kuendelea" : "Sign in to continue"}
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
              {isSw
                ? "Huhitaji akaunti ili kuangalia bidhaa. Ku-login kunahitajika tu ukitaka kuweka oda."
                : "You don't need an account to browse products. Login is only required when you want to place an order."}
            </p>

            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 p-2 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                  {isSw ? "Username au email" : "Username or email"}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder={
                    isSw
                      ? "username au barua pepe"
                      : "your-username or email"
                  }
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                  {isSw ? "Nenosiri" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={disabled}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {disabled
                  ? isSw
                    ? "Inaingia..."
                    : "Signing in..."
                  : isSw
                  ? "Ingia"
                  : "Sign in"}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
              <span>
                {isSw ? "Huna akaunti?" : "Don't have an account?"}{" "}
                <Link
                  to={`/register?next=${encodeURIComponent(nextParam)}`}
                  className="text-orange-600 hover:underline font-medium"
                >
                  {isSw ? "Fungua akaunti" : "Create account"}
                </Link>
              </span>
              {/* Forgot password unaweza kuongeza baadaye */}
            </div>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default LoginPage;
