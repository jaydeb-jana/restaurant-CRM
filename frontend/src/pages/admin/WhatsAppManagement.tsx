import React, { useState, useEffect } from "react";
import { 
  MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle, 
  Users, CheckSquare, Square, Smartphone, Plus, Trash2, Power, LayoutGrid, 
  Settings as SettingsIcon, AlertCircle, Phone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../api/utils";
import { api } from "../../api/api";

interface WhatsAppSession {
  id: string;
  status: "disconnected" | "connecting" | "connected";
  qr: string | null;
  me: {
    name: string;
    number: string;
  } | null;
}

const WhatsAppManagement = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("primary");
  const [primarySessionId, setPrimarySessionId] = useState<string>("primary");
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  
  // Test Message States
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Customer & Bulk Messaging States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<"select" | "paste">("select");
  const [pastedNumbers, setPastedNumbers] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  const activeSession = sessions.find(s => s.id === selectedSessionId) || { id: selectedSessionId, status: "disconnected", qr: null, me: null };

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      
      // Update success message logic: only if a session just became connected
      data.sessions.forEach((newSession: WhatsAppSession) => {
        const oldSession = sessions.find(s => s.id === newSession.id);
        if (oldSession && oldSession.status !== "connected" && newSession.status === "connected") {
          setShowSuccess(newSession.id);
          setTimeout(() => setShowSuccess(null), 4000);
        }
      });

      setSessions(data.sessions || []);
      if (data.primaryId) setPrimarySessionId(data.primaryId);
      
      // Ensure selected exists or fallback
      if (data.sessions.length > 0 && !data.sessions.find((s: any) => s.id === selectedSessionId)) {
        setSelectedSessionId(data.sessions[0].id);
      }
      
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
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async () => {
    if (sessions.length >= 10) return alert("Maximum 10 sessions allowed.");
    const newId = `session-${Date.now().toString().slice(-4)}`;
    try {
      setLoading(true);
      await api.whatsapp.connect(newId);
      setSelectedSessionId(newId);
      await fetchStatus();
    } catch (error) {
      alert("Failed to create new session.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string = selectedSessionId) => {
    try {
      setLoading(true);
      await api.whatsapp.connect(id);
      await fetchStatus();
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string = selectedSessionId, deletePersistently: boolean = false) => {
    const msg = deletePersistently 
        ? `Are you sure you want to PERMANENTLY REMOVE session ${id}? This will stop all monitoring for this number.`
        : `Are you sure you want to disconnect this session?`;
    
    if (!window.confirm(msg)) return;
    
    try {
      setLoading(true);
      await api.whatsapp.disconnect(id, deletePersistently);
      if (id === selectedSessionId && deletePersistently) {
        setSelectedSessionId(primarySessionId);
      }
      await fetchStatus();
    } catch (error) {
      console.error("Error disconnecting WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      setLoading(true);
      await api.whatsapp.setPrimary(id);
      setPrimarySessionId(id);
      await fetchStatus();
    } catch (error) {
       alert("Failed to set primary session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    try {
      setSendingTest(true);
      const res = await api.whatsapp.sendTest(testPhone, testMessage, selectedSessionId);
      if (res.success) {
        alert("Test message sent successfully!");
        setTestMessage("");
      } else {
        alert("Failed to send: " + (res.error || res.message));
      }
    } catch (error) {
      alert("Error sending test message");
    } finally {
      setSendingTest(false);
    }
  };

  const handleBulkSend = async () => {
    let targetPhones = selectedCustomers;
    if (bulkMode === "paste") {
      targetPhones = pastedNumbers.split(/[\n,]/).map(n => n.trim().replace(/\D/g, "")).filter(n => n.length >= 10);
    }

    if (targetPhones.length === 0 || !bulkMessage) {
      alert("Please provide recipients and a message.");
      return;
    }
    if (!window.confirm(`Send campaign via session ${selectedSessionId} to ${targetPhones.length} recipients?`)) return;

    try {
      setSendingBulk(true);
      const res = await api.whatsapp.bulkSend(targetPhones, bulkMessage, selectedSessionId);
      if (res.success) {
        alert(`Successfully sent to ${res.results.filter((r:any) => r.status === 'success').length} numbers.`);
        setBulkMessage("");
        setSelectedCustomers([]);
        setPastedNumbers("");
      } else {
        alert("Bulk sender failed: " + (res.error || res.message));
      }
    } catch (error) {
      alert("Fatal error in bulk sender");
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
    <div className="space-y-8 p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
             WhatsApp Engine
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium tracking-wide">Professional multi-channel communication gateway for Spice Kraft.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Session Control */}
        <div className="xl:col-span-8 space-y-8">
          {/* Sessions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={cn(
                  "flex flex-col items-start gap-3 p-6 rounded-[2.5rem] transition-all border-2 relative group text-left",
                  selectedSessionId === s.id 
                    ? "bg-white border-black shadow-2xl scale-[1.02] z-10" 
                    : "bg-gray-50/40 border-gray-100/50 text-gray-400 hover:bg-white hover:border-gray-200"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    s.status === "connected" ? "bg-[#25D366] shadow-[0_0_12px_rgba(37,211,102,0.4)]" : 
                    s.status === "connecting" ? "bg-orange-400 animate-pulse" : "bg-gray-300"
                  )} />
                  {s.id !== "primary" && (
                     <Trash2 
                       onClick={(e) => { e.stopPropagation(); handleDisconnect(s.id, true); }}
                       className="w-4 h-4 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" 
                     />
                  )}
                </div>
                
                <div className="space-y-1">
                   <p className="font-extrabold text-sm text-black tracking-tight leading-none">
                       {s.me?.number ? `+${s.me.number}` : `Inactive Account`}
                   </p>
                   <div className="flex items-center gap-1.5">
                     {primarySessionId === s.id && (
                       <span className="text-[9px] font-black text-[#25D366] uppercase tracking-widest px-1.5 py-0.5 bg-green-50 rounded-md">Primary</span>
                     )}
                     <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{s.status === 'disconnected' ? 'OFFLINE' : s.status}</span>
                   </div>
                </div>
              </button>
            ))}

            <button 
              onClick={handleCreateSession}
              disabled={sessions.length >= 10}
              className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem] hover:bg-gray-100/50 hover:border-gray-300 transition-all group disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">Add Account</span>
            </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50/20">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-sm border",
                  activeSession.status === "connected" ? "bg-green-50 border-green-100 text-[#25D366]" : "bg-gray-50 border-gray-100 text-gray-400"
                )}>
                  {activeSession.status === "connected" ? <CheckCircle2 className="w-8 h-8" /> : <Smartphone className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-2xl uppercase tracking-tighter text-gray-900">
                      {activeSession.me?.name || (activeSession.id === 'primary' ? "Primary Session" : "Management Console")}
                    </h3>
                    {primarySessionId === activeSession.id && (
                      <span className="bg-[#25D366]/10 text-[#25D366] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#25D366]/20">Active Primary</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">Status: <span className={cn(
                    activeSession.status === 'connected' ? "text-green-500" : activeSession.status === 'connecting' ? "text-orange-500" : "text-gray-400"
                  )}>{activeSession.status === 'disconnected' ? 'NOT CONNECTED' : activeSession.status.toUpperCase()}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {primarySessionId !== activeSession.id && (
                  <button 
                    onClick={() => handleSetPrimary(activeSession.id)}
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:border-black hover:shadow-md transition-all active:scale-95"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Set as Primary</span>
                  </button>
                )}

                {activeSession.status === "connected" && (
                  <button 
                    onClick={() => handleDisconnect(activeSession.id, false)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    <Power className="w-4 h-4" />
                    <span>DISCONNECT</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-10">
              <AnimatePresence mode="wait">
                {activeSession.status === "disconnected" && (
                  <motion.div 
                    key="disconnected"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center text-center py-16 space-y-10"
                  >
                    <div className="w-32 h-32 bg-gray-50 rounded-[3.5rem] flex items-center justify-center shadow-inner relative group">
                      <div className="absolute inset-0 bg-gray-100/50 rounded-[3.5rem] scale-90 group-hover:scale-110 transition-transform duration-500" />
                      <MessageSquare className="w-12 h-12 text-gray-200 relative z-10" />
                      <div className="absolute top-4 right-4 bg-gray-300 w-4 h-4 rounded-full border-4 border-white shadow-sm" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Gateway Inactive</h4>
                      <p className="text-gray-400 max-w-sm mx-auto text-sm font-medium leading-relaxed">This session is currently dormant. Initialize the connection to start routing messages through this channel.</p>
                    </div>
                    <button 
                      onClick={() => handleConnect()}
                      className="bg-gray-900 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-gray-200 flex items-center gap-4 active:scale-95 group"
                    >
                      <QrCode className="w-6 h-6 text-[#25D366] group-hover:rotate-12 transition-transform" />
                      <span>Execute QR Protocol</span>
                    </button>
                  </motion.div>
                )}

                {activeSession.status === "connecting" && (
                  <motion.div 
                    key="connecting"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 space-y-10"
                  >
                    <div className="text-center space-y-3 mb-6">
                      <h4 className="text-3xl font-black text-orange-500 uppercase tracking-tighter flex items-center gap-3 justify-center">
                         <div className="w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                         Connecting
                      </h4>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Security Handshake</p>
                    </div>

                    {activeSession.qr ? (
                      <div className="relative group">
                        <div className="absolute -inset-10 bg-[#25D366]/5 rounded-[5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl relative z-10 scale-105">
                          {/* QR Code Container */}
                          <div className="relative">
                            <img src={activeSession.qr} alt="WhatsApp QR" className="w-72 h-72 opacity-90" />
                            {/* WhatsApp Logo Overlay - PREMIUM VERSION */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_15px_30px_rgba(0,0,0,0.1)] border-2 border-gray-50 flex items-center justify-center">
                                 <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M24 4C12.954 4 4 12.954 4 24C4 28.1 5.232 31.916 7.348 35.102L4.056 43.148L12.446 40.04C15.752 42.528 19.78 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4ZM24 40.333C20.354 40.333 16.906 39.124 14.076 37.072L9.22 38.852L11.042 34.252C8.75 31.422 7.333 27.874 7.333 24C7.333 14.796 14.796 7.333 24 7.333C33.204 7.333 40.667 14.796 40.667 24C40.667 33.204 33.204 40.333 24 40.333Z" fill="#25D366"/>
                                    <path d="M33.4 28.536C32.88 28.272 30.316 27.02 29.836 26.844C29.356 26.668 29.008 26.58 28.66 27.108C28.312 27.636 27.312 28.816 27.008 29.172C26.704 29.524 26.396 29.568 25.876 29.304C25.356 29.04 23.684 28.484 21.688 26.696C20.136 25.304 19.088 23.584 18.784 23.056C18.48 22.528 18.752 22.24 19.012 21.98C19.248 21.748 19.536 21.368 19.796 21.06C20.06 20.752 20.144 20.532 20.324 20.18C20.5 19.828 20.412 19.52 20.284 19.256C20.152 18.992 19.112 16.4 18.68 15.348C18.256 14.324 17.828 14.464 17.508 14.448C17.204 14.432 16.856 14.432 16.508 14.432C16.16 14.432 15.6 14.564 15.12 15.092C14.64 15.62 13.284 16.896 13.284 19.492C13.284 22.088 15.168 24.596 15.428 24.948C15.688 25.3 19.12 30.64 24.384 32.912C25.636 33.452 26.612 33.776 27.368 34.02C28.636 34.42 29.78 34.364 30.684 34.228C31.692 34.076 33.784 32.956 34.22 31.724C34.656 30.492 34.656 29.436 34.524 29.216C34.396 28.996 34.048 28.868 33.4 28.536Z" fill="#25D366"/>
                                 </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6 py-20">
                        <Loader2 className="w-16 h-16 text-[#FC8019] animate-spin" />
                        <p className="font-black text-gray-400 tracking-widest uppercase text-xs">Authenticating Engine...</p>
                      </div>
                    )}
                    
                    <div className="text-center space-y-6">
                      <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                        Open WhatsApp {">"} Linked Devices and scan to authorize this digital gateway.
                      </p>
                      <button 
                        onClick={() => handleDisconnect(selectedSessionId, false)}
                        className="flex items-center gap-2 px-6 py-2 text-red-500 font-bold hover:bg-red-50 rounded-full transition-all mx-auto text-sm border border-transparent hover:border-red-100"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>CANCEL ATTEMPT</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSession.status === "connected" && (
                  <motion.div 
                    key="connected"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-10 py-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <h4 className="text-2xl font-black text-[#25D366] uppercase tracking-tighter">Connected</h4>
                      <div className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse" />
                    </div>

                    {showSuccess === activeSession.id && (
                      <div className="bg-[#25D366] text-white p-5 rounded-[2rem] flex items-center gap-4 shadow-2xl shadow-green-200">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">Security Handshake Complete</p>
                          <p className="text-xs font-bold opacity-80">Link established via {activeSession.me?.name}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 group hover:border-[#25D366] transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#25D366] shadow-md border border-gray-50 border-b-4 border-b-[#25D366] transition-transform group-hover:-translate-y-1">
                            <Phone className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Authenticated Identity</p>
                            <p className="text-2xl font-black text-gray-900 leading-tight">+{activeSession.me?.number}</p>
                            <p className="text-sm font-bold text-blue-500">Global API Broadcast Live</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 space-y-3">
                        <div className="flex items-center gap-2 text-blue-800">
                          <SettingsIcon className="w-5 h-5 animate-spin-slow" />
                          <span className="text-sm font-black uppercase tracking-tight">Session Capabilities</span>
                        </div>
                        <ul className="space-y-2">
                          {["Automated Invoicing", "Loyalty Broadcasts", "Secure OTP Delivery"].map((cap, i) => (
                            <li key={i} className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                              <CheckCircle2 className="w-3.3 h-3.3" />
                              {cap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 space-y-6 shadow-sm">
                      <h4 className="font-black text-lg flex items-center gap-2">
                        <Send className="w-5 h-5 text-orange-500" />
                        Direct Gateway Test
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Phone</label>
                          <input 
                            type="text" 
                            placeholder="+91..."
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Test Message</label>
                          <textarea 
                            placeholder="Announce your message..."
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 h-14 resize-none"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleSendTest}
                        disabled={sendingTest || !testPhone || !testMessage}
                        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase tracking-tight hover:bg-black transition-all disabled:opacity-30"
                      >
                        {sendingTest ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Dispatch Direct Message"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Directory & Campaigns */}
        <div className="xl:col-span-4 bg-white p-1 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[800px] overflow-hidden">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Contact Directory</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase">{customers.length} Verified Users</p>
                </div>
              </div>
              <button 
                onClick={fetchCustomers}
                className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-gray-50 p-1.5 rounded-2xl">
              <button 
                onClick={() => setBulkMode("select")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                  bulkMode === "select" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                )}
              >
                Select Contacts
              </button>
              <button 
                onClick={() => setBulkMode("paste")}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                  bulkMode === "paste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                )}
              >
                Manual Import
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
            {bulkMode === "select" ? (
              <div className="space-y-3 py-4">
                <div 
                  onClick={toggleAllCustomers}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {selectedCustomers.length === customers.length && customers.length > 0 ? (
                    <CheckSquare className="w-6 h-6 text-[#25D366]" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-300" />
                  )}
                  <span className="font-black text-sm uppercase tracking-tight">Select Complete List</span>
                </div>
                
                {customers.map((c, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleCustomer(c.phone)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedCustomers.includes(c.phone) ? "bg-green-50 border-green-100" : "bg-white border-gray-50 hover:border-gray-100 shadow-sm"
                    )}
                  >
                    {selectedCustomers.includes(c.phone) ? (
                      <CheckSquare className="w-6 h-6 text-[#25D366]" />
                    ) : (
                      <Square className="w-6 h-6 text-gray-200" />
                    )}
                    <div className="flex-1">
                      <p className="font-black text-sm">{c.phone}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{c.name || "Customer"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 space-y-4 h-full flex flex-col">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch Entry</label>
                <textarea 
                  placeholder="9876543210, 8888877777..."
                  value={pastedNumbers}
                  onChange={(e) => setPastedNumbers(e.target.value)}
                  className="flex-1 w-full p-6 bg-gray-50 border-none rounded-[2.5rem] text-sm font-bold focus:ring-2 focus:ring-green-100 resize-none font-mono"
                />
              </div>
            )}
          </div>

          <div className="p-8 bg-gray-50/30 border-t border-gray-50 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Campaign Message</label>
              <textarea 
                placeholder="Announce your offer..."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-green-50 h-32 resize-none shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Recipients</p>
                <p className="text-sm font-black text-gray-900">{bulkMode === "select" ? selectedCustomers.length : "List Import"}</p>
              </div>
              <button 
                onClick={handleBulkSend}
                disabled={sendingBulk || activeSession.status !== "connected" || (!selectedCustomers.length && !pastedNumbers) || !bulkMessage}
                className="flex-1 bg-[#25D366] text-white py-5 rounded-2xl font-black uppercase tracking-tight hover:bg-[#128C7E] transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-3 disabled:opacity-20"
              >
                {sendingBulk ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
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
