// src/pages/seller/sellerProfileTexts.ts

export const sellerProfileTexts = {
  // -------- GENERIC / ERRORS / STATUS --------
  mustLogin: {
    en: "You must be logged in to manage seller profile.",
    sw: "Lazima uingie (login) ili kudhibiti wasifu wa muuzaji.",
  },
  loadProductsError: {
    en: "Failed to load your products.",
    sw: "Imeshindikana kupakia bidhaa zako.",
  },
  loadProfileError: {
    en: "Failed to load seller profile.",
    sw: "Imeshindikana kupakia wasifu wa muuzaji.",
  },
  geolocationNotAvailable: {
    en: "Geolocation is not available in this browser.",
    sw: "Geolocation haipatikani kwenye browser hii.",
  },
  geolocationReadError: {
    en: "Failed to read your current location.",
    sw: "Imeshindikana kusoma location yako.",
  },
  profileStep1MissingNameError: {
    en: "Please enter your business name before continuing.",
    sw: "Tafadhali weka jina la biashara kabla ya kuendelea.",
  },
  profileStep1CompletedMessage: {
    en: "Step 1 completed. Now fill your shop location details.",
    sw: "Hatua ya kwanza imekamilika. Sasa jaza taarifa za location ya duka.",
  },
  profileStep2MissingNameError: {
    en: "Please fill your business name in the first step before saving.",
    sw: "Tafadhali jaza kwanza jina la biashara kwenye hatua ya kwanza.",
  },
  saveProfileError: {
    en: "Failed to save seller profile.",
    sw: "Imeshindikana kuhifadhi taarifa za muuzaji.",
  },
  saveProfileSuccess: {
    en: "Seller profile and location have been saved successfully.",
    sw: "Wasifu wa muuzaji na location vimehifadhiwa kikamilifu.",
  },

  // -------- HEADER --------
  headerExistingTitle: {
    en: "Seller dashboard",
    sw: "Dashibodi ya muuzaji",
  },
  headerNewTitle: {
    en: "Set up your seller account",
    sw: "Weka taarifa za duka lako",
  },
  headerSubtitle: {
    en: "Manage your shop details, location and products from one place.",
    sw: "Simamia taarifa za duka, location na bidhaa kutoka sehemu moja.",
  },
  headerRatingLabel: {
    en: "Rating",
    sw: "Rating",
  },
  headerTotalSalesLabel: {
    en: "Total sales",
    sw: "Mauzo yote",
  },
  headerVerified: {
    en: "Verified shop",
    sw: "Duka limesajiliwa (verified)",
  },
  headerNotVerified: {
    en: "Not verified",
    sw: "Bado halijathibitishwa",
  },
  viewPublicShopPage: {
    en: "View public shop page",
    sw: "Angalia ukurasa wa duka",
  },
  changeCompanyLogo: {
    en: "Change company logo",
    sw: "Badili logo ya kampuni",
  },
  loadingProfile: {
    en: "Loading current profile...",
    sw: "Inapakia taarifa...",
  },

  // -------- STEPS --------
  stepCounterPrefix: {
    en: "Step",
    sw: "Hatua",
  },
  stepCounterOf: {
    en: "of",
    sw: "ya",
  },
  stepTapHint: {
    en: "Tap a step number or label to switch between sections.",
    sw: "Bofya namba au jina la hatua kubadilisha sehemu ya kujaza.",
  },
  stepProfileLabel: {
    en: "Profile",
    sw: "Wasifu",
  },
  stepLocationLabel: {
    en: "Location",
    sw: "Location",
  },
  stepProductsLabel: {
    en: "Products",
    sw: "Bidhaa",
  },

  // -------- PROFILE STEP --------
  profileBusinessNameLabel: {
    en: "Business name",
    sw: "Jina la biashara",
  },
  profileBusinessNamePlaceholder: {
    en: "e.g. Microspace Dodoma",
    sw: "mf. Microspace Dodoma",
  },
  profilePhoneLabel: {
    en: "Phone number",
    sw: "Namba ya simu",
  },
  profilePhoneHint: {
    en: "You can choose any country's phone number, but the default is Tanzania.",
    sw: "Unaweza kuchagua namba ya nchi yoyote, lakini default ni Tanzania.",
  },
  profileDescriptionLabel: {
    en: "Description",
    sw: "Maelezo mafupi ya duka",
  },
  profileDescriptionPlaceholder: {
    en: "Short description about your store/services.",
    sw: "Elezea kwa ufupi unachouza au huduma unazotoa.",
  },

  // -------- LOGO & SHOP IMAGE --------
  logoLabel: {
    en: "Company / brand logo",
    sw: "Logo ya kampuni / brand",
  },
  logoNone: {
    en: "No logo",
    sw: "Hakuna logo",
  },
  logoChooseImageBtn: {
    en: "Choose image...",
    sw: "Chagua picha...",
  },
  logoHelpText: {
    en: "Logo will be used as a small avatar next to your shop name across the app.",
    sw: "Logo itaonekana kama kitambulisho kidogo karibu na jina la duka kwenye sehemu mbalimbali.",
  },
  shopImageLabel: {
    en: "Shop front photo (facade)",
    sw: "Picha ya nje ya duka (facade)",
  },
  shopImageNone: {
    en: "No shop photo",
    sw: "Hakuna picha ya duka",
  },
  shopImageUploadBtn: {
    en: "Upload shop photo...",
    sw: "Weka picha ya duka...",
  },
  shopImageHelpText: {
    en: "This photo will be shown on Nearby products and on the Sellers list page. Use a clear front view of your shop so customers can recognize it quickly.",
    sw: "Picha hii itaonekana kwenye Nearby products na kwenye ukurasa wa orodha ya maduka (Sellers). Chagua picha ya mbele ya duka ili mteja akifikia atambue haraka.",
  },

  // -------- LOCATION STEP --------
  locationTitle: {
    en: "Business location",
    sw: "Location ya biashara",
  },
  locationSubtitle: {
    en: "Fill in your shop address, then use the map button to set your current latitude & longitude.",
    sw: "Jaza anuani ya duka, kisha tumia kitufe kwenye ramani kupakia latitude & longitude ya sasa.",
  },
  addressLabel: {
    en: "Address",
    sw: "Anuani (mtaa / jengo)",
  },
  cityLabel: {
    en: "City",
    sw: "Jiji / mji",
  },
  stateLabel: {
    en: "State",
    sw: "Mkoa / state",
  },
  countryLabel: {
    en: "Country",
    sw: "Nchi",
  },
  postalCodeLabel: {
    en: "Postal code",
    sw: "Postal code",
  },
  latitudeLabel: {
    en: "Latitude",
    sw: "Latitude",
  },
  longitudeLabel: {
    en: "Longitude",
    sw: "Longitude",
  },
  mapDetecting: {
    en: "Detecting...",
    sw: "Inatafuta location...",
  },
  mapUseCurrent: {
    en: "Use my current location",
    sw: "Tumia location ya sasa",
  },
  mapHelpText: {
    en: "Map shows the position based on the latitude & longitude you entered.",
    sw: "Ramani inaonyesha location kulingana na latitude & longitude ulizoweka.",
  },

  // -------- BUTTONS / ACTIONS --------
  backToPreviousStep: {
    en: "Back to previous step",
    sw: "Rudi hatua iliyotangulia",
  },
  savingProfile: {
    en: "Saving profile...",
    sw: "Inahifadhi wasifu...",
  },
  savingLocation: {
    en: "Saving location...",
    sw: "Inahifadhi location...",
  },
  saveAndNext: {
    en: "Save & go to next step",
    sw: "Hifadhi na nenda hatua inayofuata",
  },
  saveProfileAndLocation: {
    en: "Save profile + location",
    sw: "Hifadhi wasifu + location",
  },

  // -------- PRODUCTS STEP --------
  productsTitle: {
    en: "Your products",
    sw: "Bidhaa zako",
  },
  productsSubtitle: {
    en: "These are all products linked to your shop. This step is optional.",
    sw: "Hizi ni bidhaa zote zilizounganishwa na duka lako. Hatua hii ni ya hiari.",
  },
  backToLocation: {
    en: "Back to location",
    sw: "Rudi location",
  },
  productsAddNew: {
    en: "+ Add new product",
    sw: "+ Ongeza bidhaa mpya",
  },
  productsViewPublic: {
    en: "View public shop",
    sw: "Tazama duka kwa wateja",
  },
  productsLoading: {
    en: "Loading your products...",
    sw: "Inapakia bidhaa zako...",
  },
  productsEmpty: {
    en: "You don't have any products yet. You can still continue using the system without adding products now.",
    sw: "Bado hujaongeza bidhaa yoyote. Unaweza kuendelea kutumia mfumo bila kuongeza bidhaa sasa.",
  },
  productsNoImage: {
    en: "No image",
    sw: "Hakuna picha",
  },
  productVisible: {
    en: "Active",
    sw: "Inaonekana kwa wateja",
  },
  productHidden: {
    en: "Hidden",
    sw: "Imefichwa",
  },
  productPreviewButton: {
    en: "Preview",
    sw: "Tazama",
  },
  productEditButton: {
    en: "Edit",
    sw: "Hariri",
  },
} as const;
