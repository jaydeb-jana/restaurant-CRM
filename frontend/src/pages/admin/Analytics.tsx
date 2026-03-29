import React, { useState, useEffect } from "react";
import { Order } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Download
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { motion } from "motion/react";

const AdminAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = async () => {
    try {
      const data = await api.get("orders");
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Calculate stats
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Daily revenue data for chart
  const dailyData = orders.reduce((acc: any[], order) => {
    const date = new Date(order.createdAt).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.revenue += order.total;
      existing.orders += 1;
    } else {
      acc.push({ date, revenue: order.total, orders: 1 });
    }
    return acc;
  }, []).reverse().slice(-7);

  // Category distribution
  const categoryData = [
    { name: "Main Course", value: 45 },
    { name: "Appetizers", value: 25 },
    { name: "Beverages", value: 20 },
    { name: "Desserts", value: 10 },
  ];

  const COLORS = ["#FC8019", "#1C1C1C", "#686B78", "#E4E3E0"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FC8019]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operational Intelligence</h1>
          <p className="text-gray-500 mt-1">Deep dive into your restaurant's performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
            <Calendar className="w-4 h-4" />
            <span>Last 7 Days</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, trend: "+12.5%", color: "text-green-500" },
          { label: "Total Orders", value: totalOrders, icon: ShoppingBag, trend: "+8.2%", color: "text-green-500" },
          { label: "Avg. Order Value", value: formatCurrency(averageOrderValue), icon: BarChart3, trend: "-2.1%", color: "text-red-500" },
          { label: "Active Customers", value: "124", icon: Users, trend: "+15.3%", color: "text-green-500" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                <stat.icon className="w-6 h-6 text-[#FC8019]" />
              </div>
              <div className={cn("flex items-center text-xs font-bold", stat.color)}>
                {stat.trend.startsWith("+") ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-gray-900">Revenue Over Time</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#FC8019] rounded-full" />
                <span className="text-xs font-bold text-gray-400 uppercase">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FC8019" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FC8019" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FC8019" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-10">Sales by Category</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-8">
            {categoryData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-sm font-medium text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Performance */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Top Performing Dishes</h3>
          <button className="text-sm font-bold text-[#FC8019] hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">Dish Name</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">Orders</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">Revenue</th>
                <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { name: "Butter Chicken", category: "Main Course", orders: 145, revenue: "₹42,050", status: "Trending" },
                { name: "Paneer Tikka", category: "Appetizers", orders: 98, revenue: "₹18,620", status: "Stable" },
                { name: "Mango Lassi", category: "Beverages", orders: 86, revenue: "₹7,740", status: "Rising" },
                { name: "Dal Makhani", category: "Main Course", orders: 74, revenue: "₹14,060", status: "Stable" },
              ].map((dish, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-10 py-6 text-sm font-bold text-gray-900">{dish.name}</td>
                  <td className="px-10 py-6 text-sm text-gray-500">{dish.category}</td>
                  <td className="px-10 py-6 text-sm font-mono text-gray-900">{dish.orders}</td>
                  <td className="px-10 py-6 text-sm font-bold text-[#FC8019]">{dish.revenue}</td>
                  <td className="px-10 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      dish.status === "Trending" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {dish.status}
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

export default AdminAnalytics;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
