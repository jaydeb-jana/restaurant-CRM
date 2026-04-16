import React, { useState, useEffect, useMemo } from "react";
import { useBranding } from "../../config/branding";
import {
  MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle,
  Users, CheckSquare, Square, Smartphone, Plus, Trash2, Power, LayoutGrid,
  Settings as SettingsIcon, AlertCircle, Phone, Paperclip, ImageIcon, FileText, X,
  Trash, ChevronRight, LogOut, ShieldCheck, Hash, Music, Bot, MessageCircle, ShieldAlert, Edit2
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

const ProfessionalQRCode = ({ data }: { data: string }) => {
  const qrRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!qrRef.current || !data) return;

    let isMounted = true;

    import('qr-code-styling').then((Module) => {
      if (!isMounted || !qrRef.current) return;
      const QRCodeStyling = Module.default;

      try {
        const qrCode = new QRCodeStyling({
          width: 270,
          height: 270,
          type: 'svg',
          data: data,
          dotsOptions: {
            color: "#000000",
            type: "square"
          },
          backgroundOptions: {
            color: "#ffffff",
          },
          cornersSquareOptions: {
            type: "square",
            color: "#000000"
          },
          cornersDotOptions: {
            type: "square",
            color: "#000000"
          }
        });

        qrRef.current.innerHTML = "";
        qrCode.append(qrRef.current);
      } catch (err) {
        console.error("Failed to render QR Code:", err);
      }
    });

    return () => {
      isMounted = false;
      if (qrRef.current) qrRef.current.innerHTML = "";
    };
  }, [data]);

  if (!data) return null;

  return (
    <div className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100 inline-block">
      <div ref={qrRef} className="rounded-xl overflow-hidden min-w-[270px] min-h-[270px] flex items-center justify-center">
      </div>
    </div>
  );
};

const WhatsAppManagement = () => {
  const { branding } = useBranding();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("primary");
  const [primarySessionId, setPrimarySessionId] = useState<string>("primary");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'broadcast' | 'customers' | 'ai-agent' | 'settings'>('individual');

  // Individual/Direct States
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMedia, setTestMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);

  // Bulk/Broadcast States
  const [bulkNumbers, setBulkNumbers] = useState(""); // Comma separated
  const [bulkMessage, setBulkMessage] = useState<string[]>([""]); // Multi-message array
  const [bulkMedia, setBulkMedia] = useState<{ data: string, mimetype: string, filename: string } | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [parsingCSV, setParsingCSV] = useState(false);

  // Customers Tab States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [isComposingCustomerMessage, setIsComposingCustomerMessage] = useState(false);
  const [customerMessages, setCustomerMessages] = useState<string[]>([""]); // Multi-message array
  const [customerMedia, setCustomerMedia] = useState<any>(null);
  const [sendingToCustomers, setSendingToCustomers] = useState(false);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });

  // Pairing Code States
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [requestingCode, setRequestingCode] = useState(false);
  const [usePairingCode, setUsePairingCode] = useState(false);

  const activeSession = sessions.find(s => s.id === selectedSessionId) || { id: selectedSessionId, status: "disconnected", qr: null, me: null };
  const hasPendingSession = sessions.some(s => s.status !== "connected" && !s.me);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Settings State
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [isRandomDelay, setIsRandomDelay] = useState(true);
  const [otpTemplates, setOtpTemplates] = useState<string[]>(["Your secure login OTP is: *{(0)}*"]);
  const [churnTemplates, setChurnTemplates] = useState<string[]>(["Hello {(1)}, we haven't seen you in a while! Here is a special 10% discount for your next visit!"]);
  const [churnDays, setChurnDays] = useState(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [typingDelay, setTypingDelay] = useState(2);

  // AI Agent States
  const [aiPairs, setAiPairs] = useState<{ id: string, question: string, answer: string, mediaUrl?: string, mediaType?: string }[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [aiPairMedia, setAiPairMedia] = useState<any>(null);
  const [editingPair, setEditingPair] = useState<any>(null);
  const [isPairsLoading, setIsPairsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [isSavingKB, setIsSavingKB] = useState(false);
  const [aiMode, setAiMode] = useState<'pairs' | 'large'>('pairs');
  const [isSavingPair, setIsSavingPair] = useState(false);

  // Advanced AI Intelligence States
  const [aiAgentName, setAiAgentName] = useState("AI Assistant");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [aiModel, setAiModel] = useState("llama3-8b-8192");
  const [useContextHistory, setUseContextHistory] = useState(false);
  const [contextLimit, setContextLimit] = useState(10);
  const [activeBotSessions, setActiveBotSessions] = useState<string[]>([]);

  const fetchAiData = async () => {
    try {
      setIsPairsLoading(true);
      const [pairs, kbData] = await Promise.all([
        api.get('ai_agent'),
        api.get('ai_knowledge')
      ]);
      setAiPairs(pairs || []);
      // ai_knowledge might return an array if using generic db, take the first item or latest
      if (Array.isArray(kbData) && kbData.length > 0) {
        setKnowledgeBase(kbData[0].content || "");
      }
    } catch (error) {
      console.error("AI Data fetch error:", error);
    } finally {
      setIsPairsLoading(false);
    }
  };

  const handleSaveKB = async () => {
    try {
      setIsSavingKB(true);
      // We'll use a fixed ID to keep only one knowledge base entry
      await api.post('ai_knowledge', { id: 'main_kb', content: knowledgeBase, updatedAt: new Date() });
      showAlert("Big intelligence data synchronized!", "success");
    } catch (error) {
      showAlert("Knowledge sync failure.", "error");
    } finally {
      setIsSavingKB(false);
    }
  };

  const handleAddPair = async () => {
    if (!newQuestion || !newAnswer) return showAlert("Fill both fields.", "error");
    try {
      setIsSavingPair(true);
      const payload = { 
        question: newQuestion, 
        answer: newAnswer,
        mediaUrl: aiPairMedia?.url,
        mediaType: aiPairMedia?.type 
      };

      if (editingPair) {
        const res = await api.put('ai_agent', editingPair.id, payload);
        setAiPairs(prev => prev.map(p => p.id === editingPair.id ? res : p));
        setEditingPair(null);
      } else {
        const res = await api.post('ai_agent', payload);
        setAiPairs(prev => [...prev, res]);
      }
      
      setNewQuestion("");
      setNewAnswer("");
      setAiPairMedia(null);
      showAlert(editingPair ? "Training pair updated!" : "Training pair added!", "success");
    } catch (error) {
      showAlert("Save failed.", "error");
    } finally {
      setIsSavingPair(false);
    }
  };

  const handleDeletePair = async (id: string) => {
    try {
      await api.delete('ai_agent', id);
      setAiPairs(prev => prev.filter(p => p.id !== id));
      showAlert("Pair removed.", "info");
    } catch (error) {
      showAlert("Delete failed.", "error");
    }
  };

  const fetchStatus = async () => {
    try {
      const [data, customersData, settings] = await Promise.all([
        api.whatsapp.getStatus(),
        api.whatsapp.getCustomers(),
        api.getSettings()
      ]);
      setSessions(data.sessions || []);
      if (data.primaryId) setPrimarySessionId(data.primaryId);
      setCustomers(customersData || []);

      // Load specific settings if they exist
      if (settings) {
        if (settings.minDelay) setMinDelay(settings.minDelay);
        if (settings.maxDelay) setMaxDelay(settings.maxDelay);
        if (settings.isRandomDelay !== undefined) setIsRandomDelay(settings.isRandomDelay);
        if (settings.otpTemplates) setOtpTemplates(settings.otpTemplates);
        if (settings.churnTemplates) setChurnTemplates(settings.churnTemplates);
        if (settings.churnDays) setChurnDays(settings.churnDays);
        
        // Load AI advanced settings
        if (settings.aiAgentName) setAiAgentName(settings.aiAgentName);
        if (settings.groqApiKey) setGroqApiKey(settings.groqApiKey);
        if (settings.aiModel) setAiModel(settings.aiModel);
        if (settings.useContextHistory !== undefined) setUseContextHistory(settings.useContextHistory);
        if (settings.contextLimit) setContextLimit(settings.contextLimit);
        if (settings.activeBotSessions) setActiveBotSessions(settings.activeBotSessions);
        if (settings.typingDelay) setTypingDelay(settings.typingDelay);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching WhatsApp status/settings:", error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await api.put('settings', 'app-settings', {
        minDelay,
        maxDelay,
        isRandomDelay,
        otpTemplates,
        churnTemplates,
        churnDays,
        aiAgentName,
        groqApiKey,
        aiModel,
        useContextHistory,
        contextLimit,
        activeBotSessions,
        typingDelay
      });
      showAlert("Protection & Communication protocols updated!", "success");
    } catch (error) {
      showAlert("Failed to synchronize settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAiData();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCustomerSend = async () => {
    const selectedList = customers.filter(c => selectedCustomers.has(c.phone));
    if (selectedList.length === 0 || customerMessages.every(m => !m)) return;

    try {
      setSendingToCustomers(true);
      const activeTemplates = customerMessages.filter(m => m.trim().length > 0);
      if (activeTemplates.length === 0) return;

      for (const customer of selectedList) {
        // Pick a random template for each customer
        const msgTemplate = activeTemplates[Math.floor(Math.random() * activeTemplates.length)];
        
        const personalizedMessage = msgTemplate
          .replace(/\{\(1\)\}/g, customer.name || "Customer")
          .replace(/\{\(2\)\}/g, customer.phone);

        await api.whatsapp.sendTest(customer.phone, personalizedMessage, selectedSessionId, customerMedia);
        
        // Use the configured delay or a default safety delay
        const delay = isRandomDelay 
          ? Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000
          : minDelay * 1000;
          
        await new Promise(res => setTimeout(res, delay || 500));
      }

      showAlert(`Campaign sent to ${selectedList.length} customers!`, "success");
      setIsComposingCustomerMessage(false);
      setCustomerMessages([""]);
      setCustomerMedia(null);
      setSelectedCustomers(new Set());
    } catch (error: any) {
      showAlert(error.message || "Burst engine failure.", "error");
    } finally {
      setSendingToCustomers(false);
    }
  };

  const toggleAllCustomers = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.phone)));
    }
  };

  const toggleCustomer = (phone: string) => {
    const next = new Set(selectedCustomers);
    if (next.has(phone)) next.delete(phone);
    else next.add(phone);
    setSelectedCustomers(next);
  };

  const handleCreateSession = async () => {
    if (sessions.length >= 3) return showAlert("Maximum 3 sessions allowed.", "error");
    const newId = `session-${Date.now().toString().slice(-4)}`;
    try {
      setLoading(true);
      await api.whatsapp.register(newId);
      setSelectedSessionId(newId);
      setActiveTab('individual');
      await fetchStatus();
      showAlert("New session slot created.", "info");
    } catch (error) {
      showAlert("Failed to create new session.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string = selectedSessionId) => {
    try {
      setLoading(true);
      await api.whatsapp.connect(id);
      setPairingCode("");
      await fetchStatus();
    } catch (error) {
      showAlert("Connection failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string = selectedSessionId, deletePersistently: boolean = false) => {
    const isPending = sessions.find(s => s.id === id)?.status !== 'connected';

    const title = isPending ? "Cancel Connection?" : (deletePersistently ? "Delete Account?" : "Disconnect Account?");
    const message = isPending
      ? "This will remove the current connection attempt and reset the slot."
      : (deletePersistently
        ? "Are you sure you want to permanently delete this account? This action cannot be undone."
        : "Are you sure you want to disconnect this session?");

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.whatsapp.disconnect(id, deletePersistently);
          if (id === selectedSessionId && deletePersistently) {
            const remaining = sessions.filter(s => s.id !== id);
            setSelectedSessionId(remaining.length > 0 ? remaining[0].id : primarySessionId);
          }
          await fetchStatus();
          showAlert(isPending ? "Operation complete." : "Session updated.", "success");
        } catch (error) {
          showAlert("Error processing request.", "error");
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSetPrimary = async (id: string) => {
    try {
      setLoading(true);
      await api.whatsapp.setPrimary(id);
      setPrimarySessionId(id);
      showAlert("Primary session updated.", "success");
    } catch (error) {
      showAlert("Failed to set primary session.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'test' | 'bulk' | 'customer') => {
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
      else if (target === 'bulk') setBulkMedia(media);
      else if (target === 'customer') setCustomerMedia(media);
    };
    reader.readAsDataURL(file);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingCSV(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      // Powerful extraction: Clean all non-numeric noise then match sequences of 10-15 digits
      // This handles CSV, TXT, Excel-pasted text, or even paragraphs with numbers
      const cleanedText = text.replace(/[^\d\n\r,;]/g, " ");
      const matches = cleanedText.match(/\d{10,15}/g);
      
      if (matches) {
        // Standardize to 91 prefix if 10 digits
        const standardized = matches.map(n => n.length === 10 ? "91" + n : n);
        const uniqueNumbers = Array.from(new Set(standardized));
        
        // Remove current session's primary number to avoid self-spam
        const myNumber = activeSession.me?.number;
        const filtered = uniqueNumbers.filter(n => n !== myNumber).slice(0, 100); // 100 limit for power
        
        setBulkNumbers(filtered.join(", "));
        showAlert(`${filtered.length} recipients identified and imported.`, "success");
      } else {
        showAlert("No valid phone numbers found in the file.", "error");
      }
      setParsingCSV(false);
    };
    reader.onerror = () => {
      showAlert("Critical failure reading file.", "error");
      setParsingCSV(false);
    };
    reader.readAsText(file);
  };

  const downloadSample = () => {
    const csvContent = "phone\n919876543210\n917872490719\n911234567890";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'broadcast_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRequestPairingCode = async () => {
    if (!pairingPhone) return;
    try {
      setRequestingCode(true);
      const res = await api.whatsapp.requestPairingCode(selectedSessionId, pairingPhone);
      if (res.success) {
        const formatted = res.code?.match(/.{1,4}/g)?.join('-') || res.code;
        setPairingCode(formatted);
        showAlert("Pairing code generated!", "success");
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Failed to request code";
      showAlert(msg, "error");
    } finally {
      setRequestingCode(false);
    }
  };

  const handleBulkSend = async () => {
    const phones = bulkNumbers.split(',').map(n => n.trim()).filter(n => n.length > 5);
    if (phones.length === 0 || bulkMessage.every(m => !m)) {
      showAlert("Valid numbers and message required.", "info");
      return;
    }

    try {
      setSendingBulk(true);
      const getDelay = () => {
        if (!isRandomDelay) return minDelay * 1000;
        return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
      };

      const activeMessages = bulkMessage.filter(m => m.trim().length > 0);
      if (activeMessages.length === 0) return;

      const res = await api.whatsapp.bulkSend(phones, activeMessages, selectedSessionId, bulkMedia, getDelay());
      if (!res.success) {
        throw new Error(res.message || res.error || "Broadcast logic failure.");
      }

      showAlert(`Campaign dispatched successfully.`, "success");
      setBulkMessage([""]);
      setBulkMedia(null);
      setBulkNumbers("");
    } catch (error: any) {
      showAlert(error.message || "Fatal error in broadcast engine", "error");
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    try {
      setSendingTest(true);
      const res = await api.whatsapp.sendTest(testPhone, testMessage, selectedSessionId, testMedia);
      if (res.success) {
        showAlert("Message sent!", "success");
        setTestMessage("");
        setTestMedia(null);
      } else {
        showAlert(res.message || res.error || "Failed to send.", "error");
      }
    } catch (error: any) {
      showAlert("Network error or server timeout.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-slate-900 border-t border-gray-100">
      {/* Sidebar: Session Navigation */}
      <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg"><Smartphone className="w-5 h-5 text-slate-400" /></div>
            <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">Accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ai-agent')}
              className={cn(
                "p-2 rounded-lg transition-all",
                activeTab === 'ai-agent' ? "bg-amber-50 text-amber-500 shadow-inner" : "text-slate-400 hover:bg-slate-50"
              )}
              title="AI Intelligence"
            >
              <Bot className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "p-2 rounded-lg transition-all",
                activeTab === 'settings' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
              )}
              title="Global Protocol"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            <button
              onClick={handleCreateSession}
              disabled={sessions.length >= 3 || hasPendingSession}
              className={cn(
                "p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
              )}
              title={hasPendingSession ? "Complete pending setup first" : "Add New Account"}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => { setSelectedSessionId(s.id); setActiveTab('individual'); }}
              className={cn(
                "w-full p-4 rounded-xl flex items-center gap-4 transition-all border cursor-pointer",
                selectedSessionId === s.id
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200"
                  : "bg-white border-gray-100 text-slate-600 hover:border-slate-300"
              )}
            >
              <div className={cn(
                "w-3 h-3 rounded-full shrink-0",
                s.status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                  s.status === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-gray-300"
              )} />

              <div className="flex-1 text-left truncate">
                <p className={cn("text-sm font-bold truncate", selectedSessionId === s.id ? "text-white" : "text-slate-900")}>
                  {s.me?.number ? `+${s.me.number}` : "Pending Session"}
                </p>
                <div className="flex items-center gap-2">
                  {s.id === primarySessionId && s.status === 'connected' && <span className="text-[9px] uppercase font-black text-emerald-500">Primary</span>}
                  {activeBotSessions.includes(s.id) && <span className="text-[9px] uppercase font-black text-amber-500 flex items-center gap-1"><Bot className="w-2.5 h-2.5" /> AI Active</span>}
                  <span className="text-[10px] opacity-60 font-medium uppercase tracking-wider">{s.status === 'disconnected' && !s.me ? 'IDLE' : s.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">

                <button
                  onClick={(e) => { e.stopPropagation(); handleDisconnect(s.id, true); }}
                  className="p-1 px-2 hover:bg-red-500 hover:text-white rounded-md transition-all text-[10px] font-bold"
                  title={s.status === 'connected' ? "Remove Account" : "Cancel Connection"}
                >
                  {s.status === 'connected' ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && !loading && (
            <div className="text-center py-10 px-4">
              <Smartphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-medium">No accounts added yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-64px)] overflow-hidden">
        {/* Header Actions */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
              activeSession.status === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
            )}>
              {activeSession.status === 'connected' ? <CheckCircle2 className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{activeSession.me?.name || (activeSession.status === 'connected' ? "Active Account" : "WhatsApp Setup")}</h1>
              <div className="flex items-center gap-2">
                {activeSession.id === primarySessionId && activeSession.status === 'connected' && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-md uppercase tracking-tight">Primary Connection</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSession.status === 'connected' && activeSession.id !== primarySessionId && (
              <button
                onClick={() => handleSetPrimary(activeSession.id)}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Set as Primary Account
              </button>
            )}

            {(activeSession.status === 'connected' || activeSession.status === 'connecting') && (
              <button
                onClick={() => handleDisconnect(activeSession.id, false)}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
              >
                {activeSession.status === 'connected' ? <LogOut className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {activeSession.status === 'connected' ? 'Disconnect' : 'Cancel Attempt'}
              </button>
            )}
          </div>
        </div>


        <div className="flex-1 p-0 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'ai-agent' ? (
              <motion.div
                key="global-ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-7xl mx-auto p-6 md:p-12"
              >
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">AI Knowledge Base</h3>
                      <p className="text-sm text-slate-500 font-medium">Train your bot with custom Question & Answer pairs</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setAiMode('pairs')}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-90",
                          aiMode === 'pairs' ? "bg-amber-50 text-amber-500 border-amber-200 shadow-inner" : "bg-slate-50 text-slate-400 border-gray-100 hover:bg-amber-50/50"
                        )}
                        title="Training Pairs Mode"
                      >
                        <Bot className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => setAiMode('large')}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-90",
                          aiMode === 'large' ? "bg-indigo-50 text-indigo-500 border-indigo-200 shadow-inner" : "bg-slate-50 text-slate-400 border-gray-100 hover:bg-indigo-50/50"
                        )}
                        title="Large Data Mode"
                      >
                        <FileText className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {aiMode === 'large' ? (
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-gray-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
                       <div className="space-y-4">
                          <textarea
                            placeholder="Paste your large data here... (Menus, Rules, History, etc.)"
                            value={knowledgeBase}
                            onChange={(e) => setKnowledgeBase(e.target.value)}
                            className="w-full h-64 px-6 py-5 rounded-3xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 transition-all font-medium text-sm resize-none shadow-sm"
                          />
                          <button
                            onClick={handleSaveKB}
                            disabled={isSavingKB}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                          >
                            {isSavingKB ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save Data</>}
                          </button>
                       </div>
                    </div>
                  ) : (
                    <>
                      <div id="ai-form-top" className="bg-slate-50 p-8 rounded-[2rem] border border-gray-100 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">The Question</label>
                            <input
                              type="text"
                              placeholder="e.g. What are your opening hours?"
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-sm shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">The Automated Response</label>
                            <textarea
                              placeholder="e.g. We are open from 10 AM to 11 PM every day!"
                              value={newAnswer}
                              onChange={(e) => setNewAnswer(e.target.value)}
                              className="w-full h-32 px-6 py-5 rounded-2xl bg-white border border-gray-200 focus:ring-4 focus:ring-amber-500/5 transition-all font-medium text-sm resize-none shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="cursor-pointer group flex-1">
                            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white border border-dashed border-gray-300 group-hover:border-amber-400 transition-all shadow-sm">
                              <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                                {aiPairMedia ? aiPairMedia.name : "Attach Automated File (Optional)"}
                              </span>
                            </div>
                            <input type="file" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAiPairMedia({ name: file.name, url: file.name, type: file.type.startsWith('image/') ? 'image' : 'document' }); // Placeholder URL for demo
                            }} />
                          </label>
                          {aiPairMedia && (
                            <button onClick={() => setAiPairMedia(null)} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex gap-4">
                          {editingPair && (
                            <button
                              onClick={() => {
                                setEditingPair(null);
                                setNewQuestion("");
                                setNewAnswer("");
                                setAiPairMedia(null);
                              }}
                              className="flex-1 bg-white border border-gray-200 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95"
                            >
                               Cancel Edit
                            </button>
                          )}
                          <button
                            onClick={handleAddPair}
                            disabled={isSavingPair}
                            className={cn(
                              "flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50",
                              editingPair ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                          >
                            {isSavingPair ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                              editingPair ? <><CheckCircle2 className="w-4 h-4" /> Update Intelligence</> : 
                              <><Plus className="w-4 h-4 text-amber-400" /> Save Training Pair</>
                            }
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4 animate-in fade-in duration-700">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Intelligence ({aiPairs.length})</h4>
                          {isPairsLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-300" />}
                        </div>
                        <div className="space-y-3">
                          {aiPairs.length > 0 ? aiPairs.map((pair) => (
                            <div key={pair.id} className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all flex items-start gap-4">
                              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                                <MessageCircle className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 mb-1 truncate">Q: {pair.question}</p>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">A: {pair.answer}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => {
                                    setEditingPair(pair);
                                    setNewQuestion(pair.question);
                                    setNewAnswer(pair.answer);
                                    // Smooth scroll to top of AI Agent block
                                    document.getElementById('ai-form-top')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Edit Pair"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePair(pair.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Pair"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )) : (
                            !isPairsLoading && (
                              <div className="py-12 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-3xl border border-dashed border-gray-200">
                                <Bot className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No training data found</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div
                key="global-settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-7xl mx-auto p-6 md:p-12"
              >
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Global Orchestration</h3>
                      <p className="text-sm text-slate-500 font-medium">Fine-tune communication, security, and automation</p>
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Save Protocols</>}
                    </button>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-12">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Anti-Ban Protection
                      </h4>
                      <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors" onClick={() => setIsRandomDelay(!isRandomDelay)}>
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm border", isRandomDelay ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-slate-50 border-gray-100 text-slate-400")}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Random Message Delay</h4>
                            <p className="text-xs text-slate-400 font-medium">Injects human-like timing between messages</p>
                          </div>
                        </div>
                        <button className={cn("w-12 h-6 rounded-full p-1 transition-all duration-300 relative", isRandomDelay ? "bg-emerald-500" : "bg-gray-200")}>
                          <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300", isRandomDelay ? "translate-x-6" : "translate-x-0")} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Min Delay (s)</label>
                          <input
                            type="number"
                            value={minDelay}
                            onChange={(e) => setMinDelay(Number(e.target.value))}
                            className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Max Delay (s)</label>
                          <input
                            type="number"
                            value={maxDelay}
                            onChange={(e) => setMaxDelay(Number(e.target.value))}
                            className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Intelligence Unit */}
                    <div className="space-y-8 pt-8 border-t border-gray-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Bot className="w-4 h-4 text-amber-500" />
                        AI Intelligence Unit
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Identity (Name)</label>
                          <input
                            type="text"
                            value={aiAgentName}
                            onChange={(e) => setAiAgentName(e.target.value)}
                            placeholder="e.g. Care X-Ray Assistant"
                            className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-amber-500/5 font-bold text-sm shadow-sm"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Groq Intelligence Key</label>
                          <input
                            type="password"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Language Model Path</label>
                          <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm shadow-sm"
                          >
                            <option value="llama3-8b-8192">Llama 3 8B (Fast)</option>
                            <option value="llama3-70b-8192">Llama 3 70B (Smart)</option>
                            <option value="mixtral-8x7b-32768">Mixtral 8x7B (Deep Knowledge)</option>
                            <option value="openai/gpt-oss-120b">GPT OSS 120B (Custom Path)</option>
                          </select>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between mb-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Depth ({contextLimit} messages)</label>
                             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUseContextHistory(!useContextHistory)}>
                                <span className={cn("text-[10px] font-bold uppercase transition-colors", useContextHistory ? "text-indigo-600" : "text-slate-400")}>{useContextHistory ? "History Active" : "History Idle"}</span>
                                <button className={cn("w-8 h-4 rounded-full p-0.5 transition-all relative pointer-events-none", useContextHistory ? "bg-indigo-500" : "bg-gray-200")}>
                                  <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", useContextHistory ? "translate-x-4" : "translate-x-0")} />
                                </button>
                             </div>
                           </div>
                           <input
                            type="range"
                            min="1"
                            max="50"
                            value={contextLimit}
                            onChange={(e) => setContextLimit(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                           />
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between mb-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Typing Emulation ({typingDelay}s)</label>
                           </div>
                           <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={typingDelay}
                            onChange={(e) => setTypingDelay(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-900/40"
                           />
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Wait duration before replying when user stops typing.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Bot Channels (Multi-Select)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sessions.map(s => (
                            <button
                              key={s.id}
                              onClick={() => {
                                const next = activeBotSessions.includes(s.id)
                                  ? activeBotSessions.filter(id => id !== s.id)
                                  : [...activeBotSessions, s.id];
                                setActiveBotSessions(next);
                              }}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                                activeBotSessions.includes(s.id) 
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                  : "bg-white border-gray-100 text-slate-500 hover:border-gray-200"
                              )}
                            >
                              <div className={cn("w-2 h-2 rounded-full", s.status === 'connected' ? "bg-emerald-500" : "bg-gray-300")} />
                              <span className="text-xs font-bold truncate">+{s.me?.number || s.id}</span>
                              {activeBotSessions.includes(s.id) && <CheckCircle2 className="w-3 h-3 ml-auto text-indigo-500" />}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Bot will only respond to incoming messages on these enabled sessions.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Hash className="w-4 h-4 text-indigo-500" />
                          OTP Core Templates
                        </h4>
                        <button 
                          onClick={() => setOtpTemplates([...otpTemplates, "Your OTP is {(0)}"])}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800"
                        >
                          + Add Variety
                        </button>
                      </div>
                      <div className="space-y-3">
                        {otpTemplates.map((tpl, i) => (
                          <div key={i} className="flex gap-2">
                            <input 
                              value={tpl}
                              onChange={(e) => {
                                const next = [...otpTemplates];
                                next[i] = e.target.value;
                                setOtpTemplates(next);
                              }}
                              className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                            <button 
                              onClick={() => setOtpTemplates(otpTemplates.filter((_, idx) => idx !== i))}
                              className="p-3 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1 italic">Use {(0)} as placeholder for OTP code</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Users className="w-4 h-4 text-rose-500" />
                          Churn Prevention (Reminders)
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-slate-400">Idle Days:</span>
                             <input 
                                type="number" 
                                value={churnDays} 
                                onChange={(e) => setChurnDays(Number(e.target.value))}
                                className="w-16 px-2 py-1 rounded bg-white border border-gray-200 text-xs font-bold text-center"
                             />
                          </div>
                          <button 
                            onClick={() => setChurnTemplates([...churnTemplates, "Hi {(1)}, we miss you!"])}
                            className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-800"
                          >
                            + Add Variant
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {churnTemplates.map((tpl, i) => (
                          <div key={i} className="flex gap-2">
                            <input 
                              value={tpl}
                              onChange={(e) => {
                                const next = [...churnTemplates];
                                next[i] = e.target.value;
                                setChurnTemplates(next);
                              }}
                              className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-rose-500/10 transition-all"
                            />
                            <button 
                              onClick={() => setChurnTemplates(churnTemplates.filter((_, idx) => idx !== i))}
                              className="p-3 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1 italic">Use {(1)} for customer name, {(2)} for phone number</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeSession.status !== 'connected' ? (
              <motion.div
                key={`setup-${selectedSessionId}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full"
              >
                <div className="bg-white border border-gray-200 rounded-[3rem] p-10 md:p-20 text-center shadow-sm">
                  {activeSession.status === 'disconnected' ? (
                    <div className="py-12">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-10 h-10 text-slate-300" />
                      </div>
                      <h2 className="text-3xl font-bold mb-3 tracking-tight">Connect WhatsApp</h2>
                      <p className="text-slate-500 mb-8 max-w-sm mx-auto">This session is currently offline. Link your device to start using the automated messaging system.</p>
                      <button
                        onClick={() => handleConnect()}
                        disabled={loading}
                        className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initialize Secure Connection"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                      <div className="text-left space-y-6">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <RefreshCw className="w-3 h-3 animate-spin-slow" /> Awaiting Link
                          </div>
                          <h2 className="text-4xl font-bold tracking-tighter text-slate-900 leading-none">Authentication Required</h2>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                          Open WhatsApp on your phone, navigate to <span className="text-slate-900 font-bold">Linked Devices</span>, and scan the QR code to grant security permissions.
                        </p>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-slate-400">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-slate-900">1</div>
                            <p className="text-xs font-bold uppercase tracking-tight">Scan QR Protocol</p>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-slate-900">2</div>
                            <p className="text-xs font-bold uppercase tracking-tight">Identity Handshake</p>
                          </div>
                        </div>


                      </div>

                      <div className="bg-gray-50 rounded-3xl p-10 flex flex-col items-center justify-center border border-gray-100 relative group min-h-[400px]">
                        {usePairingCode ? (
                          <div className="w-full space-y-6">
                            {pairingCode ? (
                              <div className="text-center bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-in zoom-in-95 duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Verification Code</p>
                                <div className="flex items-center justify-center gap-3 mb-6">
                                  {pairingCode.split('-').map((part, i) => (
                                    <React.Fragment key={i}>
                                      <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-[0.2em]">{part}</div>
                                      {i === 0 && <div className="w-2 h-1 bg-slate-200 rounded-full" />}
                                    </React.Fragment>
                                  ))}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase max-w-[200px] mx-auto">Enter this code on your WhatsApp {">"} Linked Devices {">"} Link with Phone.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-2xl text-white mb-4">
                                  <Phone className="w-4 h-4" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Phone Pairing Mode</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Phone Number (e.g. 91700...)"
                                  value={pairingPhone}
                                  onChange={(e) => setPairingPhone(e.target.value)}
                                  className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-slate-900 focus:outline-none transition-colors text-center font-bold text-lg shadow-inner bg-white"
                                />
                                <button
                                  onClick={handleRequestPairingCode}
                                  disabled={!pairingPhone || requestingCode}
                                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                  {requestingCode ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Request Secure Code"}
                                </button>

                                <button onClick={() => setUsePairingCode(false)} className="w-full text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest py-2">Use QR Code Instead</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          activeSession.qr ? (
                            <div className="flex flex-col items-center">
                              <ProfessionalQRCode data={activeSession.qr} />

                              <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px]">
                                <button
                                  onClick={() => setUsePairingCode(true)}
                                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm group"
                                >
                                  <Phone className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                  Connect via Phone Number
                                </button>
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Token Refreshing Live</span>
                                  <div className="text-center opacity-30 mt-3 border-t border-gray-100 pt-3">
                                    <h2 className="text-[9px] font-black tracking-tight uppercase leading-none">Accounts</h2>
                                    <p className="text-[7px] font-bold uppercase leading-none mt-1">WhatsApp Gateway</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-20">
                              <Loader2 className="w-10 h-10 animate-spin text-slate-200 mb-4" />
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Generating Token...</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Case: Active Dashboard Content */
              <motion.div
                key={`dashboard-${selectedSessionId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-7xl mx-auto w-full pb-20"
              >
                {/* Unified Dashboard Container */}
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">

                  {/* Left Sidebar Tabs (Aligned & Fixed) */}
                  <div className="w-full md:w-64 bg-slate-50/50 border-r border-gray-100 p-6 flex flex-col gap-2 shrink-0">
                    <div className="mb-8 px-2">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Control Panel</h2>
                      <p className="text-xs font-bold text-slate-900 mt-1">Manage Session</p>
                    </div>

                    {[
                      { id: 'individual', label: 'Direct', icon: Send, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { id: 'broadcast', label: 'Broadcast', icon: LayoutGrid, color: 'text-rose-500', bg: 'bg-rose-50' },
                      { id: 'customers', label: 'Customers', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all group",
                          activeTab === tab.id
                            ? "bg-slate-900 text-white shadow-xl scale-[1.02]"
                            : "text-slate-500 hover:bg-white hover:text-slate-900"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                          activeTab === tab.id ? "bg-white/10" : tab.bg
                        )}>
                          <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : tab.color)} />
                        </div>
                        {tab.label}
                        {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                      </button>
                    ))}

                    <div className="mt-auto p-4 bg-white/50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Session ID</p>
                      <p className="text-[10px] font-black text-slate-900 truncate mt-1">{selectedSessionId}</p>
                    </div>
                  </div>

                  {/* Right Content Area */}
                  <div className="flex-1 p-8 lg:p-12 overflow-y-auto">

                    {activeTab === 'individual' && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Send className="w-4 h-4" /></div>
                            Direct Dispatch
                          </h3>

                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                  <label className="w-10 h-10 bg-gray-50 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Image">
                                    <ImageIcon className="w-4 h-4" />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'test')} />
                                  </label>
                                  <label className="w-10 h-10 bg-gray-50 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Audio">
                                    <Music className="w-4 h-4" />
                                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'test')} />
                                  </label>
                                  <label className="w-10 h-10 bg-gray-50 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Document">
                                    <FileText className="w-4 h-4" />
                                    <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'test')} />
                                  </label>
                                </div>
                                {testMedia && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-left-2">
                                    <ImageIcon className="w-3 h-3" />
                                    <span className="text-[10px] font-bold truncate max-w-[80px]">{testMedia.filename}</span>
                                    <button onClick={() => setTestMedia(null)}><X className="w-3 h-3" /></button>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 flex-col">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-right">Recipient Phone</label>
                                <input
                                  type="text"
                                  placeholder="+91..."
                                  value={testPhone}
                                  onChange={(e) => setTestPhone(e.target.value)}
                                  className="w-full px-5 py-4 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-slate-900/10 font-bold text-sm shadow-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct Message</label>
                              <textarea
                                placeholder="Type message content here..."
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                className="w-full h-40 px-6 py-5 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-slate-900/10 font-medium text-sm resize-none shadow-sm"
                              />
                            </div>

                            <button
                              onClick={handleSendTest}
                              disabled={sendingTest || !testPhone || !testMessage}
                              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                            >
                              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Message</>}
                            </button>
                          </div>
                        </div>

                        <div className="bg-emerald-500 text-white p-8 rounded-3xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                            <ShieldCheck className="w-24 h-24" />
                          </div>
                          <h3 className="text-2xl font-black mb-2 tracking-tighter">Secure Gateway</h3>
                          <p className="text-sm text-emerald-50 font-medium opacity-90 max-w-sm">This channel is currently encrypted and active for all API integrations including Invoices and Order updates.</p>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">End-to-End Encryption Active</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'customers' && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {!isComposingCustomerMessage ? (
                          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                              <div>
                                <h3 className="text-lg font-bold">Contact Directory</h3>
                                <p className="text-xs text-slate-400 font-medium">{customers.length} total customers found</p>
                              </div>
                              <button
                                onClick={toggleAllCustomers}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                              >
                                {selectedCustomers.size === customers.length ? "Deselect All" : "Select All"}
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                              {customers.length > 0 ? customers.map(c => (
                                <div
                                  key={c.phone}
                                  onClick={() => toggleCustomer(c.phone)}
                                  className={cn(
                                    "p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border",
                                    selectedCustomers.has(c.phone) ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-transparent hover:border-gray-100 text-slate-600"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs",
                                      selectedCustomers.has(c.phone) ? "bg-white/10" : "bg-slate-50 text-slate-400"
                                    )}>
                                      {c.name?.[0]?.toUpperCase() || <Users className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <p className={cn("text-sm font-bold", selectedCustomers.has(c.phone) ? "text-white" : "text-slate-900")}>{c.name || "Unknown Customer"}</p>
                                      <p className="text-[10px] font-medium opacity-60 tracking-wider">+{c.phone}</p>
                                    </div>
                                  </div>
                                  {selectedCustomers.has(c.phone) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-20" />}
                                </div>
                              )) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                  <Users className="w-12 h-12 mb-4 opacity-20" />
                                  <p className="text-sm font-bold uppercase tracking-widest">No customers found</p>
                                </div>
                              )}
                            </div>
                            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedCustomers.size} customers selected</p>
                              <button
                                disabled={selectedCustomers.size === 0}
                                onClick={() => setIsComposingCustomerMessage(true)}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-3"
                              >
                                Continue to Message
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-4 mb-8">
                              <button onClick={() => setIsComposingCustomerMessage(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                              </button>
                              <div>
                                <h3 className="text-lg font-bold">Compose Message</h3>
                                <p className="text-xs text-emerald-500 font-bold tracking-widest uppercase">Targeting {selectedCustomers.size} Contacts</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              {/* Personalization Guide */}
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <AlertCircle className="w-4 h-4 text-indigo-500" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Personalization Guide</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                  Use <code className="bg-indigo-100 text-indigo-700 px-1 rounded font-black">{"{(1)}"}</code> to inject the <span className="font-black text-slate-900">Customer Name</span> and <code className="bg-emerald-100 text-emerald-700 px-1 rounded font-black">{"{(2)}"}</code> for their <span className="font-black text-slate-900">Mobile Number</span> automatically.
                                </p>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Sequence ({customerMessages.length}/10)</label>
                                  {customerMessages.length < 10 && (
                                    <button
                                      onClick={() => setCustomerMessages(prev => [...prev, ""])}
                                      className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600"
                                    >
                                      <Plus className="w-3 h-3" /> Add Message
                                    </button>
                                  )}
                                </div>

                                {customerMessages.map((msg, idx) => (
                                  <div key={idx} className="relative group">
                                    <textarea
                                      placeholder={`Message ${idx + 1}...`}
                                      value={msg}
                                      onChange={(e) => {
                                        const next = [...customerMessages];
                                        next[idx] = e.target.value;
                                        setCustomerMessages(next);
                                      }}
                                      className="w-full h-32 px-6 py-5 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-slate-900/10 font-medium text-sm resize-none shadow-sm"
                                    />
                                    {customerMessages.length > 1 && (
                                      <button
                                        onClick={() => setCustomerMessages(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-4 right-4 p-2 bg-red-50 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex gap-1.5 shrink-0">
                                      <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Image">
                                        <ImageIcon className="w-4 h-4" />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'customer')} />
                                      </label>
                                      <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Audio">
                                        <Music className="w-4 h-4" />
                                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'customer')} />
                                      </label>
                                      <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Document">
                                        <FileText className="w-4 h-4" />
                                        <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'customer')} />
                                      </label>
                                    </div>
                                  <div className="flex-1">
                                    {customerMedia ? (
                                      <div className="flex items-center justify-between pr-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center"><CheckCircle2 className="w-3 h-3" /></div>
                                          <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{customerMedia.filename}</span>
                                        </div>
                                        <button onClick={() => setCustomerMedia(null)} className="p-1 hover:bg-gray-200 rounded text-slate-400"><X className="w-3 h-3" /></button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col pl-2">
                                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">Media content ready</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  disabled={sendingToCustomers || customerMessages.every(m => !m.trim())}
                                  onClick={handleCustomerSend}
                                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                                >
                                  {sendingToCustomers ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Burst</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'broadcast' && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400"><Hash className="w-4 h-4" /></div>
                              Mass Broadcast
                            </h3>
                            <button
                              onClick={downloadSample}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                            >
                              <FileText className="w-3 h-3" />
                              Download Template
                            </button>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipients (Manual or Upload)</label>
                                <label className="cursor-pointer group">
                                  <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                    {parsingCSV ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                    Upload CSV File
                                  </div>
                                  <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVImport} />
                                </label>
                              </div>

                              <div className="relative">
                                <textarea
                                  placeholder="919876543210, 917872490719, ..."
                                  value={bulkNumbers}
                                  onChange={(e) => setBulkNumbers(e.target.value)}
                                  className={cn(
                                    "w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-sm h-32 resize-none shadow-sm",
                                    parsingCSV && "opacity-50 pointer-events-none"
                                  )}
                                />
                                {parsingCSV && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-2xl">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-100">
                                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Parsing Data...</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-gray-50">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Steps ({bulkMessage.length}/10)</label>
                                  {bulkMessage.length < 10 && (
                                    <button
                                      onClick={() => setBulkMessage(prev => [...prev, ""])}
                                      className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600"
                                    >
                                      <Plus className="w-3 h-3" /> Add Message Step
                                    </button>
                                  )}
                                </div>

                                {bulkMessage.map((msg, idx) => (
                                  <div key={idx} className="relative group">
                                    <textarea
                                      placeholder={`Step ${idx + 1} Content...`}
                                      value={msg}
                                      onChange={(e) => {
                                        const next = [...bulkMessage];
                                        next[idx] = e.target.value;
                                        setBulkMessage(next);
                                      }}
                                      className="w-full px-5 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium text-sm h-32 resize-none shadow-sm"
                                    />
                                    {bulkMessage.length > 1 && (
                                      <button
                                        onClick={() => setBulkMessage(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-4 right-4 p-2 bg-red-50 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex gap-1.5 shrink-0">
                                  <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Image">
                                    <ImageIcon className="w-4 h-4" />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'bulk')} />
                                  </label>
                                  <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Audio">
                                    <Music className="w-4 h-4" />
                                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'bulk')} />
                                  </label>
                                  <label className="w-10 h-10 bg-white hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200 shadow-sm group/icon" title="Document">
                                    <FileText className="w-4 h-4" />
                                    <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'bulk')} />
                                  </label>
                                </div>
                                <div className="flex-1">
                                  {bulkMedia ? (
                                    <div className="flex items-center justify-between pr-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center"><ImageIcon className="w-3 h-3" /></div>
                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{bulkMedia.filename}</span>
                                      </div>
                                      <button onClick={() => setBulkMedia(null)} className="p-1 hover:bg-gray-200 rounded text-slate-400"><X className="w-3 h-3" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col pl-2">
                                      <p className="text-[10px] font-bold text-slate-400 tracking-tight">Media content ready</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={handleBulkSend}
                                disabled={sendingBulk || !bulkNumbers || bulkMessage.every(m => !m.trim())}
                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-30 lg:min-w-[200px]"
                              >
                                {sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LayoutGrid className="w-4 h-4" /> Broadcast</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modern Alert Toast */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-[100] px-6 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
            <p className="text-sm font-bold uppercase tracking-tight">{alert.message}</p>
            <button onClick={() => setAlert(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <AlertCircle className="w-24 h-24 text-slate-900" />
              </div>

              <div className="relative">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{confirmModal.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm mb-8">{confirmModal.message}</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all text-sm uppercase tracking-widest border border-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    disabled={loading}
                    className="flex-1 px-6 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-sm uppercase tracking-widest disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppManagement;