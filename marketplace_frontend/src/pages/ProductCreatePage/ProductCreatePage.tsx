import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface ProductCreateForm {
  category_id: string; // tunahifadhi kama string, tutaconvert wakati wa submit
  name: string;
  description: string;
  price: string;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
}

const ProductCreatePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ===== CATEGORIES (ZA DUKA LANGU) =====
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Quick-add category
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // ===== PRODUCT FORM =====
  const [form, setForm] = useState<ProductCreateForm>({
    category_id: "",
    name: "",
    description: "",
    price: "",
    currency: "TZS",
    stock_quantity: 1,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ===== IMAGE =====
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ==========================
  //  LOAD CATEGORIES ZA DUKA LANGU
  // ==========================
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoryError(null);

      try {
        // Tunatumia endpoint ya backend tuliyoijenga: /api/categories/mine/
        const res = await apiClient.get<Category[]>("/api/categories/mine/");
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategoryError("Imeshindikana kupakia categories za duka. Unaweza kujaribu tena baadaye.");
      } finally {
        setLoadingCategories(false);
      }
    };

    if (user) {
      void loadCategories();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 text-sm text-slate-900 dark:text-slate-100">
            You must be logged in to add a product.
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // ==========================
  //  HANDLERS
  // ==========================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target;
    const { name, value } = target;

    if (name === "stock_quantity") {
      setForm((prev) => ({
        ...prev,
        stock_quantity: value === "" ? 0 : parseInt(value, 10),
      }));
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.type === "checkbox" &&
      name === "is_active"
    ) {
      setForm((prev) => ({
        ...prev,
        is_active: target.checked,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image is too large. Max size is 5MB.");
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ==========================
  //  QUICK-ADD CATEGORY
  // ==========================

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCategoryError(null);
    setSuccess(null);

    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setCategoryError("Weka jina la category kwanza.");
      return;
    }

    setCreatingCategory(true);
    try {
      const payload = {
        name: trimmedName,
        description: newCategoryDescription.trim(),
      };

      const res = await apiClient.post<Category>("/api/categories/", payload);
      const newCat = res.data;

      // ongeza kwenye list na upange kwa alfabeti kidogo
      setCategories((prev) =>
        [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
      );

      // ichague moja kwa moja kwenye product form
      setForm((prev) => ({
        ...prev,
        category_id: String(newCat.id),
      }));

      setNewCategoryName("");
      setNewCategoryDescription("");
      setSuccess("Category imeongezwa na imechaguliwa. Sasa jaza taarifa za bidhaa.");
    } catch (err: unknown) {
      console.error("Failed to create category", err);
      const axiosErr = err as { response?: { data?: unknown } };
      const data = axiosErr.response?.data;

      if (data && typeof data === "object") {
        setCategoryError("Imeshindikana kuhifadhi category: " + JSON.stringify(data));
      } else {
        setCategoryError("Imeshindikana kuhifadhi category. Jaribu tena.");
      }
    } finally {
      setCreatingCategory(false);
    }
  };

  // ==========================
  //  SUBMIT PRODUCT (NA IMAGE)
  // ==========================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Tunatumia FormData ili tuweze kutuma image pamoja na fields zingine
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.price);
      formData.append("currency", form.currency);
      formData.append("stock_quantity", String(form.stock_quantity));
      formData.append("is_active", form.is_active ? "true" : "false");

      if (form.category_id) {
        formData.append("category_id", form.category_id);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      await apiClient.post("/api/products/", formData);
      setSuccess("Product created successfully.");

      // kidogo tuu waweze kuona success, kisha turudi kwenye products
      setTimeout(() => navigate("/products"), 700);
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: unknown } };
      const data = axiosErr.response?.data;

      if (data && typeof data === "object") {
        setError("Failed to create product: " + JSON.stringify(data));
      } else {
        setError("Failed to create product.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  //  UI
  // ==========================

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <MainHeader />

      <main className="flex-1 max-w-3xl mx-auto py-8 px-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Add new product
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Weka category (hiari) ili kupanga bidhaa zako, kisha jaza taarifa za bidhaa.
            </p>
          </div>
          <Link
            to="/seller-profile"
            className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
          >
            ← Back to seller area
          </Link>
        </div>

        {/* GLOBAL ERROR / SUCCESS */}
        {error && (
          <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/40 p-2 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-xs text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-500/10 border border-green-100 dark:border-emerald-500/40 p-2 rounded-lg">
            {success}
          </div>
        )}

        {/* QUICK ADD CATEGORY (JUU KABLA YA PRODUCT FORM) */}
        <form
          onSubmit={handleCreateCategory}
          className="mb-5 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Shop categories
            </h3>
            {loadingCategories && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Loading...
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tengeneza categories kama <span className="font-medium">Simu</span>,{" "}
            <span className="font-medium">Laptop</span>,{" "}
            <span className="font-medium">Accessories</span> ili kupanga bidhaa zako
            ndani ya duka. Si lazima kutumia categories.
          </p>

          {categoryError && (
            <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/40 p-2 rounded-lg">
              {categoryError}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="block text-xs text-slate-700 dark:text-slate-200">
                New category name
              </label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g. Phones"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-xs text-slate-700 dark:text-slate-200">
                Description (optional)
              </label>
              <input
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g. Smartphones and feature phones"
              />
            </div>
            <div className="pt-1 md:pt-0">
              <button
                type="submit"
                disabled={creatingCategory}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-60"
              >
                {creatingCategory ? "Saving..." : "Save category"}
              </button>
            </div>
          </div>
        </form>

        {/* PRODUCT FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 md:p-6 space-y-4"
        >
          {/* Category select */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-700 dark:text-slate-200">
              Category{" "}
              <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                (optional)
              </span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={loadingCategories}
            >
              <option value="">-- No category / Select category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Si lazima uwe na categories; unaweza kuacha tupu kama hutaki.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-700 dark:text-slate-200">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="HP EliteBook 840 G5"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-700 dark:text-slate-200">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={3}
              required
            />
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-slate-700 dark:text-slate-200">
                Price
              </label>
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="800000"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-700 dark:text-slate-200">
                Currency
              </label>
              <input
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="TZS"
                required
              />
            </div>
          </div>

          {/* Stock & Active */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-slate-700 dark:text-slate-200">
                Stock quantity
              </label>
              <input
                type="number"
                name="stock_quantity"
                min={0}
                value={form.stock_quantity}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-5 md:mt-7">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-orange-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-200">
                Active (visible to customers)
              </span>
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-700 dark:text-slate-200">
              Product image
              <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                {" "}
                (optional)
              </span>
            </label>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="product-image"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] font-medium text-slate-700 dark:text-slate-100 cursor-pointer hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400"
              >
                Choose image
              </label>
              {imageFile && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                  {imageFile.name}
                </span>
              )}
            </div>

            {imagePreview && (
              <div className="mt-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Preview
                </div>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-60 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create product"}
            </button>
          </div>
        </form>
      </main>

      <MainFooter />
    </div>
  );
};

export default ProductCreatePage;
