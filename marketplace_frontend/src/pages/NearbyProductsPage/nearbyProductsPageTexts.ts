// src/locales/nearbyProductsPageTexts.ts

export interface NearbyProductsPageTexts {
  pageTitle: string;
  pageSubtitle: string;
  backToAllProducts: string;

  searchLabel: string;
  searchPlaceholder: string;
  searchButton: string;

  geolocationNoSupport: string;
  geolocationPermissionDenied: string;
  geolocationGenericError: string;
  locationNeededForMap: string;
  noCoordinatesForShop: string;
  invalidCoordinatesForShop: string;
  noCoordinatesForList: string;

  apiGenericError: string;

  loadingText: string;
  noResultsText: string;

  noImage: string;
  sellerLabel: string;
  cityLabel: string;

  mapPanelTitle: string;
  mapPanelDescription: string;
  mapPanelNoData: string;
  mapOpenAllButton: string;
  mapOpenAllButtonMobile: string;

  cardViewDetails: string;
  cardVisitShop: string;
  cardShowOnMap: string;
  cardStartDirections: string;

  paginationPrev: string;
  paginationNext: string;
  paginationPageLabel: (current: number, total: number) => string;

  mobileMapTitle: string;
  mobileMapSubtitle: string;
  mobileMapCloseTop: string;
  mobileMapCloseBottom: string;

  openMapMobileButton: string;
}

const nearbyProductsPageTexts: Record<"en" | "sw", NearbyProductsPageTexts> = {
  en: {
    pageTitle: "Products near your location",
    pageSubtitle:
      "We use your device location (GPS / browser) to show shops and products close to you. We don’t store your map points – they are only used to display what’s nearby.",
    backToAllProducts: "← Back to all products",

    searchLabel: "Search within nearby products",
    searchPlaceholder: "Search by product or shop name...",
    searchButton: "Search",

    geolocationNoSupport:
      "Your browser does not support location (geolocation). Please try with a different browser or device.",
    geolocationPermissionDenied:
      "You have blocked location access. Please allow location for LINKER in your browser settings and refresh the page.",
    geolocationGenericError:
      "We couldn’t detect your location. Please check your internet and GPS, then try again.",
    locationNeededForMap:
      "We couldn’t get your location yet. Please allow location on your device and browser so we can open directions.",
    noCoordinatesForShop:
      "We don’t have full map coordinates for this shop yet.",
    invalidCoordinatesForShop:
      "The map coordinates for this shop look invalid.",
    noCoordinatesForList:
      "We don’t have map coordinates for these shops yet, so we can’t show a route on the map.",

    apiGenericError:
      "We couldn’t load nearby products at the moment. Please try again in a moment.",

    loadingText: "Looking for products close to your location...",
    noResultsText:
      "No results yet. Check that your location is on, then try again.",

    noImage: "No image",
    sellerLabel: "Shop",
    cityLabel: "City",

    mapPanelTitle: "Map of nearby shops",
    mapPanelDescription:
      "Click any product on the right to focus its shop on the map, or use “Start route” to open Google Maps directions.",
    mapPanelNoData:
      "We don’t have map data yet. Make sure your location is detected and that there are shops with coordinates.",
    mapOpenAllButton: "Open Google Maps (all shops on this page)",
    mapOpenAllButtonMobile: "Open Google Maps (all shops on this page)",

    cardViewDetails: "View details",
    cardVisitShop: "Visit shop",
    cardShowOnMap: "Show on map",
    cardStartDirections: "Start route",

    paginationPrev: "Prev",
    paginationNext: "Next",
    paginationPageLabel: (current, total) =>
      `Page ${current} / ${total}`,

    mobileMapTitle: "Map of nearby shops",
    mobileMapSubtitle:
      "You appear as the dot for your current location on the map.",
    mobileMapCloseTop: "Close",
    mobileMapCloseBottom: "Close",

    openMapMobileButton: "Open map",
  },

  sw: {
    pageTitle: "Bidhaa karibu na ulipo",
    pageSubtitle:
      "Tunatumia location ya kifaa chako (GPS / browser) kuonyesha maduka na bidhaa zilizo karibu na wewe. Hatuhifadhi point zako za ramani, tunazitumia tu kukuonyesha vilivyo jirani.",
    backToAllProducts: "← Rudi kwenye bidhaa zote",

    searchLabel: "Tafuta ndani ya bidhaa za karibu",
    searchPlaceholder: "Tafuta kwa jina la bidhaa au duka...",
    searchButton: "Tafuta",

    geolocationNoSupport:
      "Kivinjari unachotumia hakiruhusu kupata location ya kifaa. Jaribu kutumia browser au kifaa kingine.",
    geolocationPermissionDenied:
      "Umezima ruhusa ya location. Tafadhali ruhusu location kwa LINKER kwenye settings za browser kisha ubofye refresh.",
    geolocationGenericError:
      "Hatukuweza kupata location ya kifaa chako. Hakikisha intaneti na GPS viko sawa kisha jaribu tena.",
    locationNeededForMap:
      "Hatukupata location ya kifaa chako bado. Tafadhali ruhusu location kwenye kifaa chako na kwenye browser ili tuweze kufungua maelekezo.",
    noCoordinatesForShop:
      "Hatuna coordinates kamili za duka hili kwa sasa.",
    invalidCoordinatesForShop:
      "Coordinates za duka hili haziko sahihi.",
    noCoordinatesForList:
      "Hatuna coordinates za maduka haya kwa sasa, hivyo hatuwezi kuonyesha njia kwenye ramani.",

    apiGenericError:
      "Hatukuweza kutafuta bidhaa za karibu kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.",

    loadingText: "Tunatafuta bidhaa zilizo karibu na ulipo...",
    noResultsText:
      "Hakuna matokeo bado. Hakikisha location kwenye kifaa chako imewashwa kisha jaribu tena.",

    noImage: "Hakuna picha",
    sellerLabel: "Duka",
    cityLabel: "Mji",

    mapPanelTitle: "Ramani ya maduka karibu",
    mapPanelDescription:
      "Bofya bidhaa yoyote upande wa kulia kuona duka lake kwenye ramani, au tumia \"Anza safari\" kufungua maelekezo ya Google Maps.",
    mapPanelNoData:
      "Hakuna data ya ramani bado. Hakikisha location yako imepatikana na kuna maduka yenye coordinates.",
    mapOpenAllButton: "Fungua Google Maps (maduka yote kwenye page hii)",
    mapOpenAllButtonMobile:
      "Fungua Google Maps (maduka yote kwenye page hii)",

    cardViewDetails: "Tazama maelezo",
    cardVisitShop: "Tembelea duka",
    cardShowOnMap: "Onyesha kwenye ramani",
    cardStartDirections: "Anza safari",

    paginationPrev: "Nyuma",
    paginationNext: "Mbele",
    paginationPageLabel: (current, total) =>
      `Ukurasa ${current} / ${total}`,

    mobileMapTitle: "Ramani ya maduka karibu",
    mobileMapSubtitle:
      "Unaonekana kama alama ya \"current location\" kwenye ramani.",
    mobileMapCloseTop: "Funga",
    mobileMapCloseBottom: "Funga",

    openMapMobileButton: "Fungua ramani",
  },
};

export function getNearbyProductsPageTexts(
  language: string | null | undefined,
): NearbyProductsPageTexts {
  if (language === "sw") {
    return nearbyProductsPageTexts.sw;
  }
  return nearbyProductsPageTexts.en;
}
