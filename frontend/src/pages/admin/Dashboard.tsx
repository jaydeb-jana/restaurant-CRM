import React, { useEffect, useState } from "react";
import { Order, MenuItem, Table } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";
import { 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    revenue: 0,
    avgOrderValue: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const fetchDashboardData = async () => {
    try {
      const orders = await api.get("orders");
      const sorted = orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentOrders(sorted.slice(0, 10));
      
      const total = sorted.length;
      const active = sorted.filter((o: any) => !["completed", "cancelled", "rejected"].includes(o.status)).length;
      const rev = sorted.reduce((sum: number, o: any) => sum + o.total, 0);
      
      setStats({
        totalOrders: total,
        activeOrders: active,
        revenue: rev,
        avgOrderValue: total > 0 ? rev / total : 0
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "bg-blue-500", trend: "+12%", up: true },
    { label: "Active Orders", value: stats.activeOrders, icon: Clock, color: "bg-orange-500", trend: "+5%", up: true },
    { label: "Total Revenue", value: formatCurrency(stats.revenue), icon: TrendingUp, color: "bg-green-500", trend: "+18%", up: true },
    { label: "Avg. Order", value: formatCurrency(stats.avgOrderValue), icon: Users, color: "bg-purple-500", trend: "-2%", up: false },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operational Intelligence</h1>
        <p className="text-gray-500">Real-time overview of your restaurant's performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-2xl text-white", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full",
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

      {/* Recent Orders */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          <button className="text-[#FC8019] text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <th className="px-8 py-4">Order ID</th>
                <th className="px-8 py-4">Table</th>
                <th className="px-8 py-4">Items</th>
                <th className="px-8 py-4">Total</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6 font-mono font-bold text-xs">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-8 py-6">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">Table {order.tableId.split('_')[1]}</span>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-600">
                    {order.items.length} items
                  </td>
                  <td className="px-8 py-6 font-bold">{formatCurrency(order.total)}</td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      order.status === "completed" ? "bg-green-100 text-green-600" :
                      order.status === "pending" ? "bg-orange-100 text-orange-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs text-gray-400">
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "Just now"}
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

// Helper for cn
import { cn } from "../../lib/utils";

export default AdminDashboard;
