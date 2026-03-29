import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  UtensilsCrossed,
  ChefHat,
  PackageCheck,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "bg-orange-100 text-orange-700", icon: ChefHat },
  ready: { label: "Ready", color: "bg-purple-100 text-purple-700", icon: PackageCheck },
  served: { label: "Served", color: "bg-green-100 text-green-700", icon: UtensilsCrossed },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    try {
      const data = await api.get("orders");
      // Sort by createdAt desc
      const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(sorted);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.put("orders", orderId, { status });
      await fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === "all" || order.status === filter;
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase()) || 
                         order.tableId.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-1">Monitor and manage all active and past orders</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search ID or Table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019] transition-all w-64"
            />
          </div>
          
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filter</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button 
                onClick={() => setFilter("all")}
                className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50", filter === "all" && "text-[#FC8019] font-bold")}
              >
                All Orders
              </button>
              {Object.entries(statusConfig).map(([status, config]) => (
                <button 
                  key={status}
                  onClick={() => setFilter(status as OrderStatus)}
                  className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50", filter === status && "text-[#FC8019] font-bold")}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-50">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Table</span>
                        <span className="text-xl font-black text-gray-900">{order.tableId}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="text-sm font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</span>
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusConfig[order.status].color)}>
                            {statusConfig[order.status].label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {order.status === "pending" && (
                        <>
                          <button 
                            onClick={() => updateOrderStatus(order.id, "accepted")}
                            className="px-6 py-2.5 bg-[#FC8019] text-white text-sm font-bold rounded-xl hover:bg-[#FF5200] transition-all shadow-lg shadow-[#FC8019]/20"
                          >
                            Accept Order
                          </button>
                          <button 
                            onClick={() => updateOrderStatus(order.id, "rejected")}
                            className="px-6 py-2.5 bg-white text-red-500 border border-red-100 text-sm font-bold rounded-xl hover:bg-red-50 transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {order.status === "accepted" && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, "preparing")}
                          className="px-6 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-all"
                        >
                          Start Preparing
                        </button>
                      )}

                      {order.status === "preparing" && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, "ready")}
                          className="px-6 py-2.5 bg-purple-500 text-white text-sm font-bold rounded-xl hover:bg-purple-600 transition-all"
                        >
                          Mark as Ready
                        </button>
                      )}

                      {order.status === "ready" && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, "served")}
                          className="px-6 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-all"
                        >
                          Mark as Served
                        </button>
                      )}

                      {order.status === "served" && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, "completed")}
                          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all"
                        >
                          Complete Order
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Items</h3>
                      <div className="space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-bold text-[#FC8019] border border-gray-100">
                                {item.quantity}x
                              </div>
                              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{item.name}</span>
                            </div>
                            <span className="text-sm font-mono text-gray-400">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-gray-900 font-medium">{formatCurrency(order.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tax (Included)</span>
                          <span className="text-gray-900 font-medium">{formatCurrency(0)}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900">Total Amount</span>
                          <span className="text-xl font-black text-[#FC8019]">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-2 h-2 rounded-full", order.paymentStatus === "paid" ? "bg-green-500" : "bg-yellow-500")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment {order.paymentStatus}</span>
                        </div>
                        <button className="text-[10px] font-bold uppercase tracking-wider text-[#FC8019] hover:underline">
                          View Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
