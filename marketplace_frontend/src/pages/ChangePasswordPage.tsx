// src/pages/ChangePasswordPage.tsx
import React, { useState } from "react";
import apiClient from "../lib/apiClient";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

const ChangePasswordPage: React.FC = () => {
  const [old_password, setOldPassword] = useState("");
  const [new_password, setNewPassword] = useState("");
  const [new_password_confirm, setNewPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post("/api/auth/change-password/", {
        old_password,
        new_password,
        new_password_confirm,
      });

      setSuccess("Neno la siri limebadilishwa kwa mafanikio.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error: unknown) {
      console.error(error);
      setError(
        "Imeshindikana kubadili neno la siri. Hakikisha neno la siri la zamani ni sahihi na jaribu tena."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Badili neno la siri
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Weka neno la siri la zamani, kisha neno jipya mara mbili.
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-600/40 rounded-xl px-3 py-2">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Neno la siri la zamani
                </label>
                <input
                  type="password"
                  value={old_password}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Neno jipya la siri
                </label>
                <input
                  type="password"
                  value={new_password}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Rudia neno jipya la siri
                </label>
                <input
                  type="password"
                  value={new_password_confirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
                >
                  {loading ? "Inatuma..." : "Hifadhi mabadiliko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default ChangePasswordPage;
