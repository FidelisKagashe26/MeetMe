// src/locales/productsPageTexts.ts

export interface ProductsPageTexts {
  title: string;
  subtitle: string;
  activeProductsLabel: string;

  helpShow: string;
  helpHide: string;
  helpTitle: string;

  helpItem1Prefix: string;
  helpItem1FieldLabel: string;

  helpItem2Prefix: string;
  helpItem2Field1: string;
  helpItem2Middle: string;
  helpItem2Field2: string;
  helpItem2Suffix: string;

  helpItem3Prefix: string;
  helpItem3FieldLabel: string;
  helpItem3Suffix: string;

  helpItem4Prefix: string;
  helpItem4ChatLabel: string;
  helpItem4Middle: string;
  helpItem4ChatPhrase: string;
  helpItem4Suffix: string;

  searchQueryLabel: string;
  searchQueryPlaceholder: string;
  searchLocationLabel: string;
  searchLocationPlaceholder: string;
  useMyLocation: string;
  detectingLocation: string;
  locationDetectedPrefix: string;
  currentLocationLabel: string;

  noGeoSupport: string;
  couldNotGetLocation: string;

  // NEW: detailed geolocation error messages
  geoPermissionDenied: string;
  geoPositionUnavailable: string;
  geoTimeout: string;

  searchButton: string;

  filtersTitle: string;
  filtersProductLabel: string;
  filtersLocationLabel: string;
  filtersUsingCurrentLocation: string;
  filtersClearLocation: string;
  filtersClearAll: string;
  filtersNone: string;

  resultsTitleNear: string;
  resultsTitleAll: string;
  resultsCount: (count: number) => string;

  errorFailedToLoad: string;
  loadingProducts: string;

  noProductsFoundPrefix: string;
  noProductsFoundForSearch: string;
  noProductsFoundGeneral: string;

  noImage: string;
  outOfStock: string;
  distanceLabel: (distanceKm: number) => string;

  viewDetailsAndOrder: string;
  chat: string;
  openingChat: string;
  visitShop: string;
  unknownShop: string;

  prevPage: string;
  nextPage: string;
  pageLabel: (current: number, total: number) => string;
}

const productsPageTexts: Record<"en" | "sw", ProductsPageTexts> = {
  en: {
    title: "Marketplace products",
    subtitle:
      "Search items from different shops, chat in real time with sellers and place your orders.",
    activeProductsLabel: "Active products",

    helpShow: "Help",
    helpHide: "Hide help",
    helpTitle: "How this marketplace works",

    helpItem1Prefix: "Type the product name in ",
    helpItem1FieldLabel: "What are you looking for?",

    helpItem2Prefix: "Use ",
    helpItem2Field1: "Where are you?",
    helpItem2Middle: " or ",
    helpItem2Field2: "Use my location",
    helpItem2Suffix: " to find items near you.",

    helpItem3Prefix: "Tap ",
    helpItem3FieldLabel: "View details & order",
    helpItem3Suffix: " to see more information and start your order.",

    helpItem4Prefix: "Tap ",
    helpItem4ChatLabel: "Chat",
    helpItem4Middle: " to start ",
    helpItem4ChatPhrase: "real-time chat",
    helpItem4Suffix: " with the seller.",

    searchQueryLabel: "What are you looking for?",
    searchQueryPlaceholder: "e.g. HP laptop, smartphone, sofa...",
    searchLocationLabel: "Where are you?",
    searchLocationPlaceholder: "e.g. Dodoma, Sinza, Mlimani City...",
    useMyLocation: "Use my location",
    detectingLocation: "Detecting...",
    locationDetectedPrefix: "Location detected",
    currentLocationLabel: "Current location",

    noGeoSupport: "Your browser does not support geolocation.",
    couldNotGetLocation: "Could not get your location. Please try again.",

    geoPermissionDenied:
      "We couldn't access your location. Please allow location access in your browser and try again.",
    geoPositionUnavailable:
      "Your location is temporarily unavailable. Try again from an area with better signal or internet.",
    geoTimeout:
      "It took too long to get your location. Please try again or type your area manually.",

    searchButton: "Search",

    filtersTitle: "Active filters:",
    filtersProductLabel: "product",
    filtersLocationLabel: "location",
    filtersUsingCurrentLocation: "using current location",
    filtersClearLocation: "Clear location",
    filtersClearAll: "Clear all",
    filtersNone: "No filters applied. Showing general products.",

    resultsTitleNear: "Products near you",
    resultsTitleAll: "Products on the marketplace",
    resultsCount: (count: number) =>
      `${count} product${count === 1 ? "" : "s"} found`,

    errorFailedToLoad: "Failed to load products. Please try again in a moment.",
    loadingProducts: "Loading products...",

    noProductsFoundPrefix: "No products found",
    noProductsFoundForSearch: "for your current search.",
    noProductsFoundGeneral: "at the moment.",

    noImage: "No image",
    outOfStock: "Out of stock",
    distanceLabel: (distanceKm: number) => `~ ${distanceKm.toFixed(1)} km away`,

    viewDetailsAndOrder: "View details & order",
    chat: "Chat",
    openingChat: "Opening...",
    visitShop: "Visit shop",
    unknownShop: "Unknown shop",

    prevPage: "Prev",
    nextPage: "Next",
    pageLabel: (current: number, total: number) =>
      `Page ${current} / ${total}`,
  },

  sw: {
    title: "Bidhaa za soko mtandaoni",
    subtitle:
      "Tafuta bidhaa kutoka maduka mbalimbali, ongea moja kwa moja na wauzaji na weka oda zako kwa urahisi.",
    activeProductsLabel: "Bidhaa zilizo hewani",

    helpShow: "Msaada",
    helpHide: "Ficha maelezo",
    helpTitle: "Jinsi jukwaa hili la biashara linavyofanya kazi",

    helpItem1Prefix: "Andika jina la bidhaa kwenye kisanduku ",
    helpItem1FieldLabel: "Unatafuta bidhaa gani?",

    helpItem2Prefix: "Tumia ",
    helpItem2Field1: "Upo wapi?",
    helpItem2Middle: " au ",
    helpItem2Field2: "Tumia eneo nilipo",
    helpItem2Suffix: " kupata bidhaa zilizo karibu na wewe.",

    helpItem3Prefix: "Bofya ",
    helpItem3FieldLabel: "Tazama maelezo & weka oda",
    helpItem3Suffix: " kuona maelezo kamili na hatua za kuweka oda.",

    helpItem4Prefix: "Bofya ",
    helpItem4ChatLabel: "Chat na muuzaji",
    helpItem4Middle: " kuanza ",
    helpItem4ChatPhrase: "mawasiliano ya moja kwa moja",
    helpItem4Suffix: " na muuzaji kuhusu bidhaa.",

    searchQueryLabel: "Unatafuta bidhaa gani?",
    searchQueryPlaceholder: "mf. laptop ya HP, simu, sofa...",
    searchLocationLabel: "Upo wapi kwa sasa?",
    searchLocationPlaceholder: "mf. Dodoma, Sinza, Mlimani City...",
    useMyLocation: "Tumia eneo nilipo",
    detectingLocation: "Inatafuta eneo...",
    locationDetectedPrefix: "Eneo limepatikana",
    currentLocationLabel: "Eneo nilipo sasa",

    noGeoSupport:
      "Kivinjari chako hakiruhusu kutambua eneo ulipo kwa sasa.",
    couldNotGetLocation:
      "Hatukuweza kupata eneo lako. Tafadhali jaribu tena.",

    geoPermissionDenied:
      "Hatukupewa ruhusa ya kutambua eneo lako. Ruhusu location kwenye kivinjari chako kisha jaribu tena.",
    geoPositionUnavailable:
      "Eneo lako halijapatikana kwa sasa. Jaribu tena ukiwa kwenye eneo lenye mtandao au GPS bora.",
    geoTimeout:
      "Imeshachukua muda mrefu kutafuta eneo lako. Jaribu tena au andika eneo lako kwenye kisanduku.",

    searchButton: "Tafuta",

    filtersTitle: "Vichujio vinavyotumika:",
    filtersProductLabel: "bidhaa",
    filtersLocationLabel: "eneo",
    filtersUsingCurrentLocation: "unatumia eneo ulipo sasa",
    filtersClearLocation: "Futa eneo",
    filtersClearAll: "Futa vichujio vyote",
    filtersNone: "Hakuna kichujio. Unaona bidhaa zote kwa ujumla.",

    resultsTitleNear: "Bidhaa karibu na ulipo",
    resultsTitleAll: "Bidhaa zote kwenye soko",
    resultsCount: (count: number) =>
      count === 0
        ? "Hakuna bidhaa zimepatikana"
        : `Bidhaa ${count} zimepatikana`,

    errorFailedToLoad:
      "Hatukuweza kupakia bidhaa kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.",
    loadingProducts: "Tunapakia bidhaa...",

    noProductsFoundPrefix: "Hakuna bidhaa zimepatikana",
    noProductsFoundForSearch: "kwa utafutaji ulioweka.",
    noProductsFoundGeneral: "kwa sasa.",

    noImage: "Hakuna picha",
    outOfStock: "Haipo stoo kwa sasa",
    distanceLabel: (distanceKm: number) =>
      `~ ${distanceKm.toFixed(1)} km kutoka ulipo`,

    viewDetailsAndOrder: "Tazama maelezo & weka oda",
    chat: "Chat na muuzaji",
    openingChat: "Inafungua...",
    visitShop: "Tembelea duka",
    unknownShop: "Duka halijatajwa",

    prevPage: "Nyuma",
    nextPage: "Mbele",
    pageLabel: (current: number, total: number) =>
      `Ukurasa ${current} / ${total}`,
  },
};

export function getProductsPageTexts(
  language: string | null | undefined,
): ProductsPageTexts {
  if (language === "sw") {
    return productsPageTexts.sw;
  }
  return productsPageTexts.en;
}
