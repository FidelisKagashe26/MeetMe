// src/locales/productEditPageTexts.ts

export interface ProductEditPageTexts {
  authRequired: string;

  back: string;
  allProducts: string;
  pageTitle: string;
  loading: string;

  errorLoadProduct: string;
  errorInvalidImage: string;
  errorImageTooLarge: string;
  errorUploadImageAfterUpdate: string;
  errorUpdateProduct: string;

  formNameLabel: string;
  formDescriptionLabel: string;
  formPriceLabel: string;
  formCurrencyLabel: string;
  formStockLabel: string;
  formActiveLabel: string;

  imageLabel: string;
  imageOptionalSuffix: string;
  imageCurrentLabel: string;
  imageChangeButton: string;
  imageUploadingLabel: string;

  buttonSave: string;
  buttonSaving: string;
}

const productEditPageTexts: Record<"en" | "sw", ProductEditPageTexts> = {
  en: {
    authRequired: "You must be logged in to edit products.",

    back: "Back",
    allProducts: "All products",
    pageTitle: "Edit product",
    loading: "Loading...",

    errorLoadProduct: "Failed to load product.",
    errorInvalidImage: "Please upload a valid image file.",
    errorImageTooLarge: "Image is too large. Max size is 5MB.",
    errorUploadImageAfterUpdate:
      "Product updated, but failed to upload new image. Try again later.",
    errorUpdateProduct: "Failed to update product.",

    formNameLabel: "Name",
    formDescriptionLabel: "Description",
    formPriceLabel: "Price",
    formCurrencyLabel: "Currency",
    formStockLabel: "Stock quantity",
    formActiveLabel: "Active (visible to customers)",

    imageLabel: "Product image",
    imageOptionalSuffix: "(optional)",
    imageCurrentLabel: "Current image",
    imageChangeButton: "Change image",
    imageUploadingLabel: "Uploading...",

    buttonSave: "Save changes",
    buttonSaving: "Saving...",
  },

  sw: {
    authRequired:
      "Lazima uingie kwenye akaunti (login) ili kuhariri bidhaa.",

    back: "Rudi nyuma",
    allProducts: "Bidhaa zote",
    pageTitle: "Hariri bidhaa",
    loading: "Inapakia...",

    errorLoadProduct:
      "Imeshindikana kupakia taarifa za bidhaa.",
    errorInvalidImage:
      "Tafadhali pakia faili halali la picha.",
    errorImageTooLarge:
      "Picha ni kubwa sana. Ukubwa wa juu ni 5MB.",
    errorUploadImageAfterUpdate:
      "Bidhaa imehaririwa, lakini imeshindikana kupakia picha mpya. Jaribu tena baadaye.",
    errorUpdateProduct:
      "Imeshindikana kusasisha bidhaa.",

    formNameLabel: "Jina la bidhaa",
    formDescriptionLabel: "Maelezo ya bidhaa",
    formPriceLabel: "Bei",
    formCurrencyLabel: "Sarafu",
    formStockLabel: "Idadi kwenye stoo",
    formActiveLabel: "Inayoonekana kwa wateja",

    imageLabel: "Picha ya bidhaa",
    imageOptionalSuffix: "(hiari)",
    imageCurrentLabel: "Picha iliyopo kwa sasa",
    imageChangeButton: "Badilisha picha",
    imageUploadingLabel: "Inapakia picha...",

    buttonSave: "Hifadhi mabadiliko",
    buttonSaving: "Inahifadhi...",
  },
};

export function getProductEditPageTexts(
  language: string | null | undefined,
): ProductEditPageTexts {
  if (language === "sw") {
    return productEditPageTexts.sw;
  }
  return productEditPageTexts.en;
}
