import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "../../types/index";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Printer, 
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    try {
      const data = await api.get("orders");
      setOrders(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error("Order fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.put("orders", id, { status });
      await fetchOrders();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                         o.tableId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === "all" || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-20 text-center">Kitchen pipeline loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Orders</h1>
          <p className="text-gray-500 mt-1">Manage incoming and active orders across all tables.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by Order ID or Table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 transition-all"
          />
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide lg:col-span-3">
          {["all", "pending", "accepted", "preparing", "ready", "served", "cancelled"].map(status => (
            <button 
              key={status}
              onClick={() => setSelectedStatus(status as any)}
              className={cn(
                "px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all uppercase tracking-wider",
                selectedStatus === status ? "bg-gray-900 text-white" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-50">
                <th className="px-10 py-6">Order Identification</th>
                <th className="px-10 py-6">Status Indicator</th>
                <th className="px-10 py-6">Order Summary</th>
                <th className="px-10 py-6">Financials</th>
                <th className="px-10 py-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => (
                  <motion.tr 
                    key={order.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-10 py-8">
                      <div>
                        <p className="font-mono font-black text-xs text-gray-900 group-hover:text-[#FC8019] transition-colors">#{order.id.slice(-6).toUpperCase()}</p>
                        <span className="inline-block mt-1 bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {order.tableId.replace("_", " ")}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-2">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={cn(
                        "inline-flex items-center space-x-2 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider",
                        order.status === "completed" ? "bg-green-50 text-green-600" :
                        order.status === "pending" ? "bg-orange-50 text-orange-600 animate-pulse" :
                        order.status === "cancelled" ? "bg-red-50 text-red-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          order.status === "completed" ? "bg-green-600" :
                          order.status === "pending" ? "bg-orange-600" :
                          order.status === "cancelled" ? "bg-red-600" :
                          "bg-blue-600"
                        )} />
                        <span>{order.status}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item, i) => (
                          <p key={i} className="text-sm font-medium text-gray-700">
                            <span className="text-[#FC8019] font-black">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">+{order.items.length - 2} More Items</p>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-lg font-black text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Payment: {order.paymentStatus}</p>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <select 
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                          className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20"
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="served">Served</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-[#FC8019] hover:text-white transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
