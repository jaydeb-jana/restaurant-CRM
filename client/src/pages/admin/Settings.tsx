import React, { useState, useEffect } from "react";
import { api } from "../../api/api";
import { GlobalSettings } from "../../types";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Clock, 
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { useBranding } from "../../config/branding";

const AdminSettings = () => {
  const { branding } = useBranding();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleUpdate = async (updates: Partial<GlobalSettings>) => {
    if (!settings) return;
    const updatedSettings = { ...settings, ...updates };
    setSettings(updatedSettings);
  };

  const handleSaveOperational = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(settings);
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
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Manage global operational parameters for {branding.name}</p>
        </div>
        
        {message && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "px-6 py-4 rounded-2xl text-sm font-bold flex items-center justify-center space-x-2 shadow-xl w-full sm:w-auto",
              message.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Operational Status */}
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
              <Clock className="w-7 h-7 text-[#FC8019]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Operational Mode</h2>
              <p className="text-sm text-gray-400 font-medium">Control ordering availability</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 bg-gray-50 rounded-[2rem] gap-4">
            <div>
              <p className="text-lg font-black text-gray-900 mb-1">Accepting Orders</p>
              <p className="text-sm text-gray-500 font-medium">When disabled, customers cannot place new orders</p>
            </div>
            <button 
              onClick={() => handleUpdate({ isOpen: !settings?.isOpen })}
              disabled={saving}
              className={cn(
                "w-20 h-10 rounded-full transition-all relative shrink-0",
                settings?.isOpen ? "bg-green-500" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-8 h-8 bg-white rounded-full transition-all shadow-lg",
                settings?.isOpen ? "left-11" : "left-1"
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-10 flex justify-end sticky bottom-8 z-30 px-2 sm:px-0">
        <button 
          onClick={handleSaveOperational}
          disabled={saving}
          className="group flex items-center space-x-4 px-12 py-6 bg-[#1C1C1C] text-white rounded-[2.5rem] font-black text-lg hover:bg-black transition-all shadow-2xl shadow-black/20 disabled:opacity-50 hover:-translate-y-1 active:scale-95"
        >
          {saving ? (
            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
          )}
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default AdminSettings;
