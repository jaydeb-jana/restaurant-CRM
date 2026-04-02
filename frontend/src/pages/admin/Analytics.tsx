import React, { useState, useEffect } from "react";
import { Order } from "../../types/index";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from "lucide-react";

const AdminAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
    growth: 12.5
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.get("orders");
        setOrders(data);
        
        const totalRev = data.reduce((sum: number, o: any) => sum + o.total, 0);
        const count = data.length;
        
        setStats({
          totalRevenue: totalRev,
          orderCount: count,
          avgOrderValue: count > 0 ? totalRev / count : 0,
          growth: 12.5
        });
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const performanceCards = [
    { label: "Net Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, trend: "+14.2%", up: true, color: "bg-blue-500" },
    { label: "Total Orders", value: stats.orderCount, icon: ShoppingBag, trend: "+8.4%", up: true, color: "bg-orange-500" },
    { label: "Avg. Transaction", value: formatCurrency(stats.avgOrderValue), icon: Zap, trend: "-2.1%", up: false, color: "bg-purple-500" },
    { label: "Customer Growth", value: "24%", icon: BarChart3, trend: "+5.3%", up: true, color: "bg-green-500" },
  ];

  if (loading) return <div className="p-20 text-center">Crunching numbers...</div>;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
          <p className="text-gray-500">Deep dive into your business growth and trends.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </button>
          <button className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-black/10">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-bl-[100px] transition-all group-hover:scale-110`} />
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl text-white ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-full",
                stat.up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}>
                <span>{stat.trend}</span>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm h-[400px] flex items-center justify-center text-gray-400 italic">
          Revenue Projection Chart (Interactive)
        </div>
        <div className="bg-[#1C1C1C] p-10 rounded-[3rem] text-white space-y-8">
          <h3 className="text-xl font-bold">Top Selling Categories</h3>
          <div className="space-y-6">
            {[
              { label: "Main Course", value: 65, color: "bg-[#FC8019]" },
              { label: "Appetizers", value: 45, color: "bg-blue-400" },
              { label: "Desserts", value: 20, color: "bg-purple-400" },
            ].map((cat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>{cat.label}</span>
                  <span>{cat.value}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
