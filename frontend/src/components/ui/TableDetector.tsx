import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Utensils } from "lucide-react";

const TableDetector = () => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("table");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (tableId) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [tableId]);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
        >
          <div className="bg-[#1C1C1C] text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#FC8019] rounded-2xl flex items-center justify-center shrink-0">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Welcome to Spice Kraft</h3>
              <p className="text-gray-400 text-sm">You are ordering from <span className="text-[#FC8019] font-bold">Table {tableId}</span></p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableDetector;
