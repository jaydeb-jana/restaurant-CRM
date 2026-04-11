import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      scanner.clear();
      onScan(decodedText);
    };

    const onScanFailure = (err: any) => {
      // Typically just ignore failures since it scans multiple times a second
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col items-center">
        <div className="w-full flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="font-bold text-lg">Scan Table QR</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 w-full">
          <p className="text-center text-sm text-gray-500 mb-6 font-medium">
            Point your camera at the QR code on your table to magically access the menu.
          </p>
          <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-[#FC8019] shadow-inner"></div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
