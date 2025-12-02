// src/pages/AccountProfilePage.tsx
import React, { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface MeResponse {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_seller: boolean;
  preferred_language: "en" | "sw";
  theme: "light" | "dark" | "system";
  avatar_url: string | null;
}

interface SettingsResponse {
  is_seller: boolean;
  preferred_language: "en" | "sw";
  theme: "light" | "dark" | "system";
  avatar: string | null; // path/uri ya picha (read/write)
  avatar_url: string | null; // full URL (read-only)
}

const AccountProfilePage: React.FC = () => {
  const { user } = useAuth();

  // ---- PROFILE + SETTINGS FORM (editable) ----
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  });

  const [settingsForm, setSettingsForm] = useState<{
    preferred_language: "en" | "sw";
    theme: "light" | "dark" | "system";
  }>({
    preferred_language: "sw",
    theme: "light",
  });

  // ---- AVATAR / PROFILE PICTURE ----
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  // ---- CHANGE PASSWORD FORM ----
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // ---- INITIAL LOAD: /api/auth/me/ & /api/auth/settings/ ----
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setProfileError(null);

        const [meRes, settingsRes] = await Promise.all([
          apiClient.get<MeResponse>("/api/auth/me/"),
          apiClient.get<SettingsResponse>("/api/auth/settings/"),
        ]);

        // User basic info
        setProfileForm({
          username: meRes.data.username || "",
          email: meRes.data.email || "",
          first_name: meRes.data.first_name || "",
          last_name: meRes.data.last_name || "",
        });

        // Preferences – tunachukua kutoka settings (na fallback kutoka meRes)
        setSettingsForm({
          preferred_language:
            settingsRes.data.preferred_language ||
            meRes.data.preferred_language ||
            "sw",
          theme:
            settingsRes.data.theme ||
            meRes.data.theme ||
            "light",
        });

        // Avatar URL – tunaprefer avatar_url kutoka settings, kisha meRes
        const initialAvatarUrl =
          settingsRes.data.avatar_url ||
          meRes.data.avatar_url ||
          null;

        setAvatarUrl(initialAvatarUrl);
      } catch (err) {
        console.error("Failed to load account data:", err);
        setProfileError("Imeshindikana kupakia taarifa za akaunti.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    setSettingsForm((prev) => {
      if (name === "preferred_language") {
        return {
          ...prev,
          preferred_language: value as SettingsResponse["preferred_language"],
        };
      }

      if (name === "theme") {
        return {
          ...prev,
          theme: value as SettingsResponse["theme"],
        };
      }

      return prev;
    });
  };

  // ---- HANDLE: PROF. PICTURE FILE SELECTION ----
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarError(null);
    setAvatarSuccess(null);

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    } else {
      setAvatarPreview(null);
    }
  };

  // ---- SUBMIT: UPLOAD / CHANGE PROFILE PICTURE ----
  const handleUploadAvatar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!avatarFile) {
      setAvatarError("Chagua picha kwanza kabla ya ku-upload.");
      return;
    }

    setSavingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const formData = new FormData();
      // jina la field liendane na backend yako (avatar)
      // /api/auth/settings/ inakubali multipart/form-data
      formData.append("avatar", avatarFile);

      const res = await apiClient.patch<SettingsResponse>(
        "/api/auth/settings/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      // Backend inarudisha avatar_url (full URL) + avatar (relative path)
      const newAvatarUrl =
        res.data.avatar_url || res.data.avatar || null;

      setAvatarUrl(newAvatarUrl);
      setAvatarSuccess("Picha ya wasifu imebadilishwa kikamilifu.");
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setAvatarError(
        "Imeshindikana kupakia picha ya wasifu. Hakikisha faili ni sahihi (jpg/png) kisha jaribu tena.",
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  // ---- SUBMIT: PROFILE + SETTINGS ----
  const handleSaveProfileAndSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      // 1. Update /api/auth/me/ (username, email, names)
      await apiClient.patch<MeResponse>("/api/auth/me/", {
        username: profileForm.username,
        email: profileForm.email || null,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
      });

      // 2. Update /api/auth/settings/ (language, theme)
      await apiClient.patch<SettingsResponse>("/api/auth/settings/", {
        preferred_language: settingsForm.preferred_language,
        theme: settingsForm.theme,
      });

      setProfileSuccess("Taarifa za akaunti zimehifadhiwa kikamilifu.");
    } catch (err: unknown) {
      console.error("Save profile/settings failed:", err);
      setProfileError(
        "Imeshindikana kuhifadhi taarifa za akaunti. Hakikisha taarifa ni sahihi kisha jaribu tena.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ---- SUBMIT: CHANGE PASSWORD ----
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setPasswordError("Nenosiri jipya na lile la uthibitisho hayafanani.");
      setSavingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Nenosiri jipya liwe angalau herufi 8.");
      setSavingPassword(false);
      return;
    }

    try {
      await apiClient.post("/api/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      setPasswordSuccess("Nenosiri limebadilishwa kikamilifu.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: unknown) {
      console.error("Change password failed:", err);
      setPasswordError(
        "Imeshindikana kubadili nenosiri. Hakikisha nenosiri la zamani ni sahihi.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    // route hii inawezekana ipo ndani ya ProtectedRoute, backup tu
    return null;
  }

  const initialLetter =
    profileForm.username?.charAt(0)?.toUpperCase() ??
    user.username.charAt(0).toUpperCase();

  // avatar itakayochorwa kwenye badge
  const displayAvatar = avatarPreview || avatarUrl || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <header>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Akaunti yako – LINKA
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Badilisha username, email, majina yako, lugha unayopendelea,
              muonekano wa app, picha ya wasifu na nenosiri la akaunti.
            </p>
          </header>

          {/* PROFILE & SETTINGS CARD */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
            {/* PROFILE HEADER + AVATAR */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profileForm.username || user.username}
                </div>
                {profileForm.email && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {profileForm.email}
                  </div>
                )}
              </div>
            </div>

            {/* AVATAR UPLOAD SECTION */}
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <form
                onSubmit={handleUploadAvatar}
                className="flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Profile picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="block w-full text-[11px] text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-slate-900 file:text-white hover:file:bg-black"
                  />
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    Tumia picha ya mraba (square), mfano 400x400px, ili ionekane
                    vizuri kwenye app.
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2 sm:items-end">
                  <button
                    type="submit"
                    disabled={savingAvatar || !avatarFile}
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black disabled:opacity-60"
                  >
                    {savingAvatar
                      ? "Inapakia..."
                      : displayAvatar
                      ? "Badili picha"
                      : "Weka picha"}
                  </button>
                </div>
              </form>

              {avatarError && (
                <div className="mt-2 text-[11px] text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 rounded-xl px-3 py-1.5">
                  {avatarError}
                </div>
              )}
              {avatarSuccess && (
                <div className="mt-2 text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-600/40 rounded-xl px-3 py-1.5">
                  {avatarSuccess}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Inapakia taarifa za akaunti...
              </div>
            ) : (
              <form
                onSubmit={handleSaveProfileAndSettings}
                className="space-y-4 pt-2"
              >
                {profileError && (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 rounded-xl px-3 py-2">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-600/40 rounded-xl px-3 py-2">
                    {profileSuccess}
                  </div>
                )}

                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Taarifa za login
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={profileForm.username}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Jina la kwanza
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={profileForm.first_name}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Jina la mwisho
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileForm.last_name}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <h2 className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                  Preferences (lugha & muonekano)
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Lugha unayopendelea
                    </label>
                    <select
                      name="preferred_language"
                      value={settingsForm.preferred_language}
                      onChange={handleSettingsChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="sw">Kiswahili</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Muonekano (Theme)
                    </label>
                    <select
                      name="theme"
                      value={settingsForm.theme}
                      onChange={handleSettingsChange}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System (auto)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
                  >
                    {savingProfile ? "Inahifadhi..." : "Hifadhi mabadiliko"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* CHANGE PASSWORD CARD */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Badili nenosiri la akaunti
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Weka nenosiri la zamani kisha uchague nenosiri jipya lenye
              usalama zaidi.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {passwordError && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-600/40 rounded-xl px-3 py-2">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-600/40 rounded-xl px-3 py-2">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Nenosiri la sasa
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Nenosiri jipya
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Thibitisha nenosiri jipya
                  </label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
                >
                  {savingPassword ? "Inabadilisha..." : "Badili nenosiri"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default AccountProfilePage;
