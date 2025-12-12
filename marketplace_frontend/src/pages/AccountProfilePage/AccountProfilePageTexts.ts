// src/locales/accountProfilePageTexts.ts

export interface AccountProfilePageTexts {
  pageTitle: string;
  pageSubtitle: string;

  loadAccountError: string;
  loadingAccount: string;

  avatarLabel: string;
  avatarHint: string;
  avatarInvalidType: string;
  avatarTooLarge: string;

  profileHeaderTitle: string;
  usernameLabel: string;
  emailLabel: string;
  firstNameLabel: string;
  lastNameLabel: string;

  prefsHeaderTitle: string;
  preferredLanguageLabel: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  languageSw: string;
  languageEn: string;

  profileSaveButton: string;
  profileSaveButtonSaving: string;
  profileSaveSuccess: string;
  profileSaveError: string;

  passwordHeaderTitle: string;
  passwordSubtitle: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmNewPasswordLabel: string;
  passwordSaveButton: string;
  passwordSaveButtonSaving: string;

  passwordErrorMismatch: string;
  passwordErrorTooShort: string;
  passwordErrorGeneric: string;
  passwordSuccess: string;
}

const accountProfilePageTexts: Record<"en" | "sw", AccountProfilePageTexts> = {
  en: {
    pageTitle: "Your account – LINKA",
    pageSubtitle:
      "Update your username, email, names, preferred language, app theme, profile picture and account password.",

    loadAccountError: "Failed to load account details.",
    loadingAccount: "Loading your account details...",

    avatarLabel: "Profile picture",
    avatarHint:
      "Use a square image (for example 400x400px) so it looks good in the app.",
    avatarInvalidType: "Please choose a valid image file.",
    avatarTooLarge: "Image is too large. Maximum size is 5MB.",

    profileHeaderTitle: "Login information",
    usernameLabel: "Username",
    emailLabel: "Email",
    firstNameLabel: "First name",
    lastNameLabel: "Last name",

    prefsHeaderTitle: "Preferences (language & theme)",
    preferredLanguageLabel: "Preferred language",
    themeLabel: "Appearance (theme)",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System (auto)",
    languageSw: "Swahili",
    languageEn: "English",

    profileSaveButton: "Save changes",
    profileSaveButtonSaving: "Saving...",
    profileSaveSuccess: "Your account details have been saved.",
    profileSaveError:
      "Failed to save account details. Please check your information and try again.",

    passwordHeaderTitle: "Change account password",
    passwordSubtitle:
      "Enter your current password and then choose a stronger new password.",

    currentPasswordLabel: "Current password",
    newPasswordLabel: "New password",
    confirmNewPasswordLabel: "Confirm new password",
    passwordSaveButton: "Change password",
    passwordSaveButtonSaving: "Changing...",

    passwordErrorMismatch:
      "New password and confirmation do not match.",
    passwordErrorTooShort:
      "New password must be at least 8 characters long.",
    passwordErrorGeneric:
      "Failed to change password. Please make sure the current password is correct.",
    passwordSuccess: "Password changed successfully.",
  },

  sw: {
    pageTitle: "Akaunti yako – LINKA",
    pageSubtitle:
      "Badilisha username, email, majina, lugha unayopendelea, muonekano wa app, picha ya wasifu na nenosiri la akaunti.",

    loadAccountError: "Imeshindikana kupakia taarifa za akaunti.",
    loadingAccount: "Inapakia taarifa za akaunti...",

    avatarLabel: "Picha ya wasifu",
    avatarHint:
      "Tumia picha ya mraba (square), mfano 400x400px, ili ionekane vizuri kwenye app.",
    avatarInvalidType:
      "Tafadhali chagua faili halali la picha.",
    avatarTooLarge:
      "Picha ni kubwa sana. Ukubwa wa juu ni 5MB.",

    profileHeaderTitle: "Taarifa za login",
    usernameLabel: "Username",
    emailLabel: "Barua pepe (email)",
    firstNameLabel: "Jina la kwanza",
    lastNameLabel: "Jina la mwisho",

    prefsHeaderTitle: "Preferences (lugha & muonekano)",
    preferredLanguageLabel: "Lugha unayopendelea",
    themeLabel: "Muonekano (theme)",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System (auto)",
    languageSw: "Kiswahili",
    languageEn: "English",

    profileSaveButton: "Hifadhi mabadiliko",
    profileSaveButtonSaving: "Inahifadhi...",
    profileSaveSuccess: "Taarifa za akaunti zimehifadhiwa kikamilifu.",
    profileSaveError:
      "Imeshindikana kuhifadhi taarifa za akaunti. Hakikisha taarifa ni sahihi kisha jaribu tena.",

    passwordHeaderTitle: "Badili nenosiri la akaunti",
    passwordSubtitle:
      "Weka nenosiri la zamani kisha uchague nenosiri jipya lenye usalama zaidi.",

    currentPasswordLabel: "Nenosiri la sasa",
    newPasswordLabel: "Nenosiri jipya",
    confirmNewPasswordLabel: "Thibitisha nenosiri jipya",
    passwordSaveButton: "Badili nenosiri",
    passwordSaveButtonSaving: "Inabadilisha...",

    passwordErrorMismatch:
      "Nenosiri jipya na lile la uthibitisho hayafanani.",
    passwordErrorTooShort:
      "Nenosiri jipya liwe angalau herufi 8.",
    passwordErrorGeneric:
      "Imeshindikana kubadili nenosiri. Hakikisha nenosiri la zamani ni sahihi.",
    passwordSuccess: "Nenosiri limebadilishwa kikamilifu.",
  },
};

export function getAccountProfilePageTexts(
  language: string | null | undefined,
): AccountProfilePageTexts {
  if (language === "sw") {
    return accountProfilePageTexts.sw;
  }
  return accountProfilePageTexts.en;
}
