import React, { useState, useEffect, useMemo, useRef } from "react";
import { useBranding } from "../../config/branding";
import {
  MessageSquare, QrCode, CheckCircle2, RefreshCw, Send, Loader2, XCircle,
  Users, CheckSquare, Square, Smartphone, Plus, Trash2, Power, LayoutGrid,
  Settings as SettingsIcon, AlertCircle, Phone, Paperclip, ImageIcon, FileText, X,
  Trash, ChevronRight, LogOut, ShieldCheck, Hash, Music, Bot, MessageCircle, ShieldAlert, Edit2, Zap, Settings, History, BarChart3, Filter, User, Clock, CloudLightning, Archive, Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../api/utils";
import { api, API_BASE } from "../../api/api";

interface WhatsAppSession {
  id: string;
  status: "disconnected" | "connecting" | "connected";
  qr: string | null;
  error?: string | null;
  me: {
    name: string;
    number: string;
    profilePic?: string;
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
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => localStorage.getItem('last_wa_session') || "");
  
  // Persist selection
  useEffect(() => {
    if (selectedSessionId) {
      localStorage.setItem('last_wa_session', selectedSessionId);
    } else {
      localStorage.removeItem('last_wa_session');
    }
  }, [selectedSessionId]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'broadcast' | 'customers' | 'ai-agent' | 'settings' | 'history'>('individual');
  const [messagesHistory, setMessagesHistory] = useState<any[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

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

  // Refs to avoid stale closures in setInterval
  const selectedSessionIdRef = useRef(selectedSessionId);
  const hasPendingSessionRef = useRef(false);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);
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

  const activeSession = (sessions || []).find(s => s.id === selectedSessionId) || { id: selectedSessionId || "primary", status: "disconnected", qr: null, me: null };
  const [lastDisconnectedNumber, setLastDisconnectedNumber] = useState<string | null>(null);
  const hasPendingSession = useMemo(() => (sessions || []).some(s => s.status === 'connecting' && !s.me?.number), [sessions]);
  
  useEffect(() => {
    hasPendingSessionRef.current = hasPendingSession;
  }, [hasPendingSession]);

  const filteredSessions = useMemo(() => {
    // Priority: Connected first, then those with identity, then others. Limit to 10.
    return sessions
      .sort((a, b) => {
        if (a.status === 'connected' && b.status !== 'connected') return -1;
        if (a.status !== 'connected' && b.status === 'connected') return 1;
        return 0;
      })
      .slice(0, 10);
  }, [sessions]);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Settings State
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [isRandomDelay, setIsRandomDelay] = useState(true);
  const [aiAgentName, setAiAgentName] = useState("Care Assistant");
  const [includeAgentName, setIncludeAgentName] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [aiModel, setAiModel] = useState("llama-3.3-70b-versatile");
  const [useContextHistory, setUseContextHistory] = useState(true);
  const [useAllContext, setUseAllContext] = useState(false);
  const [contextLimit, setContextLimit] = useState(10);
  const [typingSimulation, setTypingSimulation] = useState(true);
  const [autoTypingSimulation, setAutoTypingSimulation] = useState(true);
  const [minTyping, setMinTyping] = useState(1);
  const [maxTyping, setMaxTyping] = useState(3);
  const [multiMessageReply, setMultiMessageReply] = useState(true);

  // Communication Templates
  const [otpTemplates, setOtpTemplates] = useState<string[]>(["Your secure login OTP is: *{(0)}*"]);
  const [churnTemplates, setChurnTemplates] = useState<string[]>(["Hi {(1)}, we haven't seen you in a while! Use code 'COMEBACK' for 10% off."]);
  const [churnDays, setChurnDays] = useState(30);
  const [retentionActive, setRetentionActive] = useState(true);
  const [otpRouting, setOtpRouting] = useState<string[]>(["all"]);
  const [churnRouting, setChurnRouting] = useState<string[]>(["all"]);
  const [routingModal, setRoutingModal] = useState<{ isOpen: boolean, type: 'otp' | 'churn' | 'ai', selected: string[] } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [typingDelay, setTypingDelay] = useState(2);
  const [summarizationFrequency, setSummarizationFrequency] = useState(10);

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
  const [activeBotSessions, setActiveBotSessions] = useState<string[]>([]);
  const [aiSchedule, setAiSchedule] = useState<any>({
    alwaysOn: true,
    weekly: {
      monday: { from: "00:00", to: "23:59", active: true },
      tuesday: { from: "00:00", to: "23:59", active: true },
      wednesday: { from: "00:00", to: "23:59", active: true },
      thursday: { from: "00:00", to: "23:59", active: true },
      friday: { from: "00:00", to: "23:59", active: true },
      saturday: { from: "00:00", to: "23:59", active: true },
      sunday: { from: "00:00", to: "23:59", active: true },
    }
  });

  const [blockedNumbers, setBlockedNumbers] = useState("");
  const [useLinkedNumbersBlock, setUseLinkedNumbersBlock] = useState(true);

  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const [msgs, bcast] = await Promise.all([
        api.get('db/whatsapp_messages'),
        api.get('db/broadcast_history')
      ]);
      // Sort by newest first
      setMessagesHistory(Array.isArray(msgs) ? msgs.slice().reverse() : []);
      setBroadcastHistory(Array.isArray(bcast) ? bcast.slice().reverse() : []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (activeTab === 'history') {
      fetchHistory();
      interval = setInterval(fetchHistory, 8000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeTab]);
  const [isAccountDetailsVisible, setIsAccountDetailsVisible] = useState(false);
  const [globalAiActive, setGlobalAiActive] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const handleManualSummarize = async () => {
    if (!activeSession?.me?.number) return;
    setIsSummarizing(true);
    try {
      const res = await api.post('whatsapp/summarize-all', { sessionId: activeSession.id });
      if (res.success) {
        showAlert("All contexts compressed into Native Memory!", "success");
      } else {
        throw new Error(res.error || "Summarization failed");
      }
    } catch (error: any) {
      showAlert(error.message || "Summarization failed", "error");
    } finally {
      setIsSummarizing(false);
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

  const fetchSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings) {
        if (settings.minDelay) setMinDelay(settings.minDelay);
        if (settings.maxDelay) setMaxDelay(settings.maxDelay);
        if (settings.isRandomDelay !== undefined) setIsRandomDelay(settings.isRandomDelay);
        if (settings.otpTemplates) setOtpTemplates(settings.otpTemplates);
        if (settings.churnTemplates) setChurnTemplates(settings.churnTemplates);
        if (settings.churnDays) setChurnDays(settings.churnDays);
        if (settings.retentionActive !== undefined) setRetentionActive(settings.retentionActive);
        if (settings.otpRouting) setOtpRouting(settings.otpRouting);
        if (settings.churnRouting) setChurnRouting(settings.churnRouting);

        // Load AI advanced settings
        if (settings.aiAgentName) setAiAgentName(settings.aiAgentName);
        if (settings.includeAgentName !== undefined) setIncludeAgentName(settings.includeAgentName);
        if (settings.groqApiKey) setGroqApiKey(settings.groqApiKey);
        if (settings.aiModel) setAiModel(settings.aiModel);
        if (settings.useContextHistory !== undefined) setUseContextHistory(settings.useContextHistory);
        if (settings.useAllContext !== undefined) setUseAllContext(settings.useAllContext);
        if (settings.contextLimit) setContextLimit(settings.contextLimit);
        if (settings.activeBotSessions) setActiveBotSessions(settings.activeBotSessions);
        if (settings.typingDelay) setTypingDelay(settings.typingDelay);
        if (settings.typingSimulation !== undefined) setTypingSimulation(settings.typingSimulation);
        if (settings.minTyping) setMinTyping(settings.minTyping);
        if (settings.maxTyping) setMaxTyping(settings.maxTyping);
        if (settings.multiMessageReply !== undefined) setMultiMessageReply(settings.multiMessageReply);
        if (settings.globalAiActive !== undefined) setGlobalAiActive(settings.globalAiActive);
        if (settings.autoTypingSimulation !== undefined) setAutoTypingSimulation(settings.autoTypingSimulation);
        if (settings.aiSchedule) setAiSchedule(settings.aiSchedule);
        if (settings.summarizationFrequency) setSummarizationFrequency(settings.summarizationFrequency);
        if (settings.blockedNumbers) setBlockedNumbers(settings.blockedNumbers);
        if (settings.useLinkedNumbersBlock !== undefined) setUseLinkedNumbersBlock(settings.useLinkedNumbersBlock);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      const updatedSessions = data.sessions || [];
      setSessions(updatedSessions);

      // Only auto-select if we truly have no valid selection even in memory
      if (!selectedSessionIdRef.current && updatedSessions.length > 0) {
        setSelectedSessionId(updatedSessions[0].id);
      } else if (selectedSessionIdRef.current && updatedSessions.length > 0) {
        // If the current ID was purged but we have other sessions, fall back safely
        const stillExists = updatedSessions.find(s => s.id === selectedSessionIdRef.current);
        if (!stillExists && !hasPendingSessionRef.current) {
           setSelectedSessionId(updatedSessions[0].id);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await api.updateSettings({
        minDelay,
        maxDelay,
        isRandomDelay,
        otpTemplates,
        churnTemplates,
        churnDays,
        retentionActive,
        otpRouting,
        churnRouting,
        aiAgentName,
        includeAgentName,
        groqApiKey,
        aiModel,
        useContextHistory,
        useAllContext,
        contextLimit,
        activeBotSessions,
        typingDelay,
        typingSimulation,
        minTyping,
        maxTyping,
        multiMessageReply,
        globalAiActive,
        autoTypingSimulation,
        aiSchedule,
        summarizationFrequency,
        blockedNumbers,
        useLinkedNumbersBlock
      });
      showAlert("Protection & Communication protocols updated!", "success");
    } catch (error) {
      showAlert("Failed to synchronize settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
          // Auto-cleanup all pending/unlinked sessions on mount/reload as requested
          await api.whatsapp.cleanup();
      } catch (e) {
          console.error("Cleanup failed", e);
      }
      await Promise.all([
        fetchStatus(),
        fetchAiData(),
        fetchSettings(),
        api.whatsapp.getCustomers().then(data => setCustomers(data || []))
      ]);
      setLoading(false);
    };
    init();

    const interval = setInterval(fetchStatus, 8000);

    // CRITICAL: Cleanup on window close/reload
    const handleBeforeUnload = () => {
      // Use full URL for sendBeacon to avoid 404
      const url = `${API_BASE}/whatsapp/cleanup`;
      navigator.sendBeacon(url);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
    if (sessions.length >= 10) return showAlert("Maximum 10 sessions allowed.", "error");
    const newId = `session-${Date.now().toString().slice(-4)}`;
    try {
      setLoading(true);
      await api.whatsapp.register(newId);
      const data = await api.whatsapp.getStatus();
      const updated = data.sessions || [];
      setSessions(updated);
      setSelectedSessionId(newId);
      setActiveTab('individual');
      showAlert("New session slot created.", "info");
    } catch (error) {
      showAlert("Failed to create new session.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string = selectedSessionId) => {
    if (!id) return showAlert("Select a session slot first.", "error");
    try {
      setLoading(true);
      setPairingCode("");
      setLastDisconnectedNumber(null);
      
      // OPTIMISTIC UI: Instantly show 'connecting' state locally
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'connecting', qr: null } : s));
      
      // Call API (now returns fast since server backgrounds the work)
      await api.whatsapp.connect(id);
      showAlert(`Initiating connection engine...`, "info");
      
      // Aggressive polling to catch the QR code
      let attempts = 0;
      const poll = setInterval(async () => {
         await fetchStatus();
         attempts++;
         if (attempts > 10) clearInterval(poll); // Poll for 10s
      }, 1000);

    } catch (error: any) {
      showAlert(error.response?.data?.error || "Connection initialization failed.", "error");
      await fetchStatus(); // Revert to server truth on failure
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
          const currentNum = activeSession.me?.number;
          if (currentNum) setLastDisconnectedNumber(currentNum);

          // Optimistic UI: Instantly mark as disconnected so UI leaves dashboard mode
          setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'disconnected', me: null } : s));
          
          await api.whatsapp.disconnect(id, deletePersistently);

          if (id === selectedSessionId && deletePersistently) {
            const remaining = sessions.filter(s => s.id !== id);
            setSelectedSessionId(remaining.length > 0 ? remaining[0].id : "");
          }
          
          // Wait slightly for server state to transition before polling
          setTimeout(fetchStatus, 800);
          
          if (deletePersistently) {
            showAlert("Account purged and session deleted forever.", "success");
          } else {
            showAlert("Your number has been disconnected.", "success");
          }
        } catch (error) {
          showAlert("Error processing request.", "error");
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSummarizeSingle = async (customerPhone: string) => {
    try {
      setLoading(true);
      const res = await api.whatsapp.summarizeSingle(selectedSessionId, customerPhone);
      if (res.success) {
        showAlert(res.message, "success");
      } else {
        showAlert(res.error || "Summarization failed", "error");
      }
    } catch (err) {
      showAlert("Summarization engine error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeAll = async () => {
    try {
      setLoading(true);
      const res = await api.whatsapp.summarizeAll(selectedSessionId);
      if (res.success) {
        showAlert(res.message || `Compression engine for ${res.count} contacts has been initiated.`, "success");
      } else {
        showAlert(res.error || "Summarization failed", "error");
      }
    } catch (err) {
      showAlert("Bulk summarization engine error", "error");
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
      
      let finalMsg = testMessage;
      if (includeAgentName && aiAgentName) {
        finalMsg = `*${aiAgentName}*\n\n${testMessage}`;
      }

      const res = await api.whatsapp.sendTest(testPhone, finalMsg, selectedSessionId, testMedia);
      if (res.success) {
        showAlert("Message dispatched successfully.", "success");
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
            <span className="text-lg font-black text-slate-900 uppercase tracking-tight">WhatsApp</span>
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
              onClick={() => setActiveTab('history')}
              className={cn(
                "p-2 rounded-lg transition-all",
                activeTab === 'history' ? "bg-indigo-50 text-indigo-500 shadow-inner" : "text-slate-400 hover:bg-slate-50"
              )}
              title="Messaging Analytics"
            >
              <History className="w-5 h-5" />
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
              disabled={filteredSessions.length >= 10}
              className={cn(
                "w-10 h-10 bg-slate-950 text-white rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-90"
              )}
              title={hasPendingSession ? "Complete pending setup first" : "Add New Account"}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {filteredSessions.map(s => (
              <div
                key={s.id}
                className={cn(
                  "group w-full p-4 rounded-2xl flex items-center gap-2 transition-all cursor-pointer relative overflow-hidden",
                  selectedSessionId === s.id ? "bg-slate-900 text-white shadow-xl scale-[1.02]" : "bg-white border border-gray-100 hover:border-slate-300 text-slate-600"
                )}
                onClick={() => {
                  if (s.status !== 'connected' && s.me?.number) {
                    showAlert("Your WhatsApp has been disconnected. Please re-connect to resume services.", "info");
                  }
                  setSelectedSessionId(s.id);
                  setIsAccountDetailsVisible(false);
                  setActiveTab('individual');
                }}
              >
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className="relative">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2",
                      selectedSessionId === s.id ? "border-slate-800" : "border-white"
                    )}>
                      {s.me?.profilePic ? (
                        <img src={s.me.profilePic} alt="DP" className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center", s.status === 'connected' ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-400")}>
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      s.status === 'connected' ? "bg-emerald-500" : (s.status === 'connecting' || s.id === selectedSessionId && !s.me?.number) ? "bg-amber-500 animate-pulse" : "bg-red-500"
                    )} />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className={cn("text-sm font-black truncate mb-0.5", selectedSessionId === s.id ? "text-white" : "text-slate-900")}>
                      {s.me?.name || (s.id === selectedSessionId && !s.me?.number ? "Ready to Pair" : (s.status === 'connecting' ? "Connecting..." : "Setup Required"))}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest truncate opacity-50",
                        selectedSessionId === s.id ? "text-white" : "text-slate-400"
                      )}>
                        {s.me?.number ? `+${s.me.number}` : 'No phone linked'}
                      </span>
                      {s.status !== 'connected' && s.me?.number && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg font-black uppercase shadow-sm">Offline</span>
                      )}
                      {s.error && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg font-black uppercase shadow-sm" title={s.error}>Duplicate</span>
                      )}
                    </div>
                  </div>
                </div>

                {s.status !== 'connected' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnect(s.id, true);
                    }}
                    className={cn(
                      "p-2 rounded-lg transition-all shrink-0",
                      selectedSessionId === s.id ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                    )}
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}


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
        {activeSession.status === 'connected' && activeTab !== 'settings' && (
          <div className="bg-white border-b border-gray-200 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-xl transition-all group-hover:scale-105",
                  activeSession.status === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  {activeSession.me?.profilePic ? (
                    <img src={activeSession.me.profilePic} alt="User DP" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm",
                    activeSession.status === 'connected' ? "bg-emerald-500" : "bg-slate-300"
                  )} />
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activeSession.me?.name || "WhatsApp Setup"}</h1>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {activeSession.me?.number && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+{activeSession.me.number}</span>}

                </div>

                {/* Account Dropdown */}
                <AnimatePresence>
                  {isAccountDetailsVisible && (
                    <div className="fixed inset-0 z-40 flex items-start justify-center pt-24">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAccountDetailsVisible(false)}
                        className="fixed inset-0 bg-transparent"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-72 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-6 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Configuration</p>
                        </div>

                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-tight ml-1 text-left block">Account Display Name</label>
                            <input
                              type="text"
                              value={activeSession.me?.name || ""}
                              onChange={(e) => {
                                const newSessions = sessions.map(s => s.id === activeSession.id ? { ...s, me: { ...s.me, name: e.target.value } } : s);
                                setSessions(newSessions as any);
                              }}
                              className="w-full bg-slate-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all"
                              placeholder="Account Nickname"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-50">
                              <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Session ID</p>
                              <p className="text-[10px] font-black text-slate-600 truncate">{activeSession.id}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-50">
                              <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Linked At</p>
                              <p className="text-[10px] font-black text-slate-600">Active</p>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                await api.put(`db/whatsapp_sessions/${activeSession.id}`, { me: activeSession.me });
                                showAlert("Profile updated successfully!", "success");
                                setIsAccountDetailsVisible(false);
                              } catch (e) {
                                showAlert("Failed to update profile", "error");
                              }
                            }}
                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Update Profile
                          </button>

                          <div className="pt-2 mt-2 border-t border-gray-50">
                            {(activeSession.status === 'connected' || activeSession.status === 'connecting') && (
                              <button
                                onClick={() => {
                                  handleDisconnect(activeSession.id, false);
                                  setIsAccountDetailsVisible(false);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all group/disc mb-3"
                              >
                                <span className="text-[10px] font-black uppercase tracking-widest">Disconnect Account</span>
                                <LogOut className="w-4 h-4 group-hover/disc:rotate-12 transition-transform" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                handleDisconnect(activeSession.id, true);
                                setIsAccountDetailsVisible(false);
                              }}
                              className="w-full py-2 text-center text-[9px] font-black text-slate-300 hover:text-red-600 transition-colors uppercase tracking-widest"
                            >
                              Permanently Remove Account
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDisconnect(activeSession.id, false)}
                className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Account
              </button>
            </div>
          </div>
        </div>
        )}


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

                      <div className="space-y-6 pt-12 border-t border-gray-100 animate-in fade-in duration-1000">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-red-500" />
                              AI Intelligent Blocker
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Prevent AI from responding to specific contacts</p>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", useLinkedNumbersBlock ? "text-red-500" : "text-slate-300")}>Linked Number Blocks</span>
                              <button 
                                onClick={() => setUseLinkedNumbersBlock(!useLinkedNumbersBlock)}
                                className={cn("w-10 h-5 rounded-full p-1 transition-all duration-300 relative shadow-inner", useLinkedNumbersBlock ? "bg-red-500" : "bg-gray-200")}
                              >
                                <div className={cn("w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300", useLinkedNumbersBlock ? "translate-x-5" : "translate-x-0")} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Block Registry (Comma/Newline separated)</label>
                              <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                {blockedNumbers.split(/[\n,]+/).filter(n => n.trim().length > 0).length} Blocked
                              </div>
                           </div>
                           <textarea
                            placeholder="917872490719, 918877665544..."
                            value={blockedNumbers}
                            onChange={(e) => setBlockedNumbers(e.target.value)}
                            className="w-full h-32 px-6 py-5 rounded-[2rem] bg-white border border-gray-200 focus:ring-4 focus:ring-red-500/5 transition-all font-medium text-sm resize-none shadow-sm"
                           />
                           <div className="flex items-center gap-3 px-4 py-3 bg-white/50 rounded-xl border border-gray-100">
                              <AlertCircle className="w-4 h-4 text-slate-400" />
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic leading-relaxed">
                                Messages from these numbers will arrive in WhatsApp but the AI agent will intentionally ignore them.
                              </p>
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'history' ? (
              <motion.div
                key="messaging-history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-7xl mx-auto p-6 md:p-12 space-y-12"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Message Intelligence</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-md">Track delivery, read status, and AI responses across all connected channels in real-time.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm items-center">
                        <select 
                          value={timeFilter}
                          onChange={(e) => setTimeFilter(e.target.value)}
                          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
                        >
                          <option value="all">Lifetime</option>
                          <option value="24h">Last 24 Hours</option>
                          <option value="48h">Last 48 Hours</option>
                          <option value="3d">Last 3 Days</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="14d">Last 14 Days</option>
                          <option value="1m">Last 1 Month</option>
                          <option value="2m">Last 2 Months</option>
                          <option value="3m">Last 3 Months</option>
                          <option value="6m">Last 6 Months</option>
                          <option value="1y">Last 1 Year</option>
                          <option value="2y">Last 2 Years</option>
                          <option value="3y">Last 3 Years</option>
                          <option value="custom">Custom Range</option>
                        </select>
                        
                        {timeFilter === 'custom' && (
                          <div className="flex items-center gap-1 border-l border-gray-100 ml-1 pl-1 animate-in slide-in-from-right-2">
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="px-2 py-1.5 text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none"
                            />
                            <span className="text-slate-300 text-[10px]">—</span>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="px-2 py-1.5 text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <button onClick={fetchHistory} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                        <RefreshCw className={cn("w-5 h-5 text-slate-400", isHistoryLoading && "animate-spin")} />
                      </button>
                    </div>

                    <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm self-end">
                      {[
                        { id: 'all', label: 'All Logs', icon: LayoutGrid },
                        { id: 'broadcast', label: 'Campaigns', icon: Zap },
                        { id: 'system', label: 'System', icon: ShieldCheck },
                        { id: 'ai', label: 'AI Intel', icon: Bot }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setHistoryFilter(f.id)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            historyFilter === f.id ? "bg-slate-900 text-white shadow-md scale-105" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <f.icon className="w-3.5 h-3.5" />
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Messages', value: messagesHistory.length, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Read Ratio', value: `${Math.round((messagesHistory.filter(m => m.status === 'read').length / (messagesHistory.length || 1)) * 100)}%`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Active Campaigns', value: broadcastHistory.length, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'AI Responses', value: messagesHistory.filter(m => m.isAi).length, icon: Bot, color: 'text-indigo-900', bg: 'bg-slate-100' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all"
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                      <h4 className="text-2xl font-black text-slate-900">{stat.value}</h4>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Campaign Reports */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-500" />
                        Campaign Reports
                      </h4>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
                      {broadcastHistory.length > 0 ? broadcastHistory.map((b) => (
                        <div key={b.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-amber-200 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">Broadcast</div>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(b.startTime).toLocaleDateString()}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 mb-2">Campaign {b.id.slice(-6).toUpperCase()}</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Delivered</p>
                              <p className="text-sm font-bold text-emerald-600">{b.successCount}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Failed</p>
                              <p className="text-sm font-bold text-red-500">{b.failCount}</p>
                            </div>
                          </div>
                          <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                              style={{ width: `${(b.successCount / (b.totalRecipients || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 opacity-50">
                          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-bold text-slate-400">No campaigns yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Live Event Stream
                      </h4>
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-gray-100">
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">From</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">To</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = messagesHistory
                                .filter(m => {
                                  if (historyFilter === 'broadcast') return m.isCampaign;
                                  if (historyFilter === 'ai') return m.isAi;
                                  if (historyFilter === 'system') return m.isSystem;
                                  return true;
                                })
                                .filter(m => {
                                  if (timeFilter === 'all') return true;
                                  const msgDate = new Date(m.timestamp);
                                  const now = new Date();
                                  
                                  if (timeFilter === 'custom') {
                                    const msgDateStr = msgDate.toISOString().split('T')[0];
                                    if (startDate && msgDateStr < startDate) return false;
                                    if (endDate && msgDateStr > endDate) return false;
                                    return true;
                                  }

                                  const diffMs = now.getTime() - msgDate.getTime();
                                  const diffHours = diffMs / (1000 * 60 * 60);
                                  const diffDays = diffHours / 24;

                                  if (timeFilter === '24h') return diffHours <= 24;
                                  if (timeFilter === '48h') return diffHours <= 48;
                                  if (timeFilter === '3d') return diffDays <= 3;
                                  if (timeFilter === '7d') return diffDays <= 7;
                                  if (timeFilter === '14d') return diffDays <= 14;
                                  if (timeFilter === '1m') return diffDays <= 30;
                                  if (timeFilter === '2m') return diffDays <= 60;
                                  if (timeFilter === '3m') return diffDays <= 90;
                                  if (timeFilter === '6m') return diffDays <= 180;
                                  if (timeFilter === '1y') return diffDays <= 365;
                                  if (timeFilter === '2y') return diffDays <= 730;
                                  if (timeFilter === '3y') return diffDays <= 1095;
                                  
                                  return true;
                                });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-32 text-center">
                                      <div className="flex flex-col items-center justify-center opacity-30">
                                        <Search className="w-12 h-12 mb-4 text-slate-300" />
                                        <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">No events found for this criteria</p>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((m, i) => (
                                <tr key={i} className="border-b border-gray-50/50 hover:bg-slate-50/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                                        {(m.fromNumber || m.remoteJid || '??')?.slice(0, 2)}
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-900">{(m.fromNumber || (m.fromMe ? 'System' : m.remoteJid))?.split('@')[0]}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[8px] font-bold text-indigo-500 uppercase">
                                        {(m.toNumber || m.remoteJid || '??')?.slice(0, 2)}
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-900">{(m.toNumber || m.remoteJid)?.split('@')[0]}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 max-w-[200px]">
                                    <p className="text-xs text-slate-500 font-medium truncate group-hover:whitespace-normal transition-all">{m.text}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-center">
                                      {m.status === 'read' ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span className="text-[9px] font-black uppercase tracking-tight">Seen</span>
                                        </div>
                                      ) : m.status === 'delivered' ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span className="text-[9px] font-black uppercase tracking-tight">Delivered</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-400 rounded-lg">
                                          <Clock className="w-3 h-3" />
                                          <span className="text-[9px] font-black uppercase tracking-tight">Sent</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
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
                            type="text"
                            inputMode="numeric"
                            value={minDelay}
                            disabled={!isRandomDelay}
                            onChange={(e) => {
                              const val = Number(e.target.value.replace(/\D/g, ''));
                              setMinDelay(val);
                              if (maxDelay < val) setMaxDelay(val);
                            }}
                            className={cn("w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", !isRandomDelay && "opacity-30 grayscale cursor-not-allowed")}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Max Delay (s)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={maxDelay}
                            disabled={!isRandomDelay}
                            onChange={(e) => {
                              const val = Number(e.target.value.replace(/\D/g, ''));
                              if (val >= minDelay) setMaxDelay(val);
                              else setMaxDelay(minDelay);
                            }}
                            className={cn("w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", !isRandomDelay && "opacity-30 grayscale cursor-not-allowed")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Intelligence Unit */}
                    <div className="space-y-8 pt-8 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Bot className="w-4 h-4 text-amber-500" />
                          AI Intelligence Unit
                        </h4>
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", globalAiActive ? "text-emerald-600" : "text-slate-400")}>
                            {globalAiActive ? "Master Agent Active" : "Master Agent Offline"}
                          </span>
                          <button
                            onClick={() => setGlobalAiActive(!globalAiActive)}
                            className={cn("w-12 h-6 rounded-full p-1 transition-all duration-300 relative shadow-inner", globalAiActive ? "bg-emerald-500" : "bg-gray-200")}
                          >
                            <div className={cn("w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300", globalAiActive ? "translate-x-6" : "translate-x-0")} />
                          </button>
                        </div>
                      </div>

                      {globalAiActive && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-indigo-500">Step 1: Activate Bot Channels</label>
                            <button
                                onClick={() => setRoutingModal({ isOpen: true, type: 'ai', selected: activeBotSessions || [] })}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-slate-900 hover:text-white text-indigo-600 rounded-full transition-all border border-indigo-100 group shadow-sm"
                              >
                                <CloudLightning className="w-3 h-3 transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-[0.1em]">
                                  {(activeBotSessions || []).length} AI Workers Active
                                </span>
                                <ChevronRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                              </button>
                          </div>

                          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", !globalAiActive && "opacity-30 grayscale cursor-not-allowed pointer-events-none")}>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Identity (Name)</label>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIncludeAgentName(!includeAgentName)}>
                                  <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors", includeAgentName ? "text-emerald-500" : "text-slate-300")}>Show in chat</span>
                                  <button className={cn("w-6 h-3 rounded-full p-0.5 transition-all relative pointer-events-none", includeAgentName ? "bg-emerald-500" : "bg-gray-200")}>
                                    <div className={cn("w-2 h-2 bg-white rounded-full shadow-sm transition-transform", includeAgentName ? "translate-x-3" : "translate-x-0")} />
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={aiAgentName}
                                disabled={!globalAiActive}
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
                                disabled={!globalAiActive}
                                onChange={(e) => setGroqApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm shadow-sm"
                              />
                            </div>
                          </div>
                          {/* rest of AI unit follows ... */}

                          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", !globalAiActive && "opacity-30 grayscale cursor-not-allowed pointer-events-none")}>
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Language Model</label>
                              <select
                                value={aiModel}
                                disabled={!globalAiActive}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-bold text-sm shadow-sm"
                              >
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Powerful)</option>
                                <option value="llama3-70b-8192">Llama 3 70B (Power)</option>
                                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
                                <option value="llama3-8b-8192">Llama 3 8B (Efficient)</option>
                                <option value="llama-3.2-11b-vision-preview">Llama 3.2 11B (Vision)</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Reliable)</option>
                                <option value="qwen-2.5-72b-instruct">Qwen 2.5 72B (Advanced)</option>
                                <option value="qwen/qwen3-32b">Qwen 3 32B (Experimental)</option>
                              </select>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Depth ({useAllContext ? "All" : `${contextLimit} msgs`})</label>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => globalAiActive && setUseContextHistory(!useContextHistory)}>
                                    <span className={cn("text-[10px] font-bold uppercase transition-colors", useContextHistory ? "text-indigo-600" : "text-slate-400")}>{useContextHistory ? "Active" : "Static"}</span>
                                    <button className={cn("w-8 h-4 rounded-full p-0.5 transition-all relative pointer-events-none shadow-inner", useContextHistory ? "bg-indigo-500" : "bg-gray-200")}>
                                      <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", useContextHistory ? "translate-x-4" : "translate-x-0")} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => globalAiActive && useContextHistory && setUseAllContext(!useAllContext)}>
                                    <span className={cn("text-[10px] font-bold uppercase transition-colors", useAllContext ? "text-emerald-600" : "text-slate-400")}>All</span>
                                    <button className={cn("w-8 h-4 rounded-full p-0.5 transition-all relative pointer-events-none shadow-inner", useAllContext ? "bg-emerald-500" : "bg-gray-200")}>
                                      <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", useAllContext ? "translate-x-4" : "translate-x-0")} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="relative group">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={useAllContext ? "Infinity" : contextLimit}
                                  disabled={!globalAiActive || !useContextHistory || useAllContext}
                                  onChange={(e) => setContextLimit(Number(e.target.value.replace(/\D/g, '')))}
                                  className={cn(
                                    "w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-black text-sm shadow-sm transition-all",
                                    (!globalAiActive || !useContextHistory || useAllContext) && "opacity-40 grayscale cursor-not-allowed bg-slate-50",
                                    useAllContext && "text-emerald-600 border-emerald-100"
                                  )}
                                  placeholder="Messages to remember (1-50)"
                                />
                                {useAllContext && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                                    ∞ Unlimited
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 pt-4", !globalAiActive && "opacity-30 grayscale cursor-not-allowed pointer-events-none")}>
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Native Summarization Frequency</label>
                              <div className="relative group">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={summarizationFrequency}
                                  disabled={!globalAiActive || !useAllContext}
                                  onChange={(e) => setSummarizationFrequency(Number(e.target.value.replace(/\D/g, '')))}
                                  className={cn(
                                    "w-full px-6 py-4 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-slate-900/5 font-black text-sm shadow-sm transition-all",
                                    (!globalAiActive || !useAllContext) && "opacity-40 grayscale cursor-not-allowed bg-slate-50"
                                  )}
                                  placeholder="Messages before auto-summary (default 10)"
                                />
                                <div className={cn(
                                  "absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest transition-all",
                                  (!globalAiActive || !useAllContext) ? "text-slate-200" : "text-slate-300 group-hover:text-amber-500"
                                )}>
                                  msgs
                                </div>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic ml-1">
                                Compression trigger: Automatically summarize context every {summarizationFrequency} messages.
                              </p>
                            </div>
                            <div className={cn("space-y-4 flex flex-col justify-end transition-all", (!globalAiActive || !useAllContext) && "opacity-30 grayscale")}>
                              <div className="p-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl">
                                <p className="text-[9px] text-amber-600 font-bold uppercase tracking-[0.15em] leading-relaxed">
                                  Pro-Tip: Higher frequency (lower number) keeps AI sharper but consumes more API credits. Recommended range: 10-25.
                                </p>
                              </div>
                            </div>
                          </div>

                            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 pt-4", !globalAiActive && "opacity-30 grayscale cursor-not-allowed pointer-events-none")}>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => globalAiActive && setTypingSimulation(!typingSimulation)}>
                                  <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm border", typingSimulation ? "bg-indigo-50 border-indigo-100 text-indigo-500" : "bg-slate-50 border-gray-100 text-slate-400")}>
                                      <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">Typing Simulation</h4>
                                      <p className="text-xs text-slate-400 font-medium">Auto typing vs manual timing</p>
                                    </div>
                                  </div>
                                  <button className={cn("w-12 h-6 rounded-full p-1 transition-all duration-300 relative", typingSimulation ? "bg-indigo-500" : "bg-gray-200")}>
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300", typingSimulation ? "translate-x-6" : "translate-x-0")} />
                                  </button>
                                </div>

                                {typingSimulation && (
                                  <div className="space-y-4 animate-in slide-in-from-top-2 p-1">
                                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer" onClick={() => setAutoTypingSimulation(!autoTypingSimulation)}>
                                      <div className="flex items-center gap-3">
                                        <Zap className={cn("w-4 h-4", autoTypingSimulation ? "text-indigo-500" : "text-slate-300")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Auto Time Simulation</span>
                                      </div>
                                      <button className={cn("w-8 h-4 rounded-full p-0.5 transition-all relative pointer-events-none shadow-inner", autoTypingSimulation ? "bg-emerald-500" : "bg-gray-200")}>
                                        <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", autoTypingSimulation ? "translate-x-4" : "translate-x-0")} />
                                      </button>
                                    </div>

                                    {!autoTypingSimulation && (
                                      <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95">
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Min Typ (s)</label>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={minTyping}
                                            onChange={(e) => setMinTyping(Number(e.target.value.replace(/\D/g, '')))}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-indigo-900/5 font-bold text-sm text-center"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Max Typ (s)</label>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={maxTyping}
                                            onChange={(e) => setMaxTyping(Number(e.target.value.replace(/\D/g, '')))}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-4 focus:ring-indigo-900/5 font-bold text-sm text-center"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic ml-1 pt-1">
                                      {autoTypingSimulation ? "Bot calculates typing time based on message word count." : "Set custom typing duration ranges."}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 shadow-sm cursor-pointer hover:border-amber-200 transition-colors" onClick={() => globalAiActive && setMultiMessageReply(!multiMessageReply)}>
                                  <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm border", multiMessageReply ? "bg-amber-50 border-amber-100 text-amber-500" : "bg-slate-50 border-gray-100 text-slate-400")}>
                                      <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">Multi-message Reply</h4>
                                      <p className="text-xs text-slate-400 font-medium">Wait and combine incoming messages</p>
                                    </div>
                                  </div>
                                  <button className={cn("w-12 h-6 rounded-full p-1 transition-all duration-300 relative", multiMessageReply ? "bg-amber-500" : "bg-gray-200")}>
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300", multiMessageReply ? "translate-x-6" : "translate-x-0")} />
                                  </button>
                                </div>
                                <div className="px-4 py-3 bg-amber-50/30 rounded-xl border border-amber-100">
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic leading-relaxed">
                                    Collects multiple messages from the same user into one context before analyzing.
                                  </p>
                                </div>
                              </div>
                            </div>

                          {/* Master Agent Schedule Section */}
                          <div className={cn("mt-8 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group/schedule", !globalAiActive && "opacity-30 grayscale cursor-not-allowed pointer-events-none")}>
                             {/* Background Accents */}
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover/schedule:rotate-0 transition-transform duration-1000">
                              <Clock className="w-48 h-48" />
                            </div>
                            
                            <div className="relative z-10">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shadow-lg">
                                    <Clock className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-black tracking-tight uppercase">Master Agent Schedule</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Operational Windows & Availability</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                                  <button
                                    onClick={() => setAiSchedule({ ...aiSchedule, alwaysOn: true })}
                                    className={cn(
                                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                      aiSchedule.alwaysOn ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                    )}
                                  >
                                    Always On
                                  </button>
                                  <button
                                    onClick={() => setAiSchedule({ ...aiSchedule, alwaysOn: false })}
                                    className={cn(
                                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                      !aiSchedule.alwaysOn ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                    )}
                                  >
                                    Custom Schedule
                                  </button>
                                </div>
                              </div>

                              {!aiSchedule.alwaysOn && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                  {Object.keys(aiSchedule.weekly).map((day) => (
                                    <div key={day} className={cn(
                                      "p-5 rounded-2xl border transition-all",
                                      aiSchedule.weekly[day].active ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent opacity-40"
                                    )}>
                                      <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{day}</span>
                                        <button
                                          onClick={() => {
                                            const next = { ...aiSchedule };
                                            next.weekly[day].active = !next.weekly[day].active;
                                            setAiSchedule(next);
                                          }}
                                          className={cn(
                                            "w-8 h-4 rounded-full p-0.5 transition-all relative",
                                            aiSchedule.weekly[day].active ? "bg-emerald-500" : "bg-white/20"
                                          )}
                                        >
                                          <div className={cn("w-3 h-3 bg-white rounded-full transition-transform", aiSchedule.weekly[day].active ? "translate-x-4" : "translate-x-0")} />
                                        </button>
                                      </div>
                                      
                                      <div className={cn("space-y-3", !aiSchedule.weekly[day].active && "pointer-events-none")}>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active From</label>
                                          <input
                                            type="time"
                                            value={aiSchedule.weekly[day].from}
                                            onChange={(e) => {
                                              const next = { ...aiSchedule };
                                              next.weekly[day].from = e.target.value;
                                              setAiSchedule(next);
                                            }}
                                            className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active To</label>
                                          <input
                                            type="time"
                                            value={aiSchedule.weekly[day].to}
                                            onChange={(e) => {
                                              const next = { ...aiSchedule };
                                              next.weekly[day].to = e.target.value;
                                              setAiSchedule(next);
                                            }}
                                            className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-2 h-2 rounded-full animate-pulse", globalAiActive ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]")} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    Status: {globalAiActive ? "Master Agent Online" : "Master Agent Offline"}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed max-w-xs text-right">
                                  Automated responses will only be dispatched during defined active windows.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-8 mt-8 border-t border-gray-100">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Communication Templates</h3>
                          <p className="text-xs text-slate-400 font-medium tracking-tight">Configure automated message routing and content</p>
                        </div>
                      </div>

                      <div className="space-y-12">
                        {/* OTP SECTION */}
                        <div className="bg-slate-50/30 rounded-[2rem] p-8 border border-slate-100">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-indigo-500 shadow-sm"><Hash className="w-4 h-4" /></div>
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">OTP Broadcasts</h4>
                              </div>
                              
                              <div className="hidden md:block w-px h-6 bg-slate-200" />

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Router:</span>
                                <button
                                  onClick={() => setRoutingModal({ isOpen: true, type: 'otp', selected: otpRouting || [] })}
                                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-600 rounded-full transition-all border border-slate-200 shadow-sm group"
                                >
                                  <Users className="w-3 h-3 transition-colors" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">
                                    {(otpRouting || []).includes('all') ? "Global Routing" : `${(otpRouting || []).filter(id => id !== 'all' && (sessions || []).some(s => s.id === id && s.me?.number)).length} Active Channels`}
                                  </span>
                                  <ChevronRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => setOtpTemplates([...otpTemplates, "Your OTP is {(0)}"])}
                              className="text-[9px] font-black text-white uppercase tracking-[0.2em] bg-indigo-600 px-6 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                            >
                              + Add Template
                            </button>
                          </div>

                          <div className="space-y-3 px-2">
                            {otpTemplates.map((tpl, i) => (
                              <div key={i} className="flex gap-2 group">
                                <input
                                  value={tpl}
                                  onChange={(e) => {
                                    const next = [...otpTemplates];
                                    next[i] = e.target.value;
                                    setOtpTemplates(next);
                                  }}
                                  className="flex-1 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                />
                                <button
                                  onClick={() => setOtpTemplates(otpTemplates.filter((_, idx) => idx !== i))}
                                  className="p-4 text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-2xl hover:border-red-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-2 italic pt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Use {(0)} as placeholder for OTP code
                            </p>
                          </div>
                        </div>

                        {/* CHURN SECTION */}
                        <div className="bg-slate-50/30 rounded-[2rem] p-8 border border-slate-100">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-rose-500 shadow-sm"><Users className="w-4 h-4" /></div>
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Retention Engine</h4>
                                <div className="flex items-center gap-2 cursor-pointer ml-2" onClick={() => setRetentionActive(!retentionActive)}>
                                  <button className={cn("w-8 h-4 rounded-full p-0.5 transition-all relative pointer-events-none shadow-inner", retentionActive ? "bg-emerald-500" : "bg-gray-200")}>
                                    <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", retentionActive ? "translate-x-4" : "translate-x-0")} />
                                  </button>
                                  <span className={cn("text-[9px] font-black uppercase tracking-widest", retentionActive ? "text-emerald-500" : "text-slate-400")}>{retentionActive ? "Active" : "Closed"}</span>
                                </div>
                              </div>

                              <div className="hidden md:block w-px h-6 bg-slate-200" />

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Router:</span>
                                  <button
                                    onClick={() => setRoutingModal({ isOpen: true, type: 'churn', selected: churnRouting || [] })}
                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-600 rounded-full transition-all border border-slate-200 shadow-sm group"
                                  >
                                    <LayoutGrid className="w-3 h-3 transition-colors" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em]">
                                      {(churnRouting || []).includes('all') ? "Global Routing" : "Custom Routing"}
                                    </span>
                                    <ChevronRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Idle Limit:</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={churnDays}
                                    onChange={(e) => setChurnDays(Number(e.target.value.replace(/\D/g, '')))}
                                    className="w-10 text-[10px] font-black text-center text-rose-600 bg-transparent outline-none"
                                  />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Days</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => setChurnTemplates([...churnTemplates, "Hi {(1)}, we miss you!"])}
                              className="text-[9px] font-black text-white uppercase tracking-[0.2em] bg-indigo-600 px-6 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                            >
                              + Add Template
                            </button>
                          </div>

                          <div className={cn("space-y-3 px-2 transition-all duration-500", !retentionActive && "opacity-20 grayscale pointer-events-none")}>
                            {churnTemplates.map((tpl, i) => (
                              <div key={i} className="flex gap-2 group">
                                <input
                                  value={tpl}
                                  onChange={(e) => {
                                    const next = [...churnTemplates];
                                    next[i] = e.target.value;
                                    setChurnTemplates(next);
                                  }}
                                  className="flex-1 px-5 py-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-rose-100 transition-all outline-none"
                                />
                                <button
                                  onClick={() => setChurnTemplates(churnTemplates.filter((_, idx) => idx !== i))}
                                  className="p-4 text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-2xl hover:border-red-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-2 italic pt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-400" /> Use {(1)} for name, {(2)} for phone
                            </p>
                          </div>
                        </div>
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
                <div className="bg-white border border-gray-200 rounded-[3rem] p-10 md:p-24 text-center shadow-sm flex-1 flex flex-col items-center justify-center relative overflow-hidden group">
                   {/* Decorative background accent */}
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-50/30 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000" />
                  
                  {activeSession.status === 'disconnected' ? (
                    <div className="py-16 relative z-10 w-full max-w-lg">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-24 h-24 bg-slate-100/50 backdrop-blur-sm rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white"
                      >
                        {activeSession.me?.number ? <ShieldAlert className="w-12 h-12 text-red-500" /> : <QrCode className="w-12 h-12 text-slate-400" />}
                      </motion.div>
                      
                      <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase text-slate-900 leading-tight">
                        {activeSession.error ? "Duplicate Conflict" : (activeSession.me?.number ? "Account Disconnected" : "Secure Gateway")}
                      </h2>

                      {lastDisconnectedNumber && !activeSession.error && (
                        <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 text-left animate-in fade-in zoom-in-95 duration-500">
                          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                            <LogOut className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Session Terminated</p>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                              Your number <span className="text-red-600 font-extrabold">+{lastDisconnectedNumber}</span> is disconnected.
                            </p>
                          </div>
                        </div>
                      )}

                      {activeSession.error && (
                        <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 text-left animate-in fade-in zoom-in-95 duration-500">
                          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                            <ShieldAlert className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Security Conflict</p>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic">{activeSession.error}</p>
                          </div>
                        </div>
                      )}

                      <p className="text-slate-500 mb-10 text-base font-medium leading-relaxed max-w-sm mx-auto">
                        {activeSession.error 
                          ? "This session cannot be activated because the WhatsApp account is already being managed by another active instance."
                          : (activeSession.me?.number 
                            ? "Please re-link your WhatsApp account to restore communication services and AI orchestration."
                            : "This messaging session is currently offline. Initialize a secure handshake to start using the enterprise communication engine.")}
                      </p>
                      <button
                        onClick={() => handleConnect()}
                        disabled={loading}
                        className={cn(
                          "px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 disabled:opacity-50 relative group/btn",
                          activeSession.me?.number ? "bg-red-600 hover:bg-red-700 shadow-red-100" : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
                        )}
                      >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
                          <div className="flex items-center gap-3 text-white">
                            {activeSession.me?.number ? "Reconnect Account" : "Initialize Secure Connection"}
                            <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </button>

                      {loading && (
                        <div className="flex flex-col items-center gap-4 mt-8">
                          <button
                            onClick={() => handleDisconnect(activeSession.id, false)}
                            className="text-[11px] font-black text-slate-400 hover:text-red-600 transition-colors uppercase tracking-[0.3em]"
                          >
                            Cancel Transition
                          </button>
                        </div>
                      )}
                      
                      {!loading && activeSession.status === 'connecting' && (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Hard Reset Session?",
                              message: "If the QR code is not appearing, a hard reset will purge all session cache and start fresh. Continue?",
                              onConfirm: async () => {
                                try {
                                  setLoading(true);
                                  await api.whatsapp.disconnect(activeSession.id, true);
                                  showAlert("Session nuked. Starting fresh...", "info");
                                  setTimeout(() => handleConnect(activeSession.id), 1000);
                                } catch (e) {
                                  showAlert("Reset failed.", "error");
                                } finally {
                                  setLoading(false);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              }
                            });
                          }}
                          className="mt-8 block mx-auto text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest border-b border-indigo-100 pb-1"
                        >
                          QR not appearing? Reset Handshake
                        </button>
                      )}
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

                      <div className="bg-slate-50/50 rounded-[3rem] p-12 md:p-16 flex flex-col items-center justify-center border border-slate-100 relative group min-h-[580px] shadow-inner">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-[3rem] -z-1" />
                        
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
                                <button
                                  onClick={() => handleDisconnect(activeSession.id, false)}
                                  className="w-full py-2 text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
                                >
                                  Cancel Connection Setup
                                </button>
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
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="w-full h-full pb-10"
              >
                {/* Unified Dashboard Container */}
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[calc(100vh-200px)]">

                  {/* Left Sidebar Tabs (Aligned & Fixed) */}
                  <div className="w-full md:w-56 bg-slate-50/30 border-r border-gray-100 p-4 flex flex-col gap-1.5 shrink-0">
                    <div className="mb-6 px-2">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Control Panel</h2>
                      <p className="text-[11px] font-black text-slate-900 mt-0.5">Manage Session</p>
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
                  <div className="flex-1 p-6 lg:p-8 overflow-y-auto">

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
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSummarizeSingle(c.phone); }}
                                        className={cn(
                                          "p-2 rounded-lg transition-all border",
                                          selectedCustomers.has(c.phone) 
                                            ? "border-white/20 text-white hover:bg-white/10" 
                                            : "border-gray-100 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
                                        )}
                                        title="Compress & Save Context Memory"
                                      >
                                        <CloudLightning className="w-4 h-4 cursor-pointer" />
                                      </button>
                                      {selectedCustomers.has(c.phone) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-20" />}
                                    </div>
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

      {/* Routing Selector Modal */}
      <AnimatePresence>
        {routingModal?.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRoutingModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-xl shadow-2xl border border-white"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Router Configuration</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select accounts for {routingModal?.type || 'broadcast'} broadcast</p>
                </div>
                <button
                  onClick={() => setRoutingModal(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-10 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                <button
                  onClick={() => {
                    const isAll = (routingModal?.selected || []).includes('all');
                    if (routingModal) setRoutingModal({ ...routingModal, selected: isAll ? [] : ['all'] });
                  }}
                  className={cn(
                    "w-full p-6 rounded-3xl border-2 flex items-center justify-between transition-all group",
                    routingModal.selected.includes('all') ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", routingModal.selected.includes('all') ? "bg-white/10" : "bg-slate-50")}>
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-widest">All Linked Accounts</p>
                      <p className={cn("text-[10px] font-bold opacity-60", routingModal.selected.includes('all') ? "text-white" : "text-slate-400")}>Automatically use all future linked numbers</p>
                    </div>
                  </div>
                  <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", (routingModal?.selected || []).includes('all') ? "bg-emerald-500 border-emerald-500" : "border-slate-200 group-hover:border-slate-400")}>
                    {(routingModal?.selected || []).includes('all') && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                </button>

                {!routingModal.selected.includes('all') && sessions.filter(s => s.me?.number).map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      let next = [...routingModal.selected];
                      if (next.includes(s.id)) next = next.filter(id => id !== s.id);
                      else next.push(s.id);
                      setRoutingModal({ ...routingModal, selected: next });
                    }}
                    className={cn(
                      "w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all group",
                      (routingModal?.selected || []).includes(s.id) ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                        {s.me?.profilePic ? <img src={s.me.profilePic} className="w-full h-full object-cover" /> : <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-300"><User className="w-6 h-6" /></div>}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black truncate max-w-[150px]">{s.me?.name || "WhatsApp User"}</p>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", routingModal.selected.includes(s.id) ? "text-indigo-400" : "text-slate-400")}>+{s.me?.number}</p>
                      </div>
                    </div>
                    <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", routingModal.selected.includes(s.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-200 group-hover:border-slate-400")}>
                      {routingModal.selected.includes(s.id) && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setRoutingModal(null)}
                  className="flex-1 px-8 py-5 rounded-3xl bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    let final = routingModal.selected;
                    if (final.length === 0) final = ['all'];
                    if (routingModal.type === 'otp') setOtpRouting(final);
                    else if (routingModal.type === 'churn') setChurnRouting(final);
                    else if (routingModal.type === 'ai') setActiveBotSessions(final);
                    setRoutingModal(null);
                  }}
                  className="flex-2 px-12 py-5 rounded-3xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Done & Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
</div>
  );
};

export default WhatsAppManagement;