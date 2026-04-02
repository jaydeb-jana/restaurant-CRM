import React, { useState, useEffect } from "react";
import { UserProfile } from "../../types";
import { api } from "../../api/api";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  ShieldCheck,
  X,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AdminManagers = () => {
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "manager" as "manager" | "employee"
  });

  const fetchManagers = async () => {
    try {
      const users = await api.get("users");
      setManagers(users.filter((u: any) => u.role === "manager" || u.role === "employee"));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching managers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingManager) {
        const payload = { ...formData };
        if (!payload.password) {
          delete payload.password;
        }
        await api.put("users", editingManager.uid, payload);
      } else {
        await api.post("users", {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      await fetchManagers();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving manager:", error);
    }
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm("Are you sure you want to remove this manager?")) {
      try {
        await api.delete("users", uid);
        await fetchManagers();
      } catch (error) {
        console.error("Error deleting manager:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", password: "", role: "manager" });
    setEditingManager(null);
  };

  const openEditModal = (manager: UserProfile) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email || "",
      phone: manager.phone || "",
      password: "", // Don't show existing password
      role: manager.role as "manager" | "employee" || "manager"
    });
    setIsModalOpen(true);
  };

  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FC8019]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage restaurant managers and employees (access levels)</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center space-x-2 px-6 py-3 bg-[#FC8019] text-white rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-lg shadow-[#FC8019]/20"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add New Staff</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search managers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredManagers.map((manager) => (
            <motion.div
              key={manager.uid}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-[#FC8019]/5 group-hover:border-[#FC8019]/20 transition-colors">
                    <ShieldCheck className="w-6 h-6 text-[#FC8019]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{manager.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {manager.role === "manager" ? "Operations Manager" : "Employee/Staff"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <Mail className="w-4 h-4" />
                    <span>{manager.email || "No email provided"}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <Phone className="w-4 h-4" />
                    <span>{manager.phone || "No phone provided"}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Joined {new Date(manager.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => openEditModal(manager)}
                      className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(manager.uid)}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {editingManager ? "Edit Manager" : "Add New Manager"}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number (For Login)</label>
                    <input 
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      required={!editingManager}
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                      placeholder={editingManager ? "Leave blank to keep unchanged" : "Set strong password"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Staff Role</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium appearance-none"
                    >
                      <option value="manager">Manager (Full Access via Manager Flag)</option>
                      <option value="employee">Employee (Basic Access)</option>
                    </select>
                  </div>

                  <div className="pt-8">
                    <button 
                      type="submit"
                      className="w-full bg-[#FC8019] text-white py-5 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-xl shadow-[#FC8019]/20"
                    >
                      {editingManager ? "Update Manager" : "Create Manager"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminManagers;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
