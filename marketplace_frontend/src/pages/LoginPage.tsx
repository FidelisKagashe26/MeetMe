// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();

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
      navigate(nextParam);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 400 || status === 401) {
          setError("Login failed. Please check your credentials and try again.");
        } else {
          setError("Unable to sign in right now. Please try again later.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || authLoading;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MainHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-lg font-semibold text-slate-900 mb-1">
              Sign in to continue
            </h1>
            <p className="text-[12px] text-slate-500 mb-4">
              You don't need an account to browse products. Login is only
              required when you want to place an order.
            </p>

            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Username or email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="your-username or email"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={disabled}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {disabled ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500 flex justify-between items-center">
              <span>
                Don't have an account?{" "}
                <Link
                  to={`/register?next=${encodeURIComponent(nextParam)}`}
                  className="text-orange-600 hover:underline font-medium"
                >
                  Create account
                </Link>
              </span>
              {/* Forgot password unaweza kuongeza baadae */}
            </div>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default LoginPage;
