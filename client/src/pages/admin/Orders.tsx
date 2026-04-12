import React, { useState, useEffect, useMemo } from "react";
import { Order, OrderStatus, Customer } from "../../types/index";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { useBranding } from "../../config/branding";

import { 
  Search, 
  Clock, 
  Printer, 
  ChevronDown,
  Calendar,
  Filter,
  MoreVertical,
  ChevronRight,
  Zap,
  Activity,
  ArrowRight,
  Download,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const timeFilters = [
  { label: "Last 24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "Last 2 Days", value: 2 * 24 * 60 * 60 * 1000 },
  { label: "Last 7 Days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 14 Days", value: 14 * 24 * 60 * 60 * 1000 },
  { label: "Last 1 Month", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "Last 3 Months", value: 90 * 24 * 60 * 60 * 1000 },
  { label: "Last 6 Months", value: 180 * 24 * 60 * 60 * 1000 },
  { label: "Last 12 Months", value: 365 * 24 * 60 * 60 * 1000 },
  { label: "Last 2 Years", value: 730 * 24 * 60 * 60 * 1000 },
  { label: "Custom Range", value: -1 },
];

const TimeRangeDropdown = ({ selected, onSelect, options, customStart, customEnd, onCustomStartChange, onCustomEndChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row gap-4 h-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-4 bg-white px-6 py-4 rounded-xl border border-gray-200 hover:border-orange-500 shadow-sm transition-all group h-full whitespace-nowrap"
        >
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="text-left font-medium">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Time Range</p>
            <p className="text-sm font-bold text-gray-900">{selected.label}</p>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        {selected.value === -1 && (
          <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Start Date</span>
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0"
              />
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">End Date</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0"
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-100 shadow-xl p-2 z-50 max-h-96 overflow-y-auto scrollbar-hide"
            >
              <div className="flex flex-col">
                {options.map((opt: any) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      onSelect(opt);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      selected.label === opt.label 
                        ? "bg-orange-50 text-orange-600 font-bold" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomerDropdown = ({ customers, selected, onSelect }: { customers: Customer[], selected: Customer | null, onSelect: (c: Customer | null) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return (customers || []).filter(c => 
      (c?.name || "").toLowerCase().includes((search || "").toLowerCase()) || 
      (c?.phone || "").includes(search)
    );
  }, [customers, search]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white px-5 py-3 rounded-xl border border-gray-200 hover:border-orange-500 shadow-sm transition-all group h-full min-w-[200px]"
      >
        <Users className="w-5 h-5 text-gray-500" />
        <div className="text-left font-medium flex-1 truncate">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Customer Search</p>
          <p className="text-sm font-bold text-gray-900 truncate">
            {selected ? selected.name : "All Customers"}
          </p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-gray-100 shadow-2xl p-3 z-50 overflow-hidden"
            >
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                <button
                  onClick={() => {
                    onSelect(null);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    !selected ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  All Customers
                </button>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2",
                      selected?.id === c.id 
                        ? "bg-orange-50 text-orange-600 border-orange-500 font-bold" 
                        : "text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-200"
                    )}
                  >
                    <div className="truncate font-bold italic">{c.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono italic">{c.phone}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400 italic">No matches found</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminOrders = () => {
  const { branding } = useBranding();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">("all");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilters[2]);
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [ordersData, customersData] = await Promise.all([
        api.get("orders"),
        api.whatsapp.getCustomers()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (err) {
      console.error("Orders console sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
      try {
        await api.put("orders", id, { status });
        await fetchData();
      } catch (err) {
        console.error("Operational status mutation error:", err);
      }
  };

  const filteredOrders = useMemo(() => {
    let timeCutoff = Date.now() - selectedTimeFilter.value;
    let customStart = 0;
    let customEnd = Infinity;

    if (selectedTimeFilter.value === -1) {
      customStart = customStartDate ? new Date(customStartDate).getTime() : 0;
      customEnd = customEndDate ? new Date(customEndDate).getTime() + (24 * 60 * 60 * 1000) - 1 : Infinity;
    }

    return orders
      .filter(o => {
        const matchesSearch = (o?.id || "").toLowerCase().includes((search || "").toLowerCase()) || 
                             (o?.tableId || "").toLowerCase().includes((search || "").toLowerCase());
        const matchesStatus = selectedStatus === "all" || o.status === selectedStatus;
        
        const time = new Date(o.createdAt).getTime();
        const matchesTime = selectedTimeFilter.value === -1
          ? (time >= customStart && time <= customEnd)
          : (time >= timeCutoff);
          
        const matchesCustomer = !selectedCustomer || o.userId === selectedCustomer.id;
        return matchesSearch && matchesStatus && matchesTime && matchesCustomer;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, selectedStatus, selectedTimeFilter, selectedCustomer, customStartDate, customEndDate]);

  if (loading && orders.length === 0) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium tracking-wider">Syncing Orders...</p>
        </div>
    );
  }

  const exportCSV = () => {
    const headers = ["Date", "Order ID", "Table", "Status", "Payment", "Items", "Total"];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map(o => {
        const date = new Date(o.createdAt).toLocaleString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        const itemSummary = o.items.map(i => `${i.quantity}x ${i.name}`).join(" | ");
        const tableNumber = o.tableId?.split('_')[1] || "K";
        
        return [
          `"${date}"`,
          `"#${o.id.slice(-8).toUpperCase()}"`,
          `"Table ${tableNumber}"`,
          `"${o.status.toUpperCase()}"`,
          `"${o.paymentStatus.toUpperCase()}"`,
          `"${itemSummary}"`,
          `"${o.total.toFixed(2)}"`
        ].join(",");
      })
    ].join("\n");

    const csvWithBOM = "\uFEFF" + csvContent;
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${branding.shortName.toLowerCase().replace(/\s+/g, '_')}_orders_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 uppercase tracking-tight">Order Management</h1>
          <p className="text-gray-500 text-sm">Monitor and process incoming restaurant orders.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 sm:flex-initial">
            <CustomerDropdown 
              customers={customers} 
              selected={selectedCustomer} 
              onSelect={setSelectedCustomer} 
            />
          </div>
          <div className="flex-1 sm:flex-initial">
            <TimeRangeDropdown 
              selected={selectedTimeFilter} 
              onSelect={setSelectedTimeFilter} 
              options={timeFilters} 
              customStart={customStartDate}
              customEnd={customEndDate}
              onCustomStartChange={setCustomStartDate}
              onCustomEndChange={setCustomEndDate}
            />
          </div>

          <button 
            onClick={exportCSV}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controller */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search Order ID or Table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-sm font-medium shadow-sm"
          />
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 xl:pb-0 xl:col-span-4 scrollbar-hide">
          {["all", "pending", "accepted", "preparing", "ready", "served", "completed", "cancelled", "rejected"].map(status => (
            <button 
              key={status}
              onClick={() => setSelectedStatus(status as any)}
              className={cn(
                "px-5 py-3 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider border",
                selectedStatus === status 
                  ? "bg-orange-500 text-white border-orange-500 shadow-md scale-105" 
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-400 font-bold bg-gray-50/50">
              <th className="px-6 py-5">Order Reference</th>
              <th className="px-6 py-5">Table Info</th>
              <th className="px-6 py-5">Order Status</th>
              <th className="px-6 py-5">Items</th>
              <th className="px-6 py-5">Total Value</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredOrders.map((order) => (
                <motion.tr 
                  key={order.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-5">
                    <p className="font-mono font-medium text-sm text-gray-900 uppercase">#{order.id.slice(-8)}</p>
                    <p className="text-[10px] text-gray-400 flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1.5" />
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-700">
                        {order.tableId?.split("_")[1] || "K"}
                      </div>
                      <span className="font-medium text-sm">Table {order.tableId?.split("_")[1] || "Self"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      order.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "pending" ? "bg-orange-100 text-orange-700 animate-pulse" :
                      order.status === "cancelled" || order.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2 max-w-[300px]">
                      {order.items.slice(0, 2).map((item, i) => (
                        <span key={i} className="bg-gray-100 text-[10px] font-medium px-2 py-1 rounded text-gray-600">
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                      {order.items.length > 2 && (
                        <span className="text-[10px] text-orange-600">+{order.items.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-base font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">{order.paymentStatus}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                        className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
                      >
                        {["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled", "rejected"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="py-20 text-center">
              <p className="text-gray-400 font-medium">No orders found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
