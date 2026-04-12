import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useBranding } from "../../config/branding";
import {
  MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle,
  Users, CheckSquare, Smartphone, Plus, Trash2, Power, LayoutGrid,
  Settings as SettingsIcon, AlertCircle, Phone, Paperclip, ImageIcon, FileText, X,
  Trash, ChevronRight, Zap, Globe, Lock, ShieldAlert, Activity, ShieldCheck,
  Shield, Cog, Share2, MoreHorizontal, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../api/utils";
import { api } from "../../api/api";
import "./WhatsAppManagement.css";

interface WhatsAppSession {
  id: string;
  status: "disconnected" | "connecting" | "connected";
  qr: string | null;
  me: {
    name: string;
    number: string;
  } | null;
}

const ProfessionalQRCode = ({ data }: { data: string }) => {
  const qrRef = React.useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    if (!qrRef.current || !data) return;
    let isMounted = true;
    setIsReady(false);
    
    import('qr-code-styling').then((Module) => {
      if (!isMounted || !qrRef.current) return;
      const QRCodeStyling = Module.default;

      try {
        const qrCode = new QRCodeStyling({
          width: 280,
          height: 280,
          type: 'svg',
          data: data,
          dotsOptions: { color: "#0F172A", type: "rounded" },
          backgroundOptions: { color: "#FFFFFF" },
          cornersSquareOptions: { type: "extra-rounded", color: "#FF6B00" },
          cornersDotOptions: { type: "dot", color: "#0F172A" }
        });

        qrRef.current.innerHTML = "";
        qrCode.append(qrRef.current);
        setIsReady(true);
      } catch (err) {
        console.error("QR Render Error:", err);
      }
    });

    return () => {
      isMounted = false;
      if (qrRef.current) qrRef.current.innerHTML = "";
    };
  }, [data]);

  return (
    <div className="relative">
       <div ref={qrRef} className={cn("transition-all duration-700 transform", !isReady ? "opacity-0 scale-95" : "opacity-100 scale-100")} />
       {!isReady && <div className="shimmer-box" />}
    </div>
  );
};

const WhatsAppManagement = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'broadcast' | 'settings'>('individual');
  const [linkingTab, setLinkingTab] = useState<'qr' | 'phone'>('qr');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Form States  
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [requestingCode, setRequestingCode] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testMedia, setTestMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const [bulkNumbers, setBulkNumbers] = useState(""); 
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkMedia, setBulkMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  const [minDelay, setMinDelay] = useState(15); 
  const [maxDelay, setMaxDelay] = useState(30); 
  const [isRandomDelay, setIsRandomDelay] = useState(true);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const currentSession = useMemo(() => sessions.find(s => s.id === selectedId), [sessions, selectedId]);
  const isSelectedConnected = useMemo(() => currentSession?.status === 'connected', [currentSession]);
  const hasPendingSession = useMemo(() => sessions.some(s => s.status !== 'connected'), [sessions]);

  const showAlert = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (!selectedId && data.sessions.length > 0) {
          setSelectedId(data.sessions[0].id);
        }
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleCreateNode = async () => {
    if (sessions.length >= 3) return showAlert("Cluster Capacity Reached (Max 3).", "error");
    if (hasPendingSession) return showAlert("Resolve pending node linking first.", "info");
    
    const id = `node-${Math.random().toString(36).substring(2, 6)}`;
    try {
      setLoading(true);
      await api.whatsapp.connect(id);
      setSelectedId(id);
      setLinkingTab('qr');
      await fetchStatus();
    } catch (error) {
      showAlert("Gateway Connection Failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecommission = (id: string, isPending: boolean) => {
    setConfirmDialog({
      isOpen: true,
      title: isPending ? "Cancel Initialisation" : "Decommission Node",
      message: isPending 
        ? "Abort the current cryptographic handshake? Node tokens will be purged." 
        : "Permanently terminate this communication node? Re-linking will be required.",
      onConfirm: async () => {
        setConfirmDialog(p => ({ ...p, isOpen: false }));
        try {
          setLoading(true);
          await api.whatsapp.disconnect(id, true);
          await fetchStatus();
          showAlert("Node decommissioned successfully.", "success");
        } catch (error) {
          showAlert("Protocol error during disconnect.", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRequestAccessPin = async () => {
    if (!pairingPhone || !selectedId) return;
    try {
      setRequestingCode(true);
      const res = await api.whatsapp.requestPairingCode(selectedId, pairingPhone.replace(/\D/g, ''));
      if (res.success) {
        setPairingCode(res.code?.match(/.{1,4}/g)?.join('-') || res.code);
        showAlert("Encryption PIN Received.", "success");
      }
    } catch (error) {
      showAlert("Secure Tunnel Rejected Number.", "error");
    } finally {
      setRequestingCode(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'test' | 'bulk') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const media = { data: base64.split(',')[1], mimetype: file.type, filename: file.name };
      if (target === 'test') setTestMedia(media);
      else setBulkMedia(media);
    };
    reader.readAsDataURL(file);
  };

  const handleDispatch = async () => {
    if (!testPhone || !testMessage || !selectedId) return;
    try {
      setSendingTest(true);
      const res = await api.whatsapp.sendTest(testPhone.replace(/\D/g, ''), testMessage, selectedId, testMedia);
      if (res.success) {
        showAlert("Transmission Dispatched.", "success");
        setTestMessage(""); setTestMedia(null);
      }
    } catch (error) {
      showAlert("Broadcast Error.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleBulkLaunch = async () => {
    const phones = bulkNumbers.split(/[\n,]/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length >= 10);
    if (!phones.length || !bulkMessage || !selectedId) return showAlert("Required payload missing.", "info");
    try {
      setSendingBulk(true);
      const delay = (isRandomDelay ? Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) : minDelay) * 1000;
      const res = await api.whatsapp.bulkSend(phones, bulkMessage, selectedId, bulkMedia, delay);
      if (res.success) {
        showAlert("Bulk Cluster Initialized.", "success");
        setBulkMessage(""); setBulkNumbers(""); setBulkMedia(null);
      }
    } catch (error) {
      showAlert("Cluster Failure.", "error");
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <div className="arventa-hub fade-in-up">
      {/* Sidebar Account Manager */}
      <aside className="arventa-sidebar">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Node Inventory ({sessions.length}/3)</h3>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedId(s.id)}
              className={cn("account-card", selectedId === s.id && "active")}
            >
              <div className="flex items-center gap-4">
                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", 
                   selectedId === s.id ? "bg-white/10 border-white/10 shadow-inner" : "bg-white border-border-light shadow-sm"
                 )}>
                    <Smartphone size={18} className={selectedId === s.id ? "text-white" : "text-navy-slate"} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate leading-none">{s.me?.name || `Node ${s.id.slice(-4).toUpperCase()}`}</h4>
                    <div className="flex items-center gap-2 mt-2">
                       <div className={cn("status-badge", s.status === 'connected' && "connected")}>
                          <div className="dot" />
                          <span>{s.status}</span>
                       </div>
                    </div>
                 </div>
                 <ChevronRight size={14} className={cn("opacity-40 transition-transform", selectedId === s.id && "translate-x-1 opacity-100")} />
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="py-20 text-center opacity-30 px-6">
              <Activity size={40} className="mx-auto text-navy-slate mb-4 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-navy-slate">System Standby</p>
              <p className="text-[9px] font-bold mt-2 text-text-muted">Initialize your first node cluster below.</p>
            </div>
          )}
        </div>

        {/* Dynamic Add Button */}
        {sessions.length < 3 && (
          <button 
            onClick={handleCreateNode} 
            disabled={loading || hasPendingSession}
            className="premium-btn premium-btn-primary w-full"
          >
            <Plus size={20} /> Add New Account
          </button>
        )}
      </aside>

      {/* Main Staging Stage */}
      <main className="arventa-stage">
        <AnimatePresence mode="wait">
        {!selectedId ? (
          <motion.div 
            key="empty" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-12"
          >
             <div className="w-24 h-24 bg-bg-main rounded-[2.5rem] flex items-center justify-center text-navy-slate mb-8 border border-border-light shadow-inner">
                <Shield size={48} />
             </div>
             <h2 className="text-2xl font-black text-navy-dark tracking-tight">Access Control Required</h2>
             <p className="text-sm text-text-muted mt-2 max-w-xs">Select a verified node from your inventory cluster to monitor transmission payloads.</p>
          </motion.div>
        ) : !isSelectedConnected ? (
          /* Professional Linking Interface (Center Stage) */
          <motion.div 
            key="linking" 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="stage-content flex flex-col items-center justify-center"
          >
            <div className="linking-view">
               <div className="mb-12">
                  <h2 className="text-3xl font-black text-navy-dark tracking-tight">Provision Node Protocol</h2>
                  <p className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mt-2">LINKING AUTHENTICATION INTERFACE</p>
               </div>

               <div className="linking-tabs">
                  <button onClick={() => setLinkingTab('qr')} className={cn("linking-tab-btn", linkingTab === 'qr' && "active")}>QR Matrix</button>
                  <button onClick={() => setLinkingTab('phone')} className={cn("linking-tab-btn", linkingTab === 'phone' && "active")}>Phone Pulse</button>
               </div>

               <div className="qr-container bg-white border-2 border-slate-50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-navy-dark group-hover:rotate-12 transition-transform duration-1000"><Lock size={120} /></div>
                  
                  {linkingTab === 'qr' ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                       <ProfessionalQRCode data={currentSession?.qr || ""} />
                       <div className="mt-8">
                          <p className="text-[10px] font-black uppercase text-navy-slate tracking-widest leading-relaxed">Matrix Verification Protocol</p>
                          <p className="text-[9px] font-bold text-text-muted mt-1 uppercase">Scan with Linked Devices in WhatsApp 2.0</p>
                       </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-xs mx-auto animate-in slide-in-from-right duration-500 py-6">
                       {pairingCode ? (
                          <div className="bg-navy-dark rounded-[2.5rem] p-10 pt-12 shadow-2xl relative group overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20" />
                             <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-[0.4em] mb-4">Encryption Code</p>
                             <p className="text-5xl font-black text-white tracking-[0.2em] transform transition-transform group-hover:scale-105 duration-500">{pairingCode}</p>
                          </div>
                       ) : (
                          <div className="space-y-6">
                             <div className="text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted ml-1">Target Endpoint</label>
                                <input 
                                  type="text" 
                                  placeholder="+1 000 000 0000" 
                                  value={pairingPhone} 
                                  onChange={(e) => setPairingPhone(e.target.value)} 
                                  className="premium-input text-center text-xl h-20 mt-1" 
                                />
                             </div>
                             <button 
                              onClick={handleRequestAccessPin} 
                              disabled={!pairingPhone || requestingCode} 
                              className="premium-btn premium-btn-primary w-full h-16 shadow-2xl"
                             >
                                {requestingCode ? <Loader2 className="animate-spin" /> : "Authorize Request"}
                             </button>
                          </div>
                       )}
                       <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-10 px-8 leading-6">EPHEMERAL PIN EXPIRES IN 120 SECONDS FOR MAXIMUM SECURITY.</p>
                    </div>
                  )}
               </div>

               <div className="mt-12 flex justify-center gap-4">
                  <button 
                    onClick={() => handleDecommission(selectedId!, true)}
                    className="text-[10px] font-black text-text-muted hover:text-red-500 uppercase tracking-[0.3em] transition-all flex items-center gap-3"
                  >
                     <XCircle size={16} /> ABORT PROTOCOL
                  </button>
               </div>
            </div>
          </motion.div>
        ) : (
          /* Active Node Interface */
          <motion.div 
            key="active" 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Stage Header */}
            <header className="stage-header">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-navy-dark rounded-2xl flex items-center justify-center text-white shadow-xl shadow-navy-dark/10">
                     <Zap size={28} className="text-primary-accent" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-navy-dark tracking-tight">{currentSession?.me?.name || "Verified Node"}</h2>
                     <div className="flex items-center gap-3 mt-1">
                        <ShieldCheck size={14} className="text-success-green" />
                        <span className="text-xs font-bold text-text-muted font-mono tracking-tighter">+{currentSession?.me?.number} • END-TO-END ENCRYPTION ACTIVE</span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDecommission(selectedId!, false)}
                    className="premium-btn py-2 px-6 text-[10px] bg-red-50 text-red-500 border border-red-100 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                     <Power size={14} /> DECOMMISSION NODE
                  </button>
               </div>
            </header>

            <div className="stage-content space-y-12">
               {/* Context Tabs */}
               <div className="feature-tabs scrollbar-hide">
                  {[
                    { id: 'individual', label: 'Direct Messenger', icon: Send },
                    { id: 'broadcast', label: 'Bulk Campaigner', icon: Globe },
                    { id: 'settings', label: 'Security Lab', icon: Shield }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn("feature-tab flex items-center gap-3", activeTab === tab.id && "active")}
                    >
                       <tab.icon size={16} className={activeTab === tab.id ? "text-primary-accent" : "text-text-muted opacity-40"} />
                       <span className="uppercase tracking-widest">{tab.label}</span>
                    </button>
                  ))}
               </div>

               <AnimatePresence mode="wait">
                  {activeTab === 'individual' && (
                    <motion.div 
                      key="direct" 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="max-w-3xl space-y-10"
                    >
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Destination Identification</label>
                          <input 
                            type="text" 
                            placeholder="91 00000 00000" 
                            value={testPhone} 
                            onChange={(e) => setTestPhone(e.target.value)} 
                            className="premium-input h-16 font-mono text-lg shadow-sm" 
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Transmission Payload</label>
                          <textarea 
                            placeholder="Payload body..." 
                            value={testMessage} 
                            onChange={(e) => setTestMessage(e.target.value)} 
                            className="premium-input h-56 resize-none py-6 text-sm leading-relaxed" 
                          />
                       </div>
                       <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 w-full">
                             <label className="premium-btn premium-btn-secondary w-full h-16 text-xs border-dashed border-2 hover:border-navy-dark transition-all">
                                {testMedia ? testMedia.filename : <><Paperclip size={18} /> ATTACH META-FILE</>}
                                <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'test')} />
                             </label>
                          </div>
                          <button 
                            onClick={handleDispatch} 
                            disabled={sendingTest || !testPhone || !testMessage} 
                            className="premium-btn premium-btn-primary w-full md:w-80 h-16 shadow-2xl"
                          >
                             {sendingTest ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                             INITIALIZE DISPATCH
                          </button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'broadcast' && (
                    <motion.div 
                      key="broadcast" 
                      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="space-y-10"
                    >
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target Identity List</label>
                                <label className="text-[9px] font-black text-primary-accent bg-primary-accent/5 px-3 py-1.5 rounded-lg border border-primary-accent/10 cursor-pointer hover:bg-white hover:shadow-lg transition-all">
                                   IMPORT MATRIX (.CSV)
                                   <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const content = event.target?.result as string;
                                        const numbers = content.match(/\b\d{10,15}\b/g);
                                        if (numbers) {
                                          setBulkNumbers(Array.from(new Set(numbers)).join("\n"));
                                          showAlert(`${new Set(numbers).size} Nodes Localized.`, "success");
                                        }
                                        e.target.value = "";
                                      };
                                      reader.readAsText(file);
                                   }} />
                                </label>
                             </div>
                             <textarea 
                               placeholder="Identities separated by line..." 
                               value={bulkNumbers} 
                               onChange={(e) => setBulkNumbers(e.target.value)} 
                               className="premium-input h-80 font-mono text-sm leading-8" 
                             />
                             <div className="px-4 py-2 bg-navy-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest w-fit shadow-lg shadow-navy-dark/20">Active Set: {bulkNumbers.split(/[\n,]/).filter(n => n.trim()).length}</div>
                          </div>
                          <div className="space-y-10">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Universal Payload Template</label>
                                <textarea 
                                  placeholder="Broadcast payload..." 
                                  value={bulkMessage} 
                                  onChange={(e) => setBulkMessage(e.target.value)} 
                                  className="premium-input h-64 shadow-sm" 
                                />
                             </div>
                             <div className="p-10 bg-bg-main rounded-[2.5rem] border border-border-light space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-45 transition-transform duration-1000"><Globe size={120} /></div>
                                
                                <div className="space-y-4 relative z-10">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Meta-Attachment</label>
                                   <label className="premium-btn bg-white border border-border-light w-full h-16 text-[10px] font-black text-text-muted cursor-pointer overflow-hidden truncate px-8 rounded-2xl shadow-sm hover:shadow-md">
                                      {bulkMedia ? bulkMedia.filename : "CHOOSE ATTACHMENT"}
                                      <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'bulk')} />
                                   </label>
                                </div>
                                <button 
                                  onClick={handleBulkLaunch} 
                                  disabled={sendingBulk || !bulkNumbers || !bulkMessage} 
                                  className="premium-btn premium-btn-primary w-full h-16 shadow-2xl mt-4 relative z-10"
                                >
                                   {sendingBulk ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                                   LAUNCH CLUSTER BROADCAST
                                </button>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-start gap-6">
                          <ShieldAlert className="text-primary-accent shrink-0 mt-1" size={32} />
                          <div className="space-y-2">
                             <h4 className="text-[10px] font-black text-primary-accent uppercase tracking-[0.2em]">Anti-Ban Protocol (Ver 4.0)</h4>
                             <p className="text-[10px] font-bold text-orange-700/80 leading-relaxed uppercase">Cluster transmission utilizes adaptive jitter intervals (20-45s) across the global node matrix to ensure identity trust-scores remain stabilized.</p>
                          </div>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'settings' && (
                    <motion.div 
                      key="settings" 
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="max-w-2xl pt-10"
                    >
                       <div className="p-16 bg-navy-dark rounded-[3.5rem] text-center shadow-[0_45px_100px_rgba(15,23,42,0.4)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-16 opacity-5 text-white scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000 pointer-events-none"><ShieldCheck size={260} /></div>
                          <div className="relative z-10">
                             <div className="w-24 h-24 bg-white/5 text-primary-accent rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/5 shadow-2xl">
                                <Lock size={48} />
                             </div>
                             <h3 className="text-white text-3xl font-black tracking-tight underline decoration-primary-accent decoration-8 underline-offset-8 decoration-dotted">Security Lab Interface</h3>
                             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-8 mb-16">CRYPTOGRAPHIC TRANSMISSION CONTROLS</p>
                             
                             <div className="space-y-12 px-2">
                                <div className="flex items-center justify-between p-10 bg-white/5 rounded-[2.5rem] border border-white/10 cursor-pointer hover:bg-white/10 transition-all shadow-inner" onClick={() => setIsRandomDelay(!isRandomDelay)}>
                                   <div className="text-left">
                                      <p className="text-white text-xl font-black tracking-tight">Node Jitter Transmission</p>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Simulates high-fidelity human cadence</p>
                                   </div>
                                   <div className={cn("w-16 h-8 rounded-full transition-all flex items-center p-1.5 shadow-2xl", isRandomDelay ? "bg-primary-accent shadow-primary-accent/40" : "bg-slate-800")}>
                                      <div className={cn("w-5 h-5 bg-white rounded-full shadow-lg transition-all transform", isRandomDelay ? "translate-x-8" : "translate-x-0")} />
                                   </div>
                                </div>

                                <div className={cn("grid grid-cols-2 gap-10 transition-all duration-700", !isRandomDelay && "opacity-10 grayscale pointer-events-none scale-95 blur-sm")}>
                                   <div className="p-12 bg-white/5 rounded-[3rem] border border-white/5 hover:border-primary-accent/30 transition-colors shadow-2xl">
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Floor Orbit (s)</p>
                                      <input 
                                        type="number" 
                                        value={minDelay} 
                                        onChange={(e) => setMinDelay(Number(e.target.value))} 
                                        className="bg-transparent text-white text-6xl text-center font-black w-full focus:outline-none focus:text-primary-accent transition-colors" 
                                      />
                                   </div>
                                   <div className="p-12 bg-white/5 rounded-[3rem] border border-white/5 hover:border-primary-accent/30 transition-colors shadow-2xl">
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Ceiling Orbit (s)</p>
                                      <input 
                                        type="number" 
                                        value={maxDelay} 
                                        onChange={(e) => setMaxDelay(Number(e.target.value))} 
                                        className="bg-transparent text-white text-6xl text-center font-black w-full focus:outline-none focus:text-primary-accent transition-colors" 
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Persistence Modals & Alerts */}
      <AnimatePresence>
        {alert && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[3000] px-12 py-7 bg-navy-dark/95 text-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-10 min-w-[500px] backdrop-blur-3xl"
          >
             <div className={cn("w-5 h-5 rounded-full shadow-[0_0_30px]", 
                alert.type === 'error' ? "bg-red-500 shadow-red-500/50" : "bg-primary-accent shadow-primary-accent/50"
             )} />
             <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">{alert.type}</p>
                <p className="text-base font-black leading-tight tracking-tight">{alert.message}</p>
             </div>
             <button onClick={() => setAlert(null)} className="text-slate-500 hover:text-white transition-all hover:scale-125"><X size={24} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[2005] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-navy-dark/60 backdrop-blur-md" onClick={() => setConfirmDialog(p => ({...p, isOpen: false}))} />
             <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.3)] p-16 w-full max-w-xl relative z-[2006] text-center border border-slate-100"
             >
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner border border-red-100"><ShieldAlert size={48} /></div>
                <h3 className="text-3xl font-black text-navy-dark tracking-tight">{confirmDialog.title}</h3>
                <p className="text-base font-bold text-text-muted mt-6 mb-12 leading-relaxed px-10">{confirmDialog.message}</p>
                <div className="grid grid-cols-2 gap-6">
                   <button onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))} className="premium-btn py-4 bg-bg-main text-text-muted text-[11px] font-black uppercase tracking-widest border border-border-light shadow-sm">Abort Operation</button>
                   <button onClick={confirmDialog.onConfirm} className="premium-btn premium-btn-primary py-4 text-[11px] font-black uppercase tracking-widest shadow-2xl">Confirm Command</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppManagement;
