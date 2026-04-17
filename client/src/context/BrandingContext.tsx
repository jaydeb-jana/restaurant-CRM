import React, { createContext, useContext } from 'react';

export interface BrandingConfig {
  name: string;
  shortName: string;
  description: string;
  logo: string;
  favicon: string;
  copyright: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  socials: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
}

export const staticBranding: BrandingConfig = {
  name: import.meta.env.VITE_APP_NAME || "Jaydevb Kraft",
  shortName: import.meta.env.VITE_APP_SHORT_NAME || "JaydevbKraft",
  description: "Premium Restaurant CRM & Management System",
  logo: "/assets/images/logo.png",
  favicon: "/favicon.ico",
  copyright: `© ${new Date().getFullYear()} ${import.meta.env.VITE_APP_NAME || "Jaydevb Kraft"}. All rights reserved.`,
  contact: {
    email: import.meta.env.VITE_APP_EMAIL || "hello@jaydevbkraft.com",
    phone: import.meta.env.VITE_APP_PHONE || "+91 98765 43210",
    address: "123 Food Street, Culinary City, PIN 123456"
  },
  socials: {
    facebook: "https://facebook.com/jaydevbkraft",
    instagram: "https://instagram.com/jaydevbkraft",
    twitter: "https://twitter.com/jaydevbkraft"
  }
};

interface BrandingContextType {
  branding: BrandingConfig;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrandingContext.Provider value={{ 
      branding: staticBranding, 
      loading: false, 
      refreshBranding: async () => {} 
    }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
