import React, { useState, useEffect } from "react";
import { Table } from "../../types";
import { api } from "../../services/api";
import { 
  Plus, 
  Trash2, 
  QrCode, 
  Users, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  Maximize2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AdminTables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    zone: "",
    status: "free" as Table["status"]
  });

  const fetchTables = async () => {
    try {
      const data = await api.get("tables");
      setTables(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tables:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await api.put("tables", editingTable.id, formData);
      } else {
        await api.post("tables", formData);
      }
      await fetchTables();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving table:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this table?")) {
      try {
        await api.delete("tables", id);
        await fetchTables();
      } catch (error) {
        console.error("Error deleting table:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ number: "", zone: "", status: "free" });
    setEditingTable(null);
  };

  const openEditModal = (table: Table) => {
    setEditingTable(table);
    setFormData({
      number: table.number,
      zone: table.zone || "",
      status: table.status
    });
    setIsModalOpen(true);
  };

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "free": return "bg-green-100 text-green-700 border-green-200";
      case "occupied": return "bg-red-100 text-red-700 border-red-200";
      case "reserved": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-500 mt-1">Configure your restaurant layout and monitor table status</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center space-x-2 px-6 py-3 bg-[#FC8019] text-white rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-lg shadow-[#FC8019]/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Table</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {tables.map((table) => (
            <motion.div
              key={table.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-[#FC8019]/5 group-hover:border-[#FC8019]/20 transition-colors">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Table</span>
                    <span className="text-2xl font-black text-gray-900">{table.number}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => openEditModal(table)}
                      className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2",
                      getStatusColor(table.status)
                    )}>
                      {table.status}
                    </div>
                    <p className="text-sm font-medium text-gray-400 flex items-center">
                      <LayoutGrid className="w-3 h-3 mr-1.5" />
                      {table.zone || "Main Hall"}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button className="flex items-center space-x-2 text-xs font-bold text-[#FC8019] hover:underline">
                      <QrCode className="w-4 h-4" />
                      <span>Get QR Code</span>
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(table.id)}
                      className="p-2 text-red-100 hover:text-red-500 transition-colors"
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
                    {editingTable ? "Edit Table" : "Add New Table"}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Table Number</label>
                    <input 
                      required
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-black text-2xl"
                      placeholder="e.g. 01"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Zone / Area</label>
                    <input 
                      type="text"
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                      placeholder="e.g. Main Hall, Terrace"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Initial Status</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["free", "occupied", "reserved"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status })}
                          className={cn(
                            "py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                            formData.status === status 
                              ? "bg-gray-900 text-white shadow-lg" 
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full bg-[#FC8019] text-white py-5 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-xl shadow-[#FC8019]/20"
                    >
                      {editingTable ? "Update Table" : "Create Table"}
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

export default AdminTables;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
