// src/locales/shopPageTexts.ts

export interface ShopPageTexts {
  shopNotFound: string;
  loadingShopDetails: string;
  failedToLoadShop: string;

  breadcrumbProducts: string;
  backLabel: string;

  mapTitle: string;
  mapSubtitle: string;
  mapNoLocation: string;

  heroNoDescription: string;
  heroCallShop: string;
  heroOpenInGoogleMaps: string;

  statsRatingLabel: string;
  statsSalesLabel: string;
  statsProductsLabel: string;
  statsProductsActiveLabel: string;

  productsSectionTitle: (shopName: string) => string;
  productsSectionSubtitle: string;
  productsBackToAll: string;

  filtersTitle: string;
  filtersSubtitle: string;
  filtersAllLabel: string;
  filtersUncategorizedLabel: string;

  productsEmptyForShop: string;
  productsEmptyForCategory: string;

  likeError: string;

  productNoImage: string;
  productHiddenLabel: string;
  productAvailableLabel: string;
  productViewDetails: string;
  productChatSeller: string;
}

const shopPageTexts: Record<"en" | "sw", ShopPageTexts> = {
  en: {
    shopNotFound: "Shop not found.",
    loadingShopDetails: "Loading shop details...",
    failedToLoadShop: "Failed to load shop information.",

    breadcrumbProducts: "Products",
    backLabel: "Back",

    mapTitle: "Map of shop location",
    mapSubtitle:
      "Shop location based on the address saved in the seller profile.",
    mapNoLocation:
      "No latitude/longitude information is available for this shop yet. Please complete the location from the seller profile page.",

    heroNoDescription:
      "No long description has been added for this shop yet.",
    heroCallShop: "Call shop",
    heroOpenInGoogleMaps: "Open in Google Maps",

    statsRatingLabel: "Rating",
    statsSalesLabel: "Total sales",
    statsProductsLabel: "Products",
    statsProductsActiveLabel: "Active products",

    productsSectionTitle: (shopName: string) =>
      `Products from ${shopName}`,
    productsSectionSubtitle:
      "Browse all items sold by this shop. Open product details and chat directly with the seller.",
    productsBackToAll: "Back to all products",

    filtersTitle: "Filter products in this shop",
    filtersSubtitle: "Categories for this shop",
    filtersAllLabel: "All",
    filtersUncategorizedLabel: "No category",

    productsEmptyForShop:
      "This shop has not listed any products yet. Check back later or contact the seller directly.",
    productsEmptyForCategory:
      "This shop has no products in this category yet.",

    likeError:
      "Failed to update like. Make sure you are logged in and try again.",

    productNoImage: "No image",
    productHiddenLabel: "Hidden",
    productAvailableLabel: "Available",
    productViewDetails: "View details",
    productChatSeller: "Chat seller",
  },

  sw: {
    shopNotFound: "Duka halijapatikana.",
    loadingShopDetails: "Inapakia taarifa za duka...",
    failedToLoadShop: "Imeshindikana kupakia taarifa za duka.",

    breadcrumbProducts: "Bidhaa",
    backLabel: "Rudi nyuma",

    mapTitle: "Ramani ya mahali ilipo biashara",
    mapSubtitle:
      "Mahali pa duka kulingana na location iliyohifadhiwa kwenye wasifu wa muuzaji.",
    mapNoLocation:
      "Hakuna taarifa kamili za latitude/longitude kwa duka hili. Tafadhali jaza location kutoka kwenye ukurasa wa muuzaji.",

    heroNoDescription:
      "Hakuna maelezo marefu ya duka yaliyojazwa bado.",
    heroCallShop: "Piga simu dukani",
    heroOpenInGoogleMaps: "Fungua kwenye Google Maps",

    statsRatingLabel: "Rating",
    statsSalesLabel: "Mauzo",
    statsProductsLabel: "Bidhaa",
    statsProductsActiveLabel: "Bidhaa hewani",

    productsSectionTitle: (shopName: string) =>
      `Bidhaa kutoka ${shopName}`,
    productsSectionSubtitle:
      "Hapa unaona bidhaa zote za duka hili. Unaweza kufungua maelezo na kuwasiliana na muuzaji moja kwa moja.",
    productsBackToAll: "Rudi kwenye bidhaa zote",

    filtersTitle: "Chuja bidhaa za duka hili",
    filtersSubtitle: "Aina za bidhaa (categories) za duka hili",
    filtersAllLabel: "Zote",
    filtersUncategorizedLabel: "Haina category",

    productsEmptyForShop:
      "Duka hili bado halijaweka bidhaa. Jaribu kutembelea tena baadae au wasiliana na muuzaji moja kwa moja.",
    productsEmptyForCategory:
      "Hakuna bidhaa kwenye category hii kwa sasa.",

    likeError:
      "Imeshindikana kubadilisha like. Hakikisha umeingia (login) kisha jaribu tena.",

    productNoImage: "Hakuna picha",
    productHiddenLabel: "Haionekani kwa wateja",
    productAvailableLabel: "Inapatikana",
    productViewDetails: "Tazama maelezo",
    productChatSeller: "Ongea na muuzaji",
  },
};

export function getShopPageTexts(
  language: string | null | undefined,
): ShopPageTexts {
  if (language === "sw") {
    return shopPageTexts.sw;
  }
  return shopPageTexts.en;
}
