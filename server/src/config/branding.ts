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

import { env } from "./env.config.js";

export const branding: BrandingConfig = {
  name: env.APP_NAME,
  shortName: env.APP_SHORT_NAME,
  description: "Premium Restaurant CRM & Management System",
  logo: "/assets/images/logo.png",
  favicon: "/favicon.ico",
  copyright: `© ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.`,
  contact: {
    email: env.APP_EMAIL,
    phone: env.APP_PHONE,
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
