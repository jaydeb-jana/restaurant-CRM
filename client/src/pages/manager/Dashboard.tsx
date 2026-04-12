import React, { useState } from "react";
import { 
  Clock, CheckCircle2, AlertCircle, ChefHat, 
  Utensils, Bell, Search, ArrowRight, TrendingUp, Users, DollarSign, QrCode, X, Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode";
import { useBranding } from "../../config/branding";
import { useOrders } from "../../hooks/useOrders";


import { Order, Table } from "@/types";

// Helper for Tailwind classes
const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

const ManagerDashboard = () => {
  const { branding } = useBranding();
  const { orders, isLoading, updateStatus } = useOrders();

  const [tables, setTables] = useState<Table[]>([]); // Tables would also be a hook in a full implementation
  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const [search, setSearch] = useState("");
  
  // QR Generator Modal State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrTableId, setQrTableId] = useState("");
  const [qrImage, setQrImage] = useState("");

  const handleUpdateStatus = (orderId: string, status: Order["status"]) => {
    updateStatus({ orderId, status });
  };

  const generateQRCode = async () => {
    if (!qrTableId) return;
    try {
      const url = `https://spicekraft.app/table/${qrTableId}`;
      const dataUrl = await QRCode.toDataURL(url, { 
        width: 400, 
        margin: 2, 
        color: { dark: '#1C1C1C', light: '#FFFFFF' } 
      });
      setQrImage(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === "all" || order.status === filter;
    const matchesSearch = (order?.id || "").toLowerCase().includes(search.toLowerCase()) || 
                          (order?.tableId || "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pending: orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    occupiedTables: tables.filter(t => t.status === "occupied").length,
    totalRevenue: orders.reduce((acc, order) => acc + (order.total || 0), 0),
    avgWaitTime: "12m"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1115]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FC8019]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-white">
      {/* Header */}
      <header className="bg-[#181B21] border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FC8019] to-[#FF5200] rounded-xl flex items-center justify-center shadow-lg shadow-[#FC8019]/20">
              <img src={branding.logo} alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase">
              {branding.shortName} <span className="text-[#FC8019]">Manager</span>
            </h1>

          </div>

          <div className="flex items-center space-x-6">
             <button 
              onClick={() => setIsQRModalOpen(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-bold rounded-lg transition-colors flex items-center space-x-2 border border-gray-700"
             >
               <QrCode className="w-5 h-5 sm:w-4 sm:h-4 text-[#FC8019]" />
               <span className="hidden sm:inline">Generate QRs</span>
             </button>
            <button className="relative p-2.5 bg-gray-800 rounded-lg text-gray-400 hover:text-white border border-gray-700">
              <Bell className="w-5 h-5" />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Live Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="text-[#FC8019]" />} trend="+14% vs yesterday" />
          <StatCard title="Active Orders" value={orders.length} icon={<AlertCircle className="text-blue-500" />} subtitle={`${stats.pending} pending`} />
          <StatCard title="Occupancy" value={`${stats.occupiedTables}/${tables.length}`} icon={<Users className="text-purple-500" />} trend="85% Capacity" />
          <StatCard title="Avg Wait" value={stats.avgWaitTime} icon={<Clock className="text-green-500" />} subtitle="Optimized" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#181B21] p-4 rounded-2xl border border-gray-800">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {(["all", "pending", "preparing", "ready", "served"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  filter === s 
                    ? "bg-[#FC8019] text-white border-[#FC8019] shadow-lg shadow-[#FC8019]/20" 
                    : "bg-transparent text-gray-400 border-gray-700 hover:bg-gray-800"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search Orders or Tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0F1115] border border-gray-700 text-white rounded-xl focus:outline-none focus:border-[#FC8019] transition-all text-sm"
            />
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleUpdateStatus} 
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* QR Modal */}
      <QRModal 
        isOpen={isQRModalOpen} 
        onClose={() => {setIsQRModalOpen(false); setQrImage(""); setQrTableId("");}}
        tableId={qrTableId}
        setTableId={setQrTableId}
        qrImage={qrImage}
        onGenerate={generateQRCode}
      />
    </div>
  );
};

// Sub-components as examples of Feature-specific components
const StatCard = ({ title, value, icon, trend, subtitle }: any) => (
  <div className="bg-[#181B21] p-4 sm:p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-2 truncate">{title}</p>
      <h3 className="text-xl sm:text-3xl font-black text-white truncate">{value}</h3>
      {trend && <p className="text-[10px] sm:text-xs text-green-500 mt-1 sm:mt-2 font-medium flex items-center">{trend}</p>}
      {subtitle && <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 font-medium truncate">{subtitle}</p>}
    </div>
    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-700 shrink-0 ml-2">
      {icon}
    </div>
  </div>
);

const OrderCard = ({ order, onUpdateStatus }: { order: Order, onUpdateStatus: any }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={cn(
      "bg-[#181B21] rounded-2xl border flex flex-col transition-colors",
      order.status === "pending" ? "border-orange-500/30" : "border-gray-800 hover:border-gray-700"
    )}
  >
    <div className="p-6 border-b border-gray-800">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#0F1115] border border-gray-700 text-white rounded-lg flex items-center justify-center text-sm font-black">
            {order.tableId.replace("table", "T").replace("-", "")}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Order ID</p>
            <p className="text-sm font-bold text-gray-200">#{order.id.slice(-5).toUpperCase()}</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
          order.status === "pending" ? "bg-orange-500/10 text-orange-400" :
          order.status === "preparing" ? "bg-blue-500/10 text-blue-400" :
          order.status === "ready" ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-400"
        )}>
          {order.status}
        </div>
      </div>

      <div className="space-y-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-start space-x-3">
            <span className="w-6 h-6 bg-[#0F1115] border border-gray-700 shrink-0 rounded flex items-center justify-center text-xs font-bold text-white">
              {item.quantity}
            </span>
            <span className="text-sm font-medium text-gray-300 leading-tight pt-0.5">{item.name}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="p-6 bg-[#13151A] mt-auto rounded-b-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm font-black text-white">₹{(order.total || 0).toFixed(2)}</p>
      </div>

      <ActionButton order={order} onUpdate={onUpdateStatus} />
    </div>
  </motion.div>
);

const ActionButton = ({ order, onUpdate }: { order: Order, onUpdate: any }) => {
  if (order.status === "pending") return (
    <button onClick={() => onUpdate(order.id, "preparing")} className="w-full py-3 bg-[#FC8019] text-white rounded-xl font-bold hover:bg-[#FF5200] flex items-center justify-center space-x-2">
      <span>Accept & Prepare</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );
  if (order.status === "preparing") return (
    <button onClick={() => onUpdate(order.id, "ready")} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 flex items-center justify-center space-x-2">
      <span>Mark as Ready</span>
      <CheckCircle2 className="w-4 h-4" />
    </button>
  );
  if (order.status === "ready") return (
    <button onClick={() => onUpdate(order.id, "served")} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 flex items-center justify-center space-x-2">
      <span>Mark as Served</span>
      <Utensils className="w-4 h-4" />
    </button>
  );
  return (
    <button onClick={() => onUpdate(order.id, "completed")} className="w-full py-3 bg-[#0F1115] text-white border border-gray-700 rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center space-x-2">
      <span>Complete Order</span>
    </button>
  );
};

const QRModal = ({ isOpen, onClose, tableId, setTableId, qrImage, onGenerate }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1115]/80 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#181B21] border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden relative flex flex-col">
          <div className="w-full flex justify-between items-center p-6 border-b border-gray-800">
            <h3 className="font-bold text-lg text-white flex items-center">
              <QrCode className="w-5 h-5 mr-2 text-[#FC8019]" /> Table QR Studio
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Table Identifier</label>
              <input type="text" placeholder="e.g. table_1" value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full px-4 py-3 bg-[#0F1115] border border-gray-700 text-white rounded-xl focus:border-[#FC8019] outline-none" />
            </div>
            <button onClick={onGenerate} disabled={!tableId} className="w-full py-3 bg-gray-800 text-white border border-gray-700 rounded-xl font-bold hover:bg-gray-700 disabled:opacity-50">
              Generate QR
            </button>
            {qrImage && (
              <div className="pt-4 flex flex-col items-center border-t border-gray-800">
                <div className="p-4 bg-white rounded-2xl mb-4">
                  <img src={qrImage} alt="Table QR" className="w-48 h-48" />
                </div>
                <a href={qrImage} download={`Table_${tableId}_QR.png`} className="px-6 py-2 bg-[#FC8019] text-white rounded-lg font-bold flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download HD Image</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ManagerDashboard;
