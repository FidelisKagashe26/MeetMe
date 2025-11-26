// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const RegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, loading: authLoading } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const nextParam = searchParams.get("next") || "/";

  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    // Schema inahitaji username; tukiona hajatupa,
    // tunajaribu kuchukua prefix ya email.
    let finalUsername = username.trim();
    if (!finalUsername && email.includes("@")) {
      finalUsername = email.split("@")[0];
    }

    if (!finalUsername) {
      setError("Username is required.");
      setSubmitting(false);
      return;
    }

    try {
      await register({
        username: finalUsername,
        email: email || undefined,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });

      navigate(nextParam);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data && typeof data === "object") {
          // simple flatten ya kwanza
          const firstKey = Object.keys(data)[0];
          const value = (data as Record<string, unknown>)[firstKey];
          if (Array.isArray(value) && value[0]) {
            setError(String(value[0]));
          } else {
            setError("Failed to create account. Please check your details.");
          }
        } else {
          setError("Failed to create account. Please try again.");
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
              Create your account
            </h1>
            <p className="text-[12px] text-slate-500 mb-4">
              An account helps sellers know who you are when you place an order.
            </p>

            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="your-username"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  If you leave this empty, we will generate a username from your email.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      First name (optional)
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Last name (optional)
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
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
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={disabled}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {disabled ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500">
              Already have an account?{" "}
              <Link
                to={`/login?next=${encodeURIComponent(nextParam)}`}
                className="text-orange-600 hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default RegisterPage;
