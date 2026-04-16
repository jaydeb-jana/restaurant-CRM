import React, { useState, useEffect } from "react";
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
  BarChart3,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../api/utils";
import { motion, AnimatePresence } from "motion/react";

import { useBranding } from "../../config/branding";

const AdminLayout = () => {
  const { branding } = useBranding();

  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
    document.title = `${branding.name} Admin | Management Console`;
  }, [location.pathname]);

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1C1C1C] flex items-center justify-between px-6 z-50">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-[#FC8019]/20">
              <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold tracking-tight">{branding.name}</span>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-[#1C1C1C] text-white flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-[#FC8019]/20">
              <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tight">{branding.name}</span>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all duration-200 text-sm font-bold group",
                  location.pathname === item.path 
                    ? "bg-[#FC8019] text-white shadow-lg shadow-[#FC8019]/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                  location.pathname === item.path ? "text-white" : "text-gray-500 group-hover:text-white"
                )} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="p-8 border-t border-white/5 bg-[#171717]">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{profile?.name || "Admin"}</p>
              <p className="text-[10px] text-[#FC8019] uppercase font-black tracking-widest mt-0.5">Administrator</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-4 px-5 py-3.5 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 rounded-2xl text-sm font-bold w-full border border-red-500/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth pt-16 lg:pt-0">
        <div className={cn(
          "mx-auto w-full h-full",
          location.pathname === "/admin/whatsapp" ? "p-0 max-w-none" : "p-6 lg:p-10 max-w-[1600px]"
        )}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
