import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "motion/react";
import { Phone, MessageSquare, ArrowRight, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { api } from "../../api/api";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "admin">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithCredentials, loginAsCustomer } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const success = await loginWithCredentials(phone, password);
    setLoading(false);
    if (success) {
      navigate("/admin");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      const res = await api.auth.sendOTP(phone);
      if (res.success) {
        setStep("otp");
      }
    } catch (error) {
      console.error("OTP Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.verifyOTP(phone, otp);
      if (res.success) {
        loginAsCustomer(phone);
        navigate("/");
      } else {
        alert("Verification failed");
      }
    } catch (err) {
      alert("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-24">
      <div className="bg-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border border-gray-50">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="text-[#FC8019] w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-[#686B78]">Login to track your orders and more.</p>
        </div>

        <div className="space-y-6">
          {step === "phone" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1C1C1C] ml-1">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FC8019] text-white py-4 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-lg shadow-orange-100 flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Sending..." : "Send OTP via WhatsApp"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={() => setStep("admin")}
                className="w-full text-sm text-[#FC8019] font-bold hover:underline"
              >
                Login as Staff/Admin
              </button>
            </form>
          ) : step === "otp" ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1C1C1C] ml-1">Enter OTP</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-100 transition-all font-mono text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FC8019] text-white py-4 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-lg shadow-orange-100"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              <button 
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-[#686B78] font-medium hover:text-[#FC8019]"
              >
                Change Phone Number
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1C1C1C] ml-1">Staff / Admin Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    placeholder="Enter registered mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1C1C1C] ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10 flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-[#FC8019]" />
                <span>Staff / Admin Login</span>
              </button>
              <button 
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-[#686B78] font-medium hover:text-[#FC8019]"
              >
                Back to Customer Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
