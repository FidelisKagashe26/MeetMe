// src/locales/productDetailPageTexts.ts

export interface ProductDetailPageTexts {
  loadingProduct: string;
  productNotFound: string;
  failedToLoadProduct: string;
  backToProducts: string;
  breadcrumbProducts: string;

  locationFallback: string;
  phoneLabel: string;
  emailLabel: string;

  openInGoogleMaps: string;
  visitFullShop: string;

  locationDirectionsTitle: string;
  locationDirectionsDescription: string;
  getDirections: string;
  directionsUnavailable: string;

  // CTA ya ziada ya kuanza safari
  startNavigation: string;

  distanceLabel: (distanceKm: number) => string;

  noImageAvailable: string;
  priceLabel: string;
  outOfStock: string;
  descriptionTitle: string;
  shopInfoTitle: string;

  placeOrderLoggedIn: string;
  loginToPlaceOrder: string;

  moreFromShopTitle: (shopName: string) => string;
  viewAllProductsFromShop: string;
  loadingOtherProducts: string;
  noOtherProducts: string;
  noOtherProductsForCategory: string;

  suggestionNoImage: string;
  suggestionViewLabel: string;

  // Category filters
  categoriesTitle: string;
  categoriesFromThisShopLabel: string;
  categoriesAllLabel: string;
  categoriesUncategorizedLabel: string;
}

const productDetailPageTexts: Record<"en" | "sw", ProductDetailPageTexts> = {
  en: {
    loadingProduct: "Loading product...",
    productNotFound: "Product not found.",
    failedToLoadProduct: "Failed to load product details.",
    backToProducts: "Back to products",
    breadcrumbProducts: "Products",

    locationFallback: "Location",
    phoneLabel: "Phone",
    emailLabel: "Email",

    openInGoogleMaps: "Open in Google Maps",
    visitFullShop: "Visit full shop",

    locationDirectionsTitle: "Location & directions",
    locationDirectionsDescription:
      "See the shop on Google Maps and start navigation from your current location.",
    getDirections: "Get directions",
    directionsUnavailable: "Directions unavailable",

    startNavigation: "Start navigation to this shop",

    distanceLabel: (distanceKm: number) =>
      `${distanceKm.toFixed(1)} km from you`,

    noImageAvailable: "No image available",
    priceLabel: "Price",
    outOfStock: "Out of stock",
    descriptionTitle: "Description",
    shopInfoTitle: "Shop information",

    placeOrderLoggedIn: "Place order",
    loginToPlaceOrder: "Login to place order",

    moreFromShopTitle: (shopName: string) => `More from ${shopName}`,
    viewAllProductsFromShop: "View all products from this shop →",
    loadingOtherProducts: "Loading other products...",
    noOtherProducts: "This shop has no other products listed yet.",
    noOtherProductsForCategory:
      "This shop has no products in this category yet.",

    suggestionNoImage: "No image",
    suggestionViewLabel: "View",

    categoriesTitle: "Filter products from this shop",
    categoriesFromThisShopLabel: "Categories in this shop",
    categoriesAllLabel: "All",
    categoriesUncategorizedLabel: "No category",
  },

  sw: {
    loadingProduct: "Tunapakia bidhaa...",
    productNotFound: "Bidhaa haijapatikana.",
    failedToLoadProduct: "Hatukuweza kupakia maelezo ya bidhaa.",
    backToProducts: "Rudi kwenye bidhaa",
    breadcrumbProducts: "Bidhaa",

    locationFallback: "Eneo",
    phoneLabel: "Simu",
    emailLabel: "Barua pepe",

    openInGoogleMaps: "Fungua kwenye Google Maps",
    visitFullShop: "Tembelea duka lote",

    locationDirectionsTitle: "Eneo la duka & mwelekeo",
    locationDirectionsDescription:
      "Ona duka kwenye Google Maps na uanze safari kutoka ulipo sasa.",
    getDirections: "Pata maelekezo",
    directionsUnavailable: "Maelekezo hayapatikani",

    startNavigation: "Anza safari ya kwenda dukani",

    distanceLabel: (distanceKm: number) =>
      `~ ${distanceKm.toFixed(1)} km kutoka ulipo`,

    noImageAvailable: "Hakuna picha ya bidhaa",
    priceLabel: "Bei",
    outOfStock: "Haipo stoo kwa sasa",
    descriptionTitle: "Maelezo ya bidhaa",
    shopInfoTitle: "Taarifa za duka",

    placeOrderLoggedIn: "Weka oda",
    loginToPlaceOrder: "Ingia ili uweke oda",

    moreFromShopTitle: (shopName: string) =>
      `Bidhaa nyingine kutoka ${shopName}`,
    viewAllProductsFromShop: "Ona bidhaa zote za duka hili →",
    loadingOtherProducts: "Tunapakia bidhaa nyingine...",
    noOtherProducts: "Duka hili bado halijaweka bidhaa nyingine.",
    noOtherProductsForCategory:
      "Hakuna bidhaa kwenye category hii kwa sasa.",

    suggestionNoImage: "Hakuna picha",
    suggestionViewLabel: "Tazama",

    categoriesTitle: "Chuja bidhaa za duka hili",
    categoriesFromThisShopLabel: "Aina za bidhaa (categories) za duka hili",
    categoriesAllLabel: "Zote",
    categoriesUncategorizedLabel: "Zisizo na category",
  },
};

export function getProductDetailPageTexts(
  language: string | null | undefined,
): ProductDetailPageTexts {
  if (language === "sw") {
    return productDetailPageTexts.sw;
  }
  return productDetailPageTexts.en;
}
