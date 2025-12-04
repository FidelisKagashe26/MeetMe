import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  image_url?: string | null;
  image?: string | null;
}

interface ProductEditForm {
  name: string;
  description: string;
  price: string;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductImageResponse {
  id: number;
  product: number;
  image: string;
  image_url?: string | null;
}

const ProductEditPage: React.FC = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductEditForm>({
    name: "",
    description: "",
    price: "",
    currency: "TZS",
    stock_quantity: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<ProductResponse>(
          `/api/products/${id}/`
        );
        const p = res.data;

        const initialImage =
          (p.image_url as string | null) ??
          (p.image as string | null) ??
          "";

        setForm({
          name: p.name ?? "",
          description: p.description ?? "",
          price: p.price ?? "",
          currency: p.currency ?? "TZS",
          stock_quantity: p.stock_quantity ?? 0,
          is_active: p.is_active ?? true,
        });

        if (initialImage) {
          setImagePreview(initialImage);
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [id]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 text-sm text-slate-900 dark:text-slate-100">
            You must be logged in to edit products.
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, value } = target;

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

    if (name === "stock_quantity") {
      setForm((prev) => ({
        ...prev,
        stock_quantity: value === "" ? 0 : parseInt(value, 10),
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      // hatufuti preview ya zamani automatically hapa
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      setImageFile(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image is too large. Max size is 5MB.");
      setImageFile(null);
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /**
   * Upload picha mpya ya product kupitia /api/product-images/
   */
  const uploadProductImage = async (
    productId: number,
    file: File
  ): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("product", String(productId));
      formData.append("image", file);

      const res = await apiClient.post<ProductImageResponse>(
        "/api/product-images/",
        formData
      );

      const imageUrl = res.data.image_url ?? res.data.image;
      if (!imageUrl) {
        return null;
      }

      // patch product ili image_url yawe updated
      try {
        await apiClient.patch(`/api/products/${productId}/`, {
          image_url: imageUrl,
        });
      } catch (patchErr) {
        console.warn("Image uploaded, but failed to patch image_url", patchErr);
      }

      return imageUrl;
    } catch (err) {
      console.error("Failed to upload product image", err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);

    const payload: Partial<ProductEditForm> = {
      name: form.name,
      description: form.description,
      price: form.price,
      currency: form.currency,
      stock_quantity: form.stock_quantity,
      is_active: form.is_active,
      // hatutumii image_url hapa; picha inahadndlewa na uploadProductImage
    };

    try {
      // 1) update basic fields
      await apiClient.patch(`/api/products/${id}/`, payload);

      // 2) kama kuna picha mpya, iupload
      if (imageFile) {
        try {
          const newUrl = await uploadProductImage(Number(id), imageFile);
          if (newUrl) {
            setImagePreview(newUrl);
          }
        } catch (uploadErr) {
          console.error(uploadErr);
          setError(
            "Product updated, but failed to upload new image. Try again later."
          );
        }
      }

      navigate(`/products/${id}`);
    } catch (err: unknown) {
      console.error(err);

      const axiosErr = err as {
        response?: { data?: unknown };
      };

      const data = axiosErr.response?.data;
      if (data && typeof data === "object") {
        setError(JSON.stringify(data));
      } else {
        setError("Failed to update product.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <MainHeader />

      <main className="flex-1 max-w-3xl mx-auto py-8 px-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-600 dark:text-slate-300 hover:underline"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <Link
              to="/products"
              className="hover:underline text-slate-700 dark:text-slate-100"
            >
              All products
            </Link>
            <button
              onClick={logout}
              className="px-3 py-1 rounded-full bg-red-500 text-white text-xs"
            >
              Logout
            </button>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-50">
          Edit product
        </h2>

        {loading && (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Loading...
          </div>
        )}

        {error && (
          <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/40 p-2 rounded-lg">
            {error}
          </div>
        )}

        {!loading && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 md:p-6 space-y-4 mt-1"
          >
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

              {imagePreview && (
                <div className="mb-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Current image
                  </div>
                  <img
                    src={imagePreview}
                    alt={form.name}
                    className="w-full max-h-60 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  id="edit-product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="edit-product-image"
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] font-medium text-slate-700 dark:text-slate-100 cursor-pointer hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400"
                >
                  Change image
                </label>
                {imageFile && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                    {imageFile.name}
                  </span>
                )}
                {uploadingImage && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Uploading...
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </main>

      <MainFooter />
    </div>
  );
};

export default ProductEditPage;
