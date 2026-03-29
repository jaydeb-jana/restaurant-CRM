import React, { useState, useEffect } from "react";
import { MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle, Users, CheckSquare, Square } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { api } from "../../services/api";

const WhatsAppManagement = () => {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Test Message States
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Customer & Bulk Messaging States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      setStatus(data.status);
      setQrCode(data.qr);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.whatsapp.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCustomers();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      await api.whatsapp.connect();
      await fetchStatus();
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect WhatsApp?")) return;
    try {
      setLoading(true);
      await api.whatsapp.disconnect();
      await fetchStatus();
    } catch (error) {
      console.error("Error disconnecting WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    try {
      setSendingTest(true);
      const res = await api.whatsapp.sendTest(testPhone, testMessage);
      if (res.success) {
        alert("Test message sent successfully!");
        setTestMessage("");
      } else {
        alert("Failed to send test message: " + res.error);
      }
    } catch (error) {
      alert("Error sending test message");
    } finally {
      setSendingTest(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedCustomers.length === 0 || !bulkMessage) {
      alert("Select customers and type a message.");
      return;
    }
    if (!window.confirm(`Send message to ${selectedCustomers.length} customers?`)) return;

    try {
      setSendingBulk(true);
      const res = await api.whatsapp.bulkSend(selectedCustomers, bulkMessage);
      if (res.success) {
        alert(`Successfully sent to ${res.results.filter((r:any) => r.status === 'success').length} numbers.`);
        setBulkMessage("");
        setSelectedCustomers([]);
      } else {
        alert("Failed to send bulk message: " + res.error);
      }
    } catch (error) {
      alert("Error sending bulk messages");
    } finally {
      setSendingBulk(false);
    }
  };

  const toggleCustomer = (phone: string) => {
    setSelectedCustomers(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const toggleAllCustomers = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.phone));
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">WhatsApp Engine</h1>
        <p className="text-gray-500">Manage real-time notifications and customer engagement.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Connection & Quick Test */}
        <div className="space-y-8">
          {/* Connection Status */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                  status === "connected" ? "bg-green-50 text-green-500" : "bg-gray-50 text-gray-400"
                )}>
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">WhatsApp Session</h3>
                  <p className="text-sm text-gray-500">
                    {status === "connected" ? "Connected Setup" : "No active session found"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider",
                status === "connected" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              )}>
                {status}
              </div>
            </div>

            {status === "disconnected" && (
              <div className="text-center py-10 space-y-6">
                <p className="text-gray-500 max-w-sm mx-auto">
                  Connect your WhatsApp account to unlock marketing campaigns, automated updates, and OTPs.
                </p>
                <button 
                  onClick={handleConnect}
                  className="bg-[#25D366] text-white px-10 py-4 rounded-2xl font-bold hover:bg-[#128C7E] transition-all shadow-xl shadow-green-100 flex items-center justify-center space-x-2 mx-auto"
                >
                  <QrCode className="w-5 h-5" />
                  <span>Generate Connection QR</span>
                </button>
              </div>
            )}

            {status === "connecting" && (
              <div className="text-center py-10 space-y-8">
                {qrCode ? (
                  <div className="bg-white p-8 inline-block rounded-3xl border-4 border-gray-50 shadow-inner">
                    <img src={qrCode} alt="WhatsApp QR" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-12 h-12 text-[#FC8019] animate-spin" />
                    <p className="text-gray-500">Generating QR Code...</p>
                  </div>
                )}
                <div className="space-y-4">
                  <p className="font-bold">Scan this QR with WhatsApp</p>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Open WhatsApp {">"} Settings {">"} Linked Devices {">"} Link a Device.
                  </p>
                  <button 
                    onClick={handleDisconnect}
                    className="text-red-500 text-sm font-bold hover:underline flex items-center justify-center space-x-2 mx-auto"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel Connection</span>
                  </button>
                </div>
              </div>
            )}

            {status === "connected" && (
              <div className="space-y-8">
                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center space-x-4">
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                  <p className="text-green-700 text-sm font-medium">
                    WhatsApp is actively linked. Marketing & automated messages are live.
                  </p>
                </div>

                <button 
                  onClick={handleDisconnect}
                  className="text-red-500 text-sm font-bold hover:underline"
                >
                  Disconnect WhatsApp Session
                </button>
              </div>
            )}
          </div>

          {/* Quick Test */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Quick Targeted Delivery</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Custom Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+91 98765 43210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Message</label>
                <textarea 
                  placeholder="Type a targeted message to this specific number..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-100 h-24 resize-none"
                />
              </div>
              <button 
                onClick={handleSendTest}
                disabled={sendingTest || status !== "connected" || !testPhone || !testMessage}
                className="w-full bg-[#1C1C1C] text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Targeted Message</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Directory & Bulk Sender */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-10rem)] max-h-[850px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-orange-50 text-[#FC8019] rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Marketing Hub</h3>
                <p className="text-sm text-gray-500">{customers.length} authenticated contacts</p>
              </div>
            </div>
            
            <button 
              onClick={fetchCustomers}
              className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-6 pr-4 space-y-3 custom-scrollbar">
            {customers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4">
                <Users className="w-12 h-12 opacity-20" />
                <p>No customers found.<br/>Users will appear here once they log in via OTP.</p>
              </div>
            ) : (
              <>
                <div 
                  onClick={toggleAllCustomers}
                  className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors mb-4"
                >
                  {selectedCustomers.length === customers.length && customers.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-[#FC8019]" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-bold text-sm">Select All Contacts</span>
                </div>
                
                {customers.map((c, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleCustomer(c.phone)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 cursor-pointer hover:border-[#FC8019] hover:bg-orange-50/30 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      {selectedCustomers.includes(c.phone) ? (
                        <CheckSquare className="w-5 h-5 text-[#FC8019]" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                      <div>
                        <p className="font-bold text-sm">{c.phone}</p>
                        <p className="text-xs text-gray-400">Last login: {new Date(c.lastLogin || c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-500">Bulk Messaging Campaign</h4>
            <textarea 
              placeholder="Type announcement, discount logic, or holiday message..."
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-100 h-28 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-400">
                {selectedCustomers.length} selected
              </span>
              <button 
                onClick={handleBulkSend}
                disabled={sendingBulk || status !== "connected" || selectedCustomers.length === 0 || !bulkMessage}
                className="bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#128C7E] transition-all shadow-lg flex items-center space-x-2 disabled:opacity-50 disabled:shadow-none"
              >
                {sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Launch Campaign</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManagement;
