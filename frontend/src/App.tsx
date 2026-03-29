import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Layout from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import OrderTracking from "./pages/OrderTracking";
import Login from "./pages/Login";

// Admin & Manager
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/Orders";
import AdminMenuItems from "./pages/admin/MenuItems";
import AdminTables from "./pages/admin/Tables";
import AdminManagers from "./pages/admin/Managers";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import WhatsAppManagement from "./pages/admin/WhatsAppManagement";
import ManagerDashboard from "./pages/manager/Dashboard";

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="cart" element={<Cart />} />
              <Route path="track/:orderId" element={<OrderTracking />} />
              <Route path="login" element={<Login />} />
              <Route path="offers" element={<div className="p-20 text-center">Offers coming soon</div>} />
              <Route path="reservation" element={<div className="p-20 text-center">Reservations coming soon</div>} />
              <Route path="contact" element={<div className="p-20 text-center">Contact coming soon</div>} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="menu" element={<AdminMenuItems />} />
              <Route path="tables" element={<AdminTables />} />
              <Route path="managers" element={<AdminManagers />} />
              <Route path="whatsapp" element={<WhatsAppManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Manager Routes */}
            <Route path="/manager" element={<ProtectedRoute role="manager"><Layout /></ProtectedRoute>}>
              <Route index element={<ManagerDashboard />} />
            </Route>
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
