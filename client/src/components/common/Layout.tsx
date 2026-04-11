import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import TableDetector from "../ui/TableDetector";
import { motion, AnimatePresence } from "motion/react";
import { useBranding } from "../../config/branding";

const Layout = () => {
  const { branding } = useBranding();

  React.useEffect(() => {
    document.title = `${branding.name} | ${branding.description}`;
    
    // Update favicon dynamically if it changes
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('href', branding.favicon);
    }
  }, [branding]);


  return (
    <div className="min-h-screen bg-[#F8F8F8] font-sans text-[#1C1C1C]">
      <Navbar />
      <TableDetector />
      <main className="pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-xl font-bold">{branding.name}</span>
              </div>
              <p className="text-[#686B78] text-sm leading-relaxed">
                {branding.description}
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-[#686B78]">
                <li><a href="/menu" className="hover:text-[#FC8019]">Menu</a></li>
                <li><a href="/offers" className="hover:text-[#FC8019]">Offers</a></li>
                <li><a href="/reservation" className="hover:text-[#FC8019]">Reservations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#686B78]">
                <li><a href="/privacy" className="hover:text-[#FC8019]">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-[#FC8019]">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-sm text-[#686B78] leading-relaxed">
                {branding.contact.address}<br />
                Phone: {branding.contact.phone}<br />
                Email: {branding.contact.email}
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-[#686B78]">
            {branding.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
