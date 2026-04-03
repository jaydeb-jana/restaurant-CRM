import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, User, Menu as MenuIcon, X, UtensilsCrossed, ScanLine } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { cn } from "../../api/utils";
import QRScanner from "../ui/QRScanner";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { user, profile, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Menu", path: "/menu" },
    { name: "Offers", path: "/offers" },
    { name: "Reservation", path: "/reservation" },
    { name: "Contact", path: "/contact" },
  ];

  const handleScanSuccess = (decodedText: string) => {
    setIsScanning(false);
    // Real implementation: Store the table ID in context and show a success toast
    alert(`Successfully connected to: ${decodedText}`); 
    navigate("/menu");
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        "bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm shadow-[#FC8019]/5"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FC8019] to-[#FF5200] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FC8019]/20 group-hover:shadow-[#FC8019]/40 transition-all">
                <UtensilsCrossed className="text-white w-7 h-7" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-gray-900 group-hover:text-[#FC8019] transition-colors">
                Spice<span className="text-[#FC8019]">Kraft</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "text-sm font-bold transition-all relative",
                    location.pathname === link.path 
                      ? "text-[#FC8019]" 
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FC8019] rounded-full"
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Scan QR Button */}
              <button 
                onClick={() => setIsScanning(true)}
                className="bg-orange-50 text-[#FC8019] px-4 py-2.5 rounded-full text-sm font-bold hover:bg-orange-100 transition-colors flex items-center space-x-2"
              >
                <ScanLine className="w-4 h-4" />
                <span>Scan Table</span>
              </button>

              <Link to="/cart" className="p-2.5 text-gray-500 hover:text-[#FC8019] hover:bg-orange-50 rounded-full transition-all relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {totalItems}
                  </span>
                )}
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-4 bg-gray-50 pl-3 pr-2 py-1.5 rounded-full border border-gray-100">
                  <Link to={profile?.role === "admin" ? "/admin" : profile?.role === "manager" ? "/manager" : "/profile"} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold pr-2">{profile?.name !== "Customer" && profile?.name ? profile.name : profile?.phone || "User"}</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-full transition-all"
                    title="Logout"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-gray-900 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-black transition-all shadow-xl shadow-gray-200"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-3">
              <button 
                onClick={() => setIsScanning(true)}
                className="p-2 text-[#FC8019] bg-orange-50 rounded-full"
              >
                <ScanLine className="w-5 h-5" />
              </button>

              <Link to="/cart" className="p-2 text-gray-900 relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-900 bg-gray-50 rounded-full"
              >
                {isOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-8 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className="block text-xl font-black text-gray-900 hover:text-[#FC8019] py-2"
                  >
                    {link.name}
                  </Link>
                ))}
                
                <div className="pt-6 border-t border-gray-100">
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="w-full text-center bg-red-50 text-red-500 py-4 rounded-2xl font-bold"
                    >
                      Logout out of {profile?.name || "Account"}
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-gray-200"
                    >
                      Login to your account
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AnimatePresence>
        {isScanning && (
          <QRScanner 
            onScan={handleScanSuccess} 
            onClose={() => setIsScanning(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
