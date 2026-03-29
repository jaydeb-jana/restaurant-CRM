import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Utensils, 
  Table as TableIcon, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase";
import { cn } from "../../lib/utils";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Orders", path: "/admin/orders", icon: ClipboardList },
    { name: "Menu Items", path: "/admin/menu", icon: Utensils },
    { name: "Tables", path: "/admin/tables", icon: TableIcon },
    { name: "Managers", path: "/admin/managers", icon: Users },
    { name: "WhatsApp", path: "/admin/whatsapp", icon: MessageSquare },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1C1C1C] text-white flex flex-col">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-[#FC8019] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold">Spice Kraft</span>
          </div>
          
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  location.pathname === item.path 
                    ? "bg-[#FC8019] text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="mt-auto p-8 border-t border-white/5">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile?.name || "Admin"}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Administrator</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
