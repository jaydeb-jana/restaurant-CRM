import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../types";

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  loginWithCredentials: (phone: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  loginWithCredentials: async () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedProfile = localStorage.getItem("spicekraft_profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Error parsing saved profile:", e);
      }
    }
    setLoading(false);
  }, []);

  const loginWithCredentials = async (phone: string, password: string): Promise<boolean> => {
    // Check for Admin credentials
    if (phone === "787490719" && password === "Jaydb@123") {
      const adminProfile: UserProfile = {
        uid: "admin-787490719",
        name: "Jay Admin",
        email: "admin@spicekraft.com",
        phone: "787490719",
        role: "admin",
        createdAt: new Date().toISOString()
      };
      setProfile(adminProfile);
      localStorage.setItem("spicekraft_profile", JSON.stringify(adminProfile));
      return true;
    }
    
    // Check Database Users (Employees/Managers)
    try {
      const res = await fetch("/api/db/users");
      const users = await res.json();
      const user = users.find((u: any) => u.phone === phone && u.password === password);
      
      if (user) {
        const employeeProfile: UserProfile = {
          uid: user.id || `emp-${Date.now()}`,
          name: user.name,
          email: user.email || "",
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt || new Date().toISOString()
        };
        setProfile(employeeProfile);
        localStorage.setItem("spicekraft_profile", JSON.stringify(employeeProfile));
        return true;
      }
    } catch (error) {
      console.error("Error during DB login:", error);
    }
    
    return false;
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem("spicekraft_profile");
  };

  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager" || isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user: profile ? { uid: profile.uid, email: profile.email } : null,
      profile, 
      loading, 
      isAdmin, 
      isManager,
      loginWithCredentials,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
