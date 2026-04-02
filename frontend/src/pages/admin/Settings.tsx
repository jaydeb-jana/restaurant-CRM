import React, { useState, useEffect } from "react";
import { 
  doc, 
  onSnapshot, 
  updateDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../../api/firebase";
import { GlobalSettings } from "../../types";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Clock, 
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";

const AdminSettings = () => {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as GlobalSettings);
      } else {
        // Initialize settings if they don't exist
        const initialSettings: GlobalSettings = {
          isOpen: true,
          whatsappConnected: false
        };
        setDoc(doc(db, "settings", "global"), initialSettings);
        setSettings(initialSettings);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdate = async (updates: Partial<GlobalSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "settings", "global"), updates);
      setMessage({ type: "success", text: "Settings updated successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FC8019]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-500 mt-1">Manage global restaurant parameters and integrations</p>
        </div>
        
        {message && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "px-6 py-3 rounded-2xl text-sm font-bold flex items-center space-x-2 shadow-lg",
              message.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Operational Status */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <Clock className="w-6 h-6 text-[#FC8019]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Restaurant Status</h3>
              <p className="text-sm text-gray-400">Control ordering availability</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[2rem]">
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">Accepting Orders</p>
              <p className="text-xs text-gray-500">When disabled, customers cannot place new orders</p>
            </div>
            <button 
              onClick={() => handleUpdate({ isOpen: !settings?.isOpen })}
              disabled={saving}
              className={cn(
                "w-16 h-8 rounded-full transition-all relative",
                settings?.isOpen ? "bg-green-500" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
                settings?.isOpen ? "left-9" : "left-1"
              )} />
            </button>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <Globe className="w-6 h-6 text-[#FC8019]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Integrations</h3>
              <p className="text-sm text-gray-400">Manage third-party connections</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-8 border border-gray-100 rounded-[2rem]">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">WhatsApp Messaging Engine</p>
                  <p className="text-xs text-gray-500">Status: {settings?.whatsappConnected ? "Connected" : "Disconnected"}</p>
                </div>
              </div>
              <button className="text-xs font-bold text-[#FC8019] hover:underline uppercase tracking-widest">
                Configure
              </button>
            </div>

            <div className="flex items-center justify-between p-8 border border-gray-100 rounded-[2rem] opacity-50 grayscale">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">Payment Gateway (Razorpay)</p>
                  <p className="text-xs text-gray-500">Status: Not Configured</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Branding & UI */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <SettingsIcon className="w-6 h-6 text-[#FC8019]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Branding & Experience</h3>
              <p className="text-sm text-gray-400">Customize the look and feel</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Primary Color</label>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#FC8019] rounded-2xl shadow-lg shadow-[#FC8019]/20" />
                <input 
                  type="text" 
                  value="#FC8019" 
                  readOnly
                  className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Currency Symbol</label>
              <input 
                type="text" 
                value="₹" 
                readOnly
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 flex justify-end">
        <button 
          disabled={saving}
          className="flex items-center space-x-3 px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-bold hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>Save All Changes</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
