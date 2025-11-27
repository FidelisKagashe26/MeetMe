// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductsPage from "./pages/ProductsPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import NearbyProductsPage from "./pages/NearbyProductsPage";
import ProductCreatePage from "./pages/ProductCreatePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductEditPage from "./pages/ProductEditPage";
import OrderCreatePage from "./pages/OrderCreatePage";
import ShopPage from "./pages/ShopPage";
import ProtectedRoute from "./components/ProtectedRoute";

import AccountProfilePage from "./pages/AccountProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import NotificationsPage from "./pages/NotificationsPage";
import SellersPage from "./pages/SellersPage";
import ChatPage from "./pages/ChatPage";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Home → products */}
      <Route path="/" element={<Navigate to="/products" replace />} />

      {/* Public pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/shops/:id" element={<ShopPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/nearby" element={<NearbyProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/sellers" element={<SellersPage />} />

      {/* Protected pages (zinahitaji login) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/products/new" element={<ProductCreatePage />} />
        <Route path="/products/:id/edit" element={<ProductEditPage />} />
        <Route path="/seller-profile" element={<SellerProfilePage />} />
        <Route path="/orders/new" element={<OrderCreatePage />} />
        <Route path="/chat" element={<ChatPage />} />

        {/* Akaunti & notifications */}
        <Route path="/account/profile" element={<AccountProfilePage />} />
        <Route
          path="/account/change-password"
          element={<ChangePasswordPage />}
        />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/products" replace />} />
    </Routes>
  );
};

export default App;
