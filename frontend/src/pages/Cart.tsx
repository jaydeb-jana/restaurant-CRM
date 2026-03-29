import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../lib/utils";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Cart = () => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState({ type: "", text: "" });

  const applyCoupon = () => {
    if (!couponCode) return;
    const code = couponCode.toUpperCase();
    
    if (code === "WELCOME50") {
      setDiscount(50);
      setCouponMessage({ type: "success", text: "₹50 discount applied successfully!" });
    } else if (code === "SPICE10") {
      const calcDiscount = total * 0.10; // 10% off
      setDiscount(calcDiscount);
      setCouponMessage({ type: "success", text: "10% discount applied successfully!" });
    } else {
      setDiscount(0);
      setCouponMessage({ type: "error", text: "Invalid or expired coupon code." });
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscount(0);
    setCouponMessage({ type: "", text: "" });
  };

  const tax = (total - discount) * 0.05;
  const finalTotal = (total - discount) + tax;

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (items.length === 0) return;
    setIsPlacingOrder(true);
    try {
      const orderData = {
        tableId: "table_1", // In a real app, this would come from URL params or session/QR
        userId: user?.uid || "guest",
        items: items.map(i => ({
          menuItemId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        total: finalTotal,
        discountApplied: discount,
        couponCode: discount > 0 ? couponCode : null,
        status: "pending",
        paymentStatus: "pending",
        createdAt: new Date().toISOString()
      };
      const response = await api.post("orders", orderData);
      clearCart();
      navigate(`/track/${response.id}`);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="text-gray-400 w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-[#686B78] mb-8">Looks like you haven't added anything yet.</p>
        <Link 
          to="/menu" 
          className="inline-flex items-center space-x-2 bg-[#FC8019] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-xl shadow-orange-100"
        >
          <span>Browse Menu</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-24">
      <h1 className="text-4xl font-bold mb-12">Your Order</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex items-center gap-6"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                  <img 
                    src={item.image || `https://picsum.photos/seed/${item.name}/400/400`} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{item.name}</h3>
                  <p className="text-[#FC8019] font-bold">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center space-x-4 bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-[#FC8019]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-[#FC8019]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary & Coupons */}
        <div className="space-y-6">
          
          {/* Coupon Entry */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[100px] -z-10" />
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Tag className="w-5 h-5 text-[#FC8019]" />
              <span>Have a Coupon?</span>
            </h3>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Enter Code (e.g. WELCOME50)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={discount > 0}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 font-medium uppercase disabled:opacity-50"
              />
              {discount > 0 ? (
                <button 
                  onClick={removeCoupon}
                  className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button 
                  onClick={applyCoupon}
                  className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
            {couponMessage.text && (
              <p className={`mt-3 text-sm font-bold ${couponMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {couponMessage.text}
              </p>
            )}
            <div className="mt-4 flex space-x-2">
              <div className="bg-orange-100 text-[#FC8019] text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200">WELCOME50</div>
              <div className="bg-orange-100 text-[#FC8019] text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200">SPICE10</div>
            </div>
          </div>

          {/* Billing Summary */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-xl">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-[#686B78]">
                <span>Item Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-500 font-medium">
                  <span>Discount ({couponCode})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#686B78]">
                <span>Taxes (5%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              
              <div className="border-t border-gray-100 pt-4 flex justify-between font-black text-2xl">
                <span>To Pay</span>
                <span className="text-gray-900">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-2xl mb-8">
              <p className="text-xs text-[#FC8019] font-bold uppercase tracking-wider mb-1">Payment Method</p>
              <p className="text-sm font-bold">Pay at Restaurant (Table 1)</p>
            </div>

            {user ? (
              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full bg-[#FC8019] text-white py-5 rounded-2xl text-lg font-bold hover:bg-[#FF5200] transition-all shadow-xl shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>{isPlacingOrder ? "Placing Order..." : "Confirm & Place Order"}</span>
                {!isPlacingOrder && <ArrowRight className="w-5 h-5" />}
              </button>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-gray-900 text-white py-5 rounded-2xl text-lg font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center space-x-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Login to Place Order</span>
              </button>
            )}
          </div>
          
          <p className="text-center text-xs text-gray-400 font-medium">
            By placing this order, you agree to our Terms & Conditions and Cancellation Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cart;

