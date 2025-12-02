// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import axios from "axios";

const RegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isSw = language === "sw";

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
      setError(
        isSw
          ? "Nenosiri hazilingani. Hakikisha yamefanana."
          : "Passwords do not match. Please make sure they are the same."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        isSw
          ? "Email ni lazima. Tafadhali weka barua pepe sahihi."
          : "Email is required. Please enter a valid email address."
      );
      return;
    }

    setSubmitting(true);

    // Kama username hajatoa, tutajaribu kuchukua kutoka kwenye email (kabla ya @)
    let finalUsername = username.trim();
    if (!finalUsername && email.includes("@")) {
      finalUsername = email.split("@")[0];
    }

    if (!finalUsername) {
      setError(
        isSw
          ? "Username ni lazima. Andika username au tutaokota moja kutoka kwenye email."
          : "Username is required. Write a username or we will pick one from your email."
      );
      setSubmitting(false);
      return;
    }

    try {
      await register({
        username: finalUsername,
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });

      // Baada ya kusajili, mwendee alikotoka / alikotakiwa kwenda
      navigate(nextParam);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data && typeof data === "object") {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstKey = keys[0];
            const value = (data as Record<string, unknown>)[firstKey];

            if (Array.isArray(value) && value[0]) {
              setError(String(value[0]));
            } else if (typeof value === "string") {
              setError(value);
            } else {
              setError(
                isSw
                  ? "Imeshindikana kuunda akaunti. Hakikisha taarifa ulizoweka ni sahihi."
                  : "Failed to create the account. Please make sure the information you entered is correct."
              );
            }
          } else {
            setError(
              isSw
                ? "Imeshindikana kuunda akaunti. Tafadhali jaribu tena."
                : "Failed to create the account. Please try again."
            );
          }
        } else {
          setError(
            isSw
              ? "Imeshindikana kuunda akaunti. Tafadhali jaribu tena."
              : "Failed to create the account. Please try again."
          );
        }
      } else {
        setError(
          isSw
            ? "Kuna hitilafu ya ndani ya mfumo. Jaribu tena baadae."
            : "There was an internal system error. Please try again later."
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
              {isSw
                ? "Fungua akaunti yako ya LINKA"
                : "Create your LINKA account"}
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
              {isSw
                ? "Akaunti inakusaidia kununua na kuuza bidhaa kwa usalama. Tutatumia email yako kwa login na taarifa muhimu kama kubadilisha nenosiri."
                : "Your account helps you buy and sell products safely. We'll use your email for login and important updates such as password reset."}
            </p>

            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 p-2 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                  {isSw ? "Username" : "Username"}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                  placeholder="your-username"
                />
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  {isSw
                    ? "Ukiacha tupu, tutaokota username kutoka kwenye email yako (kabla ya @)."
                    : "If you leave this empty, we will pick a username from your email (before the @)."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                    {isSw ? "Email" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                      {isSw
                        ? "Jina la kwanza (hiari)"
                        : "First name (optional)"}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                      placeholder={isSw ? "John" : "John"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                      {isSw
                        ? "Jina la ukoo (hiari)"
                        : "Last name (optional)"}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
                      placeholder={isSw ? "Doe" : "Doe"}
                    />
                  </div>
                </div>
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
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                  {isSw ? "Thibitisha nenosiri" : "Confirm password"}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:border-orange-500"
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
                {disabled
                  ? isSw
                    ? "Tunaunda akaunti..."
                    : "Creating account..."
                  : isSw
                  ? "Fungua akaunti"
                  : "Create account"}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
              {isSw
                ? "Tayari una akaunti?"
                : "Already have an account?"}{" "}
              <Link
                to={`/login?next=${encodeURIComponent(nextParam)}`}
                className="text-orange-600 hover:underline font-medium"
              >
                {isSw ? "Ingia" : "Sign in"}
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
