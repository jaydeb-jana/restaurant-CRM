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

export const branding: BrandingConfig = {
  name: "Jaydevb Kraft",
  shortName: "JaydevbKraft",
  description: "Premium Restaurant CRM & Management System",
  logo: "/assets/images/logo.png",
  favicon: "/favicon.ico",
  copyright: "© 2024 Jaydevb Kraft. All rights reserved.",
  contact: {
    email: "hello@jaydevbkraft.com",
    phone: "+91 98765 43210",
    address: "123 Food Street, Culinary City, PIN 123456"
  },
  socials: {
    facebook: "https://facebook.com/jaydevbkraft",
    instagram: "https://instagram.com/jaydevbkraft",
    twitter: "https://twitter.com/jaydevbkraft"
  }
};

export const getBranding = (): BrandingConfig => branding;

export default getBranding;
