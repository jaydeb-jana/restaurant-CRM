import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../types";
import { api } from "../api/api";

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  loginWithCredentials: (phone: string, password: string) => Promise<boolean>;
  loginAsCustomer: (phone: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  loginWithCredentials: async () => false,
  loginAsCustomer: () => {},
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
    // Check Database Users (Admins/Employees/Managers)
    try {
      const users = await api.get("users");
      const trimmedPhone = phone.trim();
      const trimmedPassword = password.trim();
      
      const user = users.find((u: any) => 
        u.phone.toString().trim() === trimmedPhone && 
        u.password?.toString().trim() === trimmedPassword
      );
      
      if (user) {
        const profile: UserProfile = {
          uid: user.id || `user-${Date.now()}`,
          name: user.name,
          email: user.email || "",
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt || new Date().toISOString()
        };
        setProfile(profile);
        localStorage.setItem("spicekraft_profile", JSON.stringify(profile));
        return true;
      } else {
        console.warn("Login failed: User not found with provided credentials", {
          providedPhone: trimmedPhone,
          providedPass: trimmedPassword,
          dbCount: users.length
        });
      }
    } catch (error) {
      console.error("Error during DB login:", error);
    }
    
    return false;
  };

  const loginAsCustomer = (phone: string) => {
    const customerProfile: UserProfile = {
      uid: `customer-${Date.now()}`,
      name: "Customer",
      phone: phone,
      role: "user",
      createdAt: new Date().toISOString()
    };
    setProfile(customerProfile);
    localStorage.setItem("spicekraft_profile", JSON.stringify(customerProfile));
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
      loginAsCustomer,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
