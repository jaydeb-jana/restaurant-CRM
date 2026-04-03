import React, { useEffect, useState, useMemo } from "react";
import { Order, Customer } from "../../types";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { 
  ShoppingBag, 
  Clock, 
  TrendingUp, 
  CreditCard,
  ChefHat,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  FileText,
  Download,
  Activity,
  Layers,
  Zap,
  Users,
  Search
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

const filters = [
  { label: "Last 24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "Last 2 Days", value: 2 * 24 * 60 * 60 * 1000 },
  { label: "Last 7 Days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 14 Days", value: 14 * 24 * 60 * 60 * 1000 },
  { label: "Last 1 Month", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "Last 3 Months", value: 90 * 24 * 60 * 60 * 1000 },
  { label: "Last 6 Months", value: 180 * 24 * 60 * 60 * 1000 },
  { label: "Last 12 Months", value: 365 * 24 * 60 * 60 * 1000 },
  { label: "Last 2 Years", value: 730 * 24 * 60 * 60 * 1000 },
];

const ProfessionalDropdown = ({ selected, onSelect, options }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white px-5 py-3 rounded-xl border border-gray-200 hover:border-orange-500 shadow-sm transition-all group h-full"
      >
        <Calendar className="w-5 h-5 text-gray-500" />
        <div className="text-left font-medium">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time Range</p>
          <p className="text-sm text-gray-900">{selected.label}</p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-xl p-2 z-50"
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
                        ? "bg-orange-50 text-orange-600" 
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
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Customer Search</p>
          <p className="text-sm text-gray-900 truncate">
            {selected ? selected.name : "All Customers"}
          </p>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
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
                    <div className="truncate">{c.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{c.phone}</div>
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

const AdminDashboard = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedFilter, setSelectedFilter] = useState(filters[2]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [orders, customersData] = await Promise.all([
        api.get("orders"),
        api.whatsapp.getCustomers()
      ]);
      setAllOrders(orders);
      setCustomers(customersData);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard fetch sync error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const cutoff = Date.now() - selectedFilter.value;
    return allOrders
      .filter(o => {
        const matchesTime = new Date(o.createdAt).getTime() >= cutoff;
        const matchesCustomer = !selectedCustomer || o.userId === selectedCustomer.id;
        return matchesTime && matchesCustomer;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, selectedFilter, selectedCustomer]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const active = filteredOrders.filter((o: any) => !["completed", "cancelled", "rejected"].includes(o.status)).length;
    const rev = filteredOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    
    const prevCutoff = Date.now() - (selectedFilter.value * 2);
    const prevOrders = allOrders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      const matchesTime = t >= prevCutoff && t < (Date.now() - selectedFilter.value);
      const matchesCustomer = !selectedCustomer || o.userId === selectedCustomer.id;
      return matchesTime && matchesCustomer;
    });
    
    const prevRev = prevOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    const revTrend = prevRev === 0 ? "+100%" : `${(((rev - prevRev) / prevRev) * 100).toFixed(1)}%`;

    return {
      totalOrders: total,
      activeOrders: active,
      revenue: rev,
      avgOrderValue: total > 0 ? rev / total : 0,
      revTrend,
      isRevUp: rev >= prevRev
    };
  }, [filteredOrders, allOrders, selectedFilter]);

  const chartData = useMemo(() => {
    const points = 15; // Increased points for smoother graph
    const interval = selectedFilter.value / points;
    const now = Date.now();
    
    return Array.from({ length: points + 1 }).map((_, i) => {
      const start = now - (points - i) * interval;
      const end = now - (points - i - 1) * interval;
      const pointOrders = allOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        const matchesTime = t >= start && t < end;
        const matchesCustomer = !selectedCustomer || o.userId === selectedCustomer.id;
        return matchesTime && matchesCustomer;
      });
      const totals = pointOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        timestamp: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sales: totals,
        rawTime: start
      };
    });
  }, [allOrders, selectedFilter]);

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
    link.setAttribute("download", `spice_kraft_report_${selectedFilter.label.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statCards = [
    { label: "Total Sales", value: stats.totalOrders, icon: ShoppingBag, color: "bg-orange-500", trend: "+14.2%", up: true },
    { label: "Active Orders", value: stats.activeOrders, icon: Activity, color: "bg-blue-600", trend: "+2.1%", up: true },
    { label: "Gross Revenue", value: formatCurrency(stats.revenue), icon: TrendingUp, color: "bg-emerald-600", trend: stats.revTrend, up: stats.isRevUp },
    { label: "Avg. Order Value", value: formatCurrency(stats.avgOrderValue), icon: CreditCard, color: "bg-violet-600", trend: "-1.4%", up: false },
  ];

  if (loading && allOrders.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading Dashboard Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Business Dashboard</h1>
          <p className="text-gray-500 text-sm">Real-time overview of your restaurant performance.</p>
        </div>
        
        <div className="flex items-center space-x-3 h-full">
          <CustomerDropdown 
            customers={customers} 
            selected={selectedCustomer} 
            onSelect={setSelectedCustomer} 
          />
          <ProfessionalDropdown 
            selected={selectedFilter} 
            onSelect={setSelectedFilter} 
            options={filters} 
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-4 rounded-2xl text-white transition-transform group-hover:scale-110", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                stat.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                <span>{stat.trend}</span>
                {stat.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Analysis Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 px-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Performance</h2>
              <p className="text-xs text-gray-500 mt-1">Daily trend and analysis overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peak Sales</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(Math.max(...chartData.map(d => d.sales)))}</p>
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FC8019" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FC8019" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                    dataKey="timestamp" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#FC8019" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#salesGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-gray-900 p-8 rounded-3xl text-white flex flex-col justify-between shadow-lg relative overflow-hidden h-full min-h-[400px]">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5">
                            <ChefHat className="w-8 h-8 text-orange-500" />
                        </div>
                        <div className="px-3 py-1 bg-emerald-500 text-white rounded-full flex items-center space-x-2">
                             <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">Kitchen Status</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Kitchen Workload</h2>
                    <p className="text-gray-400 text-sm mb-10 leading-relaxed">Real-time resource utilization and efficiency metrics.</p>
                    
                    <div className="space-y-10">
                        <div>
                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-4 text-gray-400">
                                <span className="flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-orange-500" /> Current Capacity
                                </span>
                                <span className="text-white">{Math.min(100, stats.activeOrders * 15)}%</span>
                            </div>
                            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, stats.activeOrders * 15)}%` }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="h-full bg-orange-500 rounded-full" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <button className="relative z-10 mt-10 w-full bg-white text-gray-900 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all hover:bg-orange-500 hover:text-white shadow-lg active:scale-95">
                    Refresh Stats
                </button>
            </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-12">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-1">
               <FileText className="w-5 h-5 text-gray-400" />
               <h2 className="text-xl font-bold text-gray-900">Recent Orders Log</h2>
            </div>
            <p className="text-sm text-gray-500">Live transaction history and status tracking</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Print button removed per user request */}
            <button 
              onClick={exportCSV}
              className="flex-1 md:flex-none bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-400 font-bold bg-gray-50/50">
                <th className="px-8 py-5">Order ID</th>
                <th className="px-8 py-5">Table</th>
                <th className="px-8 py-5">Payment</th>
                <th className="px-8 py-5">Items</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5">Time</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.slice(0, 50).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/30 transition-colors cursor-pointer group">
                  <td className="px-8 py-6">
                    <span className="font-mono font-medium text-sm text-gray-500 group-hover:text-gray-900 uppercase">
                      #{order.id.slice(-6)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-700">
                        {order.tableId?.split('_')[1] || "K"}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">Table {order.tableId?.split('_')[1] || "Self"}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "text-[11px] font-bold uppercase px-2.5 py-1 rounded-full",
                      order.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2 max-w-[280px]">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <span key={idx} className="bg-gray-100 text-[10px] font-medium px-2 py-1 rounded-lg text-gray-600">
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                      {order.items.length > 2 && (
                        <span className="text-[10px] font-medium text-orange-600">
                          +{order.items.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-base text-gray-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5 mr-2" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider",
                      order.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "pending" ? "bg-orange-100 text-orange-700" :
                      order.status === "cancelled" || order.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
