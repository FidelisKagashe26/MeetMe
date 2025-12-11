// src/pages/sellersPageTexts.ts

export interface SellersPageTexts {
  pageTitle: string;
  pageSubtitle: string;

  totalShopsLabel: string;
  totalShopsNearbySuffix: string;

  modeAllBadge: string;
  nearbyModeBadge: (radiusKm: number) => string;

  searchPlaceholder: string;
  searchButton: string;
  clearSearchButton: string;

  nearMeButtonIdle: string;
  nearMeButtonLocating: string;
  nearMeRadiusLabel: string;
  coordsEstimatedLabel: string;

  errorLoadSellers: string;
  errorNoGpsSupport: string;
  errorGeolocationFailed: string;

  loadingText: string;
  emptyStateText: string;

  coverNoPhoto: string;
  verifiedBadge: string;
  salesLabel: string;

  cardVisitShopTitle: string;
  cardVisitShopSubtitle: string;
  cardStartRoute: string;
  cardMap: string;
  cardNoCoordinates: string;

  nearbyMapPanelTitle: string;
  nearbyMapPanelDescription: string;
  nearbyMapPanelNoCoords: string;
  nearbySelectedShopLabel: string;

  nearbyCallButton: string;
  nearbyStartRouteButton: string;
  nearbyProductsButton: string;
}

const sellersPageTexts: Record<"en" | "sw", SellersPageTexts> = {
  en: {
    pageTitle: "Sellers on LINKA",
    pageSubtitle:
      "Search sellers by name, city or country, or use “near me” to see shops close to where you are.",

    totalShopsLabel: "Total shops:",
    totalShopsNearbySuffix: "(near you)",

    modeAllBadge: "All sellers",
    nearbyModeBadge: (radiusKm) => `Near me: ${radiusKm} km`,

    searchPlaceholder: "Search sellers by name, city or country...",
    searchButton: "Search",
    clearSearchButton: "Clear",

    nearMeButtonIdle: "Sellers near me",
    nearMeButtonLocating: "Detecting your location...",
    nearMeRadiusLabel: "Radius:",
    coordsEstimatedLabel: "Your approximate location:",

    errorLoadSellers:
      "We couldn’t load the shops. Please try again later.",
    errorNoGpsSupport:
      "Your device does not support GPS (geolocation).",
    errorGeolocationFailed:
      "We couldn’t get your location. Please allow location access in your browser, then try again.",

    loadingText: "Loading shops...",
    emptyStateText: "No sellers matched your filters.",

    coverNoPhoto: "No shop photo",
    verifiedBadge: "Verified",
    salesLabel: "sales",

    cardVisitShopTitle: "Visit shop",
    cardVisitShopSubtitle: "Click the card to open the shop page.",
    cardStartRoute: "Start route",
    cardMap: "Map",
    cardNoCoordinates: "No coordinates",

    nearbyMapPanelTitle: "Map of shops near you",
    nearbyMapPanelDescription:
      "Click a shop on the left to see its pointer on the map.",
    nearbyMapPanelNoCoords:
      "There are no full map coordinates for the selected shop. Make sure the shops have latitude/longitude on the backend.",
    nearbySelectedShopLabel: "Selected shop:",

    nearbyCallButton: "Call",
    nearbyStartRouteButton: "Start route",
    nearbyProductsButton: "Products",
  },

  sw: {
    pageTitle: "Wauzaji kwenye LINKA",
    pageSubtitle:
      "Tafuta wauzaji kwa jina, mji au nchi, au tumia “near me” kuona maduka yaliyo karibu na ulipo.",

    totalShopsLabel: "Jumla ya maduka:",
    totalShopsNearbySuffix: "(karibu na wewe)",

    modeAllBadge: "Orodha yote",
    nearbyModeBadge: (radiusKm) =>
      `Karibu na ulipo: ${radiusKm} km`,

    searchPlaceholder: "Tafuta seller kwa jina, mji, nchi...",
    searchButton: "Tafuta",
    clearSearchButton: "Futa",

    nearMeButtonIdle: "Sellers karibu na mimi",
    nearMeButtonLocating: "Inatafuta location yako...",
    nearMeRadiusLabel: "Radius:",
    coordsEstimatedLabel: "Location yako imekadiriwa:",

    errorLoadSellers:
      "Imeshindikana kupakia maduka. Jaribu tena baadae.",
    errorNoGpsSupport:
      "Kifaa chako hakina msaada wa GPS (geolocation).",
    errorGeolocationFailed:
      "Imeshindikana kupata location yako. Ruhusu browser kutumia location kisha jaribu tena.",

    loadingText: "Inapakia maduka...",
    emptyStateText:
      "Hakuna seller aliyeonekana kwa vigezo ulivyoweka.",

    coverNoPhoto: "Hakuna picha ya duka",
    verifiedBadge: "Imethibitishwa",
    salesLabel: "mauzo",

    cardVisitShopTitle: "Tembelea duka",
    cardVisitShopSubtitle:
      "Bofya card kufungua ukurasa wa duka.",
    cardStartRoute: "Anza safari",
    cardMap: "Ramani",
    cardNoCoordinates: "Hakuna coordinates",

    nearbyMapPanelTitle: "Ramani ya maduka karibu na wewe",
    nearbyMapPanelDescription:
      "Bofya duka upande wa kushoto kuona pointer yake kwenye ramani.",
    nearbyMapPanelNoCoords:
      "Hakuna coordinates kamili za ramani kwa duka lililochaguliwa. Hakikisha maduka yana latitude/longitude kwenye backend.",
    nearbySelectedShopLabel: "Duka lililochaguliwa:",

    nearbyCallButton: "Piga simu",
    nearbyStartRouteButton: "Anza safari",
    nearbyProductsButton: "Bidhaa",
  },
};

export function getSellersPageTexts(
  language: string | null | undefined,
): SellersPageTexts {
  if (language === "sw") {
    return sellersPageTexts.sw;
  }
  return sellersPageTexts.en;
}
