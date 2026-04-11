import React, { useState, useEffect } from "react";
import {
  MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle,
  Users, CheckSquare, Square, Smartphone, Plus, Trash2, Power, LayoutGrid,
  Settings as SettingsIcon, AlertCircle, Phone, Paperclip, ImageIcon, FileText, X
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
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string, onConfirm: () => void, isDangerous?: boolean }>({ isOpen: false, message: '', onConfirm: () => {} });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

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
  const [campaignDelay, setCampaignDelay] = useState(1000);
  const [showCampaignSettings, setShowCampaignSettings] = useState(false);

  // Pairing Code States
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [requestingCode, setRequestingCode] = useState(false);
  const [usePairingCode, setUsePairingCode] = useState(false);

  // Media States
  const [testMedia, setTestMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);
  const [bulkMedia, setBulkMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);

  // Agreement State
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [agreedLiability, setAgreedLiability] = useState(false);

  const activeSession = sessions.find(s => s.id === selectedSessionId) || { id: selectedSessionId, status: "disconnected", qr: null, me: null };
  const hasPendingSession = sessions.some(s => s.status !== "connected" && !s.me);

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

  const executeCreateSession = async () => {
    if (sessions.length >= 10) return showAlert("Maximum 10 sessions allowed.", "error");
    const newId = `session-${Date.now().toString().slice(-4)}`;
    try {
      setLoading(true);
      await api.whatsapp.connect(newId);
      setSelectedSessionId(newId);
      await fetchStatus();
    } catch (error) {
      showAlert("Failed to create new session.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    setShowLiabilityModal(true);
  };

  const handleConnect = async (id: string = selectedSessionId) => {
    try {
      setLoading(true);
      await api.whatsapp.connect(id);
      setPairingCode("");
      await fetchStatus();
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = (id: string = selectedSessionId, deletePersistently: boolean = false) => {
    const msg = deletePersistently
      ? `Are you sure you want to PERMANENTLY REMOVE session ${id}? This will stop all monitoring for this number.`
      : `Are you sure you want to disconnect this session?`;

    setConfirmDialog({
      isOpen: true,
      message: msg,
      isDangerous: deletePersistently,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          await api.whatsapp.disconnect(id, deletePersistently);
          if (id === selectedSessionId && deletePersistently) {
            setSelectedSessionId(primarySessionId);
          }
          await fetchStatus();
          showAlert(deletePersistently ? "Session permanently removed." : "Session disconnected.", "success");
        } catch (error) {
          showAlert("Error disconnecting WhatsApp.", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSetPrimary = async (id: string) => {
    try {
      setLoading(true);
      await api.whatsapp.setPrimary(id);
      setPrimarySessionId(id);
      await fetchStatus();
      showAlert("Primary session updated.", "success");
    } catch (error) {
      showAlert("Failed to set primary session.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'test' | 'bulk') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const media = {
        data: base64.split(',')[1],
        mimetype: file.type,
        filename: file.name
      };
      if (target === 'test') setTestMedia(media);
      else setBulkMedia(media);
    };
    reader.readAsDataURL(file);
  };

  const handleRequestPairingCode = async () => {
    try {
      setRequestingCode(true);
      const res = await api.whatsapp.requestPairingCode(selectedSessionId, pairingPhone);
      if (res.success) {
        const code = res.code?.match(/.{1,4}/g)?.join('-') || res.code;
        setPairingCode(code);
      } else {
        showAlert(res.error || "Failed to generate pairing code", "error");
      }
    } catch (e) {
      showAlert("Network error while requesting code", "error");
    } finally {
      setRequestingCode(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    try {
      setSendingTest(true);
      const res = await api.whatsapp.sendTest(testPhone, testMessage, selectedSessionId, testMedia);
      if (res.success) {
        showAlert("Test message sent successfully!", "success");
        setTestMessage("");
        setTestMedia(null);
      } else {
        showAlert("Failed to send: " + (res.error || res.message), "error");
      }
    } catch (error) {
      showAlert("Error sending test message", "error");
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
      showAlert("Please provide recipients and a message.", "info");
      return;
    }

    try {
      setSendingBulk(true);
      const res = await api.whatsapp.bulkSend(targetPhones, bulkMessage, selectedSessionId, bulkMedia, campaignDelay);
      if (res.success) {
        showAlert(`Sent to ${res.results.filter((r: any) => r.status === 'success').length} numbers.`, "success");
        setBulkMessage("");
        setBulkMedia(null);
        setSelectedCustomers([]);
        setPastedNumbers("");
      } else {
        showAlert("Bulk sender failed.", "error");
      }
    } catch (error) {
      showAlert("Fatal error in bulk sender", "error");
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
    <div className={cn(
      "min-h-screen bg-[#fdfdfd] relative pb-24",
      "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    )}>
      {/* Custom Alert Toast */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "absolute top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border min-w-[350px]",
              alert.type === 'success' ? "bg-white border-green-100 text-green-700 shadow-green-100" :
              alert.type === 'error' ? "bg-white border-red-100 text-red-700 shadow-red-100" :
              "bg-white border-blue-100 text-blue-700 shadow-blue-100"
            )}
          >
            <div className={cn(
               "w-10 h-10 rounded-xl flex items-center justify-center",
               alert.type === 'success' ? "bg-green-50" : alert.type === 'error' ? "bg-red-50" : "bg-blue-50"
            )}>
               {alert.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
                alert.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
            </div>
            <p className="font-black text-sm uppercase tracking-tight flex-1">{alert.message}</p>
            <button onClick={() => setAlert(null)} className="p-2 hover:bg-gray-50 rounded-lg"><X className="w-4 h-4 opacity-30" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100"
            >
              <div className="flex flex-col items-center text-center gap-5">
                <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center border-4 shadow-sm", confirmDialog.isDangerous ? "bg-red-50 text-red-500 border-white" : "bg-orange-50 text-orange-500 border-white")}>
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Security Prompt</h3>
                <p className="text-sm font-medium text-gray-500 mb-2 leading-relaxed">{confirmDialog.message}</p>
                <div className="flex flex-col w-full gap-2 mt-4">
                  <button onClick={confirmDialog.onConfirm} className={cn("w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-md active:scale-95", confirmDialog.isDangerous ? "bg-red-500 hover:bg-red-600 shadow-red-200" : "bg-orange-500 hover:bg-orange-600 shadow-orange-200")}>AUTHORIZE</button>
                  <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="w-full py-4 text-gray-500 hover:bg-gray-50 rounded-2xl font-black uppercase tracking-widest transition-colors">CANCEL</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Liability Agreement Modal */}
      <AnimatePresence>
        {showLiabilityModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="flex flex-col gap-5">
                <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center border-4 border-white shadow-sm mx-auto mb-2">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter text-center leading-none">Developer Agreement</h3>
                <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
                  <p className="text-xs font-bold text-gray-600 leading-relaxed text-center">
                    WhatsApp may block or ban accounts for bulk messaging. 
                    <br/><br/>
                    <span className="text-orange-600 font-black uppercase tracking-widest text-[10px]">Important Disclaimer:</span>
                    <br/>
                    The developers and Spice Kraft hold <span className="underline">zero liability</span> for any account suspensions, bans, or data loss. Use this gateway entirely at your own risk.
                  </p>
                </div>

                <label className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors group">
                  <input type="checkbox" checked={agreedLiability} onChange={(e) => setAgreedLiability(e.target.checked)} className="min-w-5 min-h-5 rounded-lg border-gray-300 text-orange-500 focus:ring-orange-500" />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">I have read the agreement and take full responsibility.</span>
                </label>

                <div className="flex flex-col w-full gap-2 mt-2">
                  <button 
                    onClick={() => {
                        setShowLiabilityModal(false);
                        setAgreedLiability(false);
                        executeCreateSession();
                    }} 
                    disabled={!agreedLiability}
                    className="w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-md active:scale-95 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-orange-200"
                  >
                    ACCEPT & CONTINUE
                  </button>
                  <button onClick={() => { setShowLiabilityModal(false); setAgreedLiability(false); }} className="w-full py-4 text-gray-500 hover:bg-gray-50 rounded-2xl font-black uppercase tracking-widest transition-colors">CANCEL</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="px-6 md:px-12 pt-12 pb-8 max-w-[1800px] mx-auto w-full">
        <h1 className="text-5xl font-black text-gray-900 flex items-center gap-4 tracking-tighter">
          WhatsApp Engine
        </h1>
        <p className="text-gray-400 mt-3 text-sm font-bold uppercase tracking-[0.2em] opacity-60">Professional Multi-Channel Gateway • v2.0</p>
      </header>

      {/* Main Dashboard Grid */}
      <div className="px-6 md:px-12 pb-12 w-full max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12 w-full h-full border-t border-gray-100 pt-12">
        {/* Left: Session Control */}
        <div className={cn(
          "transition-all duration-500 space-y-8",
          activeSession.status === "connected" ? "xl:col-span-8" : "xl:col-span-8 xl:col-start-3"
        )}>

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
              disabled={sessions.length >= 10 || hasPendingSession}
              className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem] hover:bg-gray-100/50 hover:border-gray-300 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">
                {hasPendingSession ? "Complete Pending" : "Add Account"}
              </span>
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
                    className="flex flex-col items-center justify-center text-center py-20 min-h-[500px] space-y-10"
                  >
                    <div className="w-40 h-40 bg-gray-50 rounded-[4rem] flex items-center justify-center shadow-inner relative group">
                      <div className="absolute inset-0 bg-gray-100/50 rounded-[4rem] scale-90 group-hover:scale-110 transition-transform duration-500" />
                      <MessageSquare className="w-16 h-16 text-gray-200 relative z-10" />
                      <div className="absolute top-6 right-6 bg-gray-300 w-5 h-5 rounded-full border-4 border-white shadow-sm" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Gateway Inactive</h4>
                      <p className="text-gray-400 max-w-sm mx-auto text-base font-medium leading-relaxed">This session is currently dormant. Initialize the connection to start routing messages through this channel.</p>
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
                    className="flex flex-col items-center justify-center py-10 min-h-[500px] space-y-10"
                  >
                    <div className="text-center space-y-3 mb-6">
                      <h4 className="text-4xl font-black text-orange-500 uppercase tracking-tighter flex items-center gap-3 justify-center">
                        <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping" />
                        Connecting
                      </h4>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Security Handshake</p>
                    </div>

                    {activeSession.qr ? (
                      !usePairingCode ? (
                        <div className="flex flex-col items-center gap-8">
                          <div className="relative group">
                            <div className="absolute -inset-10 bg-[#25D366]/5 rounded-[5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl relative z-10 scale-105">
                              {/* QR Code Container */}
                              <div className="relative">
                                <img src={activeSession.qr} alt="WhatsApp QR" className="w-72 h-72 opacity-95 rounded-2xl" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center">
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path fillRule="evenodd" clipRule="evenodd" d="M12.0004 2C6.47754 2 2.00037 6.47715 2.00037 12C2.00037 13.9103 2.53724 15.6953 3.46821 17.2081L2.05608 22.3663L7.38214 20.9691C8.79093 21.6323 10.3541 22 12.0004 22C17.5232 22 22.0004 17.5228 22.0004 12C22.0004 6.47715 17.5232 2 12.0004 2ZM17.3323 15.6309C17.0706 17.0097 15.6888 17.9734 14.5367 17.7891C13.3846 17.6047 11.2312 16.5947 9.8 15.3414C8.36878 14.0881 7.21538 12.0734 7.03104 10.9213C6.8467 9.76918 7.81035 8.38734 9.18921 8.12563C9.46743 8.07284 9.77123 8.25718 9.8768 8.51347L10.5367 10.1135C10.634 10.35 10.569 10.6222 10.3705 10.7853L9.6766 11.3556C9.6766 11.3556 9.61053 11.6441 10.0211 12.3392C10.4316 13.0343 11.0851 13.6878 11.7802 14.0984C12.4753 14.5089 12.7638 14.4428 12.7638 14.4428L13.3341 13.7489C13.4972 13.5504 13.7694 13.4854 14.0059 13.5827L15.6059 14.2426C15.8622 14.3482 16.0465 14.652 15.9937 14.9302C15.732 16.309 17.5941 14.2521 17.3323 15.6309Z" fill="#25D366" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <button
                              onClick={() => handleConnect(selectedSessionId)}
                              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 shadow-sm"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Regenerate QR</span>
                            </button>
                            <button
                              onClick={() => setUsePairingCode(true)}
                              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                            >
                              <Phone className="w-4 h-4" />
                              <span>Login via Phone</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-6 py-6 w-full max-w-sm mx-auto">
                           {pairingCode ? (
                              <div className="text-center space-y-4">
                                 <h5 className="text-sm font-black text-gray-400 uppercase tracking-widest">Your Pairing Code</h5>
                                 <div className="text-5xl font-black tracking-[0.2em] text-gray-900 bg-gray-50 py-6 px-10 rounded-3xl border border-gray-200 shadow-inner">
                                    {pairingCode}
                                 </div>
                                 <p className="text-xs text-gray-500 font-medium max-w-[250px] mx-auto mt-4">Open WhatsApp &gt; Linked Devices &gt; Link with phone number and enter this code.</p>
                                 <button onClick={() => setPairingCode("")} className="mt-6 text-[10px] uppercase font-black tracking-widest text-orange-500 hover:text-orange-600">Back</button>
                              </div>
                           ) : (
                              <div className="w-full space-y-6">
                                 <div className="space-y-3">
                                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Phone Number</label>
                                   <input 
                                     type="text" 
                                     placeholder="+91..." 
                                     value={pairingPhone} 
                                     onChange={(e) => setPairingPhone(e.target.value)} 
                                     className="w-full py-4 px-6 text-center text-xl font-black text-gray-900 bg-white rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:outline-none transition-colors shadow-sm placeholder-gray-300" 
                                   />
                                   <p className="text-[10px] text-center text-gray-400 font-bold px-2">Include your country code. Do not use spaces or brackets.</p>
                                 </div>
                                 <button 
                                   onClick={handleRequestPairingCode} 
                                   disabled={!pairingPhone || requestingCode} 
                                   className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition-all shadow-xl shadow-orange-200"
                                 >
                                    {requestingCode ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Request Pairing Code"}
                                 </button>
                                 <button onClick={() => setUsePairingCode(false)} className="w-full text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase mt-2 tracking-widest">Use QR Code Instead</button>
                              </div>
                           )}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-6 py-20">
                        <Loader2 className="w-16 h-16 text-[#FC8019] animate-spin" />
                        <p className="font-black text-gray-400 tracking-widest uppercase text-xs">Authenticating Engine...</p>
                      </div>
                    )}

                    <div className="text-center space-y-6">
                      <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto leading-relaxed">
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
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-lg flex items-center gap-2">
                          <Send className="w-5 h-5 text-orange-500" />
                          Direct Gateway Test
                        </h4>
                        <div className="flex items-center gap-2">
                          <label className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-100 shadow-sm">
                            <Plus className="w-5 h-5" />
                            <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'test')} />
                          </label>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attach Media</span>
                        </div>
                      </div>

                      {testMedia && (
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-4">
                          <div className="flex items-center gap-3">
                            {testMedia.mimetype.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-orange-500" /> : <FileText className="w-5 h-5 text-orange-500" />}
                            <div>
                              <p className="text-xs font-black text-orange-900 truncate max-w-[200px]">{testMedia.filename}</p>
                              <p className="text-[9px] font-bold text-orange-400 uppercase">{testMedia.mimetype}</p>
                            </div>
                          </div>
                          <button onClick={() => setTestMedia(null)} className="p-2 hover:bg-orange-100 rounded-lg transition-colors"><X className="w-4 h-4 text-orange-400" /></button>
                        </div>
                      )}

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

        {/* Right: Directory & Campaigns (Only visible if connected) */}
        <AnimatePresence>
          {activeSession.status === "connected" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "xl:col-span-4 bg-white p-1 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-[760px] sticky top-8",
                "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              )}
            >
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
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campaign Message</label>
                    <label className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 uppercase cursor-pointer hover:text-orange-600">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attach File</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'bulk')} />
                    </label>
                  </div>

                  {bulkMedia && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-orange-50 mb-2">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        <p className="text-[10px] font-black text-gray-800 truncate max-w-[150px]">{bulkMedia.filename}</p>
                      </div>
                      <X onClick={() => setBulkMedia(null)} className="w-4 h-4 text-gray-300 hover:text-red-500 cursor-pointer" />
                    </div>
                  )}

                  <textarea
                    placeholder="Announce your offer..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-green-50 h-32 resize-none shadow-sm"
                  />
                </div>

                {/* Campaign Settings Toolbar */}
                <div className="flex flex-col gap-2 mt-4 mb-4">
                  <div className="flex items-center justify-end px-2">
                    <button onClick={() => setShowCampaignSettings(!showCampaignSettings)} className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors", showCampaignSettings ? "text-orange-500" : "text-gray-400 hover:text-gray-900")}>
                       <SettingsIcon className="w-3.5 h-3.5" /> Delay Settings
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showCampaignSettings && (
                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                         <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
                           <div className="flex items-center justify-between mb-3">
                              <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Message Delay Spacing</label>
                              <span className="text-xs font-bold text-orange-500">{campaignDelay / 1000}s</span>
                           </div>
                           <input type="range" min="1000" max="15000" step="500" value={campaignDelay} onChange={(e) => setCampaignDelay(Number(e.target.value))} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                           <p className="text-[9px] font-bold text-orange-400 uppercase mt-3 tracking-wide flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Prevents account suspension by scattering outgoing messages.</p>
                         </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 text-center w-24">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
);
};

export default WhatsAppManagement;
