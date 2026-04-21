import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidDecode,
  WAMessageStubType,
  WASocket,
  proto,
  delay,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Import New Professional Models
import WhatsAppAccount from "../models/WhatsAppAccount.js";
import WhatsAppContact from "../models/WhatsAppContact.js";
import WhatsAppMessage from "../models/WhatsAppMessage.js";


const logger = pino({ level: "info" });

// Helper for formatting WhatsApp numbers
export const formatPhoneForWhatsApp = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");
  // If it starts with 91 and has 12 digits, it's already full
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `${cleaned}@s.whatsapp.net`;
  }
  // If 10 digits, add 91
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return `${cleaned}@s.whatsapp.net`;
};

export interface WhatsAppSession {
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

class WhatsAppSessionManager {
  private sockets: Map<string, WASocket> = new Map();
  private statuses: Map<string, WhatsAppSession> = new Map();
  private typingPresence: Map<string, Set<string>> = new Map();
  private manualDisconnections = new Set<string>();
  private stopFlags: Map<string, Set<string>> = new Map();
  private botTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pendingMessages: Map<string, string[]> = new Map();
  private sessionsDir = path.join(process.cwd(), "whatsapp_sessions_auth");

  constructor() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  public async asyncCleanupGhostFolders() {
    if (mongoose.connection.readyState !== 1) return;
    try {
      const dbSessions = await WhatsAppAccount.find({}).lean();
      const dbSessionIds = new Set(dbSessions?.map(s => s.sessionId) || []);

      if (fs.existsSync(this.sessionsDir)) {
        const folders = fs.readdirSync(this.sessionsDir);
        for (const folder of folders) {
          const fullPath = path.join(this.sessionsDir, folder);
          const dbMatch = dbSessions?.find(s => s.sessionId === folder);
          if (!dbSessionIds.has(folder) || !dbMatch?.phoneNumber) {
            console.log(`[Startup Cleanup] Purging orphan auth folder: ${folder}`);
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
      }
    } catch (err) {
      console.error("Ghost folder cleanup failed:", err);
    }
  }

  public async loadSessions() {
    if (mongoose.connection.readyState !== 1) return;
    try {
      // First, clean up orphaned folders on disk
      await this.asyncCleanupGhostFolders();

      const savedSessions = await WhatsAppAccount.find({}).lean();

      if (savedSessions) {
        for (const s of savedSessions) {
          if (!s.phoneNumber || s.status !== 'connected') {
            console.log(`[Startup] Skipping/Removing unlinked or stale DB session: ${s.sessionId}`);
            if (s.status !== 'connected') await WhatsAppAccount.deleteOne({ sessionId: s.sessionId });
            continue;
          }

          this.updateStatus(s.sessionId, { id: s.sessionId, status: "disconnected", qr: null, me: s.me as any });
          console.log(`Auto-starting linked session: ${s.sessionId} (${s.phoneNumber})`);
          this.initSession(s.sessionId).catch(err => console.error(`Failed to auto-start ${s.sessionId}:`, err));
        }
      }
    } catch (err) {
      console.error("Error loading WhatsApp sessions:", err);
    }
  }

  public async cleanupUnlinkedSessions() {
    try {
      console.log("[Cleanup] Starting aggressive purge of unlinked/phantom sessions...");

      // 1. Memory Cleanup
      const currentIds = Array.from(this.statuses.keys());
      for (const id of currentIds) {
        const session = this.statuses.get(id);
        const socket = this.sockets.get(id);

        // Purge if no identity link exists AND session is not actively connecting
        if (!session || (!session.me?.number && session.status !== 'connecting')) {
          console.log(`[Manual Cleanup] Purging in-memory session: ${id}`);
          if (socket) {
            try { socket.end(undefined); } catch (e) { }
            this.sockets.delete(id);
          }
          this.statuses.delete(id);

          // Filesystem Cleanup
          const authDir = path.join(this.sessionsDir, id);
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
        }
      }

      // 2. Extra Filesystem Guard: Remove folders not in Statuses (since we just cleaned statuses)
      if (fs.existsSync(this.sessionsDir)) {
        const folders = fs.readdirSync(this.sessionsDir);
        for (const f of folders) {
          if (!this.statuses.has(f)) {
            // Check if this folder being removed was actually a connecting one we just kept
            // (already handled by the loop above keeping it in this.statuses)
            fs.rmSync(path.join(this.sessionsDir, f), { recursive: true, force: true });
          }
        }
      }

      // 3. Database Cleanup
      if (mongoose.connection.readyState === 1) {
        const result = await WhatsAppAccount.deleteMany({
          status: { $ne: 'connected' },
          phoneNumber: { $exists: false }
        });
        console.log(`[Auto-Cleanup] Purged ${result.deletedCount} ghost sessions from DB`);
      }

      return { success: true };
    } catch (err) {
      console.error("Manual cleanup failed:", err);
      throw err;
    }
  }

  public async registerSession(id: string) {
    if (this.statuses.size >= 10) {
      throw new Error("Maximum 10 concurrent sessions allowed. Please delete unused slots.");
    }

    // Save placeholder to DB to prevent memory purge
    if (mongoose.connection.readyState === 1) {
      await WhatsAppAccount.findOneAndUpdate(
        { sessionId: id },
        {
          $set: {
            sessionId: id,
            status: "disconnected",
            isActive: true
          }
        },
        { upsert: true }
      );
    }

    const status: WhatsAppSession = { id, status: "disconnected", qr: null, me: null };
    this.statuses.set(id, status);
    console.log(`[Session] Registered in memory and database: ${id}`);

    return status;
  }

  private async transcribeAudio(buffer: Buffer, apiKey: string): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mp4' });
      formData.append('file', blob, 'voice.m4a');
      formData.append('model', 'whisper-large-v3');

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: formData
      });

      if (!response.ok) return "";
      const data = await response.json() as any;
      return data.text || "";
    } catch (err) {
      console.error("[Transcribe Error]", err);
      return "";
    }
  }

  private async analyzeMedia(buffer: Buffer, prompt: string, apiKey: string): Promise<string> {
    try {
      const base64 = buffer.toString('base64');
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64}` }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) return "";
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error("[Vision Error]", err);
      return "";
    }
  }

  public async initSession(id: string) {
    if (this.sockets.has(id)) {
      console.log(`[WhatsApp] Force closing existing socket for ${id} before re-init.`);
      try { this.sockets.get(id)?.end(undefined); } catch (e) { }
      this.sockets.delete(id);
    }
    if (this.statuses.get(id)?.status === "connecting") {
      // Allow a restart if requested explicitly
      console.log(`[WhatsApp] Restarting connecting session: ${id}`);
    }

    this.updateStatus(id, { id, status: "connecting", qr: null, me: null, error: null });

    // Move the heavy async work out of the main request path if possible, or ensure it's logged
    const startHandshake = async () => {
      try {
        if (!this.sockets) this.sockets = new Map();

        const authDir = path.join(this.sessionsDir, id);
        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        // Fetch latest version instead of hardcoding
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[WhatsApp] Initializing session ${id} using Baileys v${version.join('.')} (isLatest: ${isLatest})`);

        const socket = makeWASocket({
          version,
          printQRInTerminal: false,
          auth: state,
          logger,
          browser: ['Arventa Ventures', '(Meta Verified)', '1.0.0'],
          markOnlineOnConnect: true,
          connectTimeoutMs: 60000, // Increased timeout
          keepAliveIntervalMs: 30000,
        });

        this.sockets.set(id, socket);

        // Setup listeners...
        this.setupSocketListeners(id, socket, saveCreds);

      } catch (err) {
        console.error(`[WhatsApp] Failed to start handshake for ${id}:`, err);
        this.updateStatus(id, { status: "disconnected", error: "Handshake failed. Ensure your internet is stable." });
      }
    };

    startHandshake(); // DO NOT AWAIT - return to client immediately
    return { success: true };
  }

  private setupSocketListeners(id: string, socket: WASocket, saveCreds: () => Promise<void>) {
    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) this.updateStatus(id, { qr: qr, status: "connecting" });

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Session ${id} closed. Reason: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        this.updateStatus(id, { status: "disconnected", qr: null });
        this.sockets.delete(id);

        if (shouldReconnect && !this.manualDisconnections.has(id)) {
          setTimeout(() => this.initSession(id), 5000);
        } else {
          // Permanent logout or manual disconnect
          this.manualDisconnections.delete(id);
          this.updateStatus(id, { status: "disconnected", qr: null });
          console.log(`[WhatsApp] Session ${id} logged out or manual disconnect completed.`);
        }
      } else if (connection === "open") {
        if (this.manualDisconnections.has(id)) {
          console.log(`[Security] Connection opened for session ${id} but it's marked for manual disconnection. Terminating.`);
          socket.logout().catch(console.error);
          return;
        }
        console.log(`[WhatsApp] Session ${id} connected successfully.`);
        const myUser = socket.user!;
        const myNumber = myUser.id.split(":")[0] || "";
        const me: any = {
          name: myUser.name || "Business Account",
          number: myNumber
        };

        // Duplicate Check: See if this number is already used by another session in DATABASE
        if (mongoose.connection.readyState === 1) {
          const dbDuplicate = await WhatsAppAccount.findOne({
            phoneNumber: myNumber,
            sessionId: { $ne: id },
            status: 'connected'
          });

          if (dbDuplicate) {
            // Check if that session is actually active in our current process
            const isActiveLocally = this.sockets.has(dbDuplicate.sessionId);

            if (isActiveLocally) {
              console.log(`[Security] Real Duplicate conflict! Number ${myNumber} is active in session ${dbDuplicate.sessionId}.`);
              await socket.logout();
              this.updateStatus(id, {
                status: "disconnected",
                qr: null,
                me: null,
                error: `Duplicate Link Conflict: Number +${myNumber} is already connected to session "${dbDuplicate.sessionId}".`
              });
              return;
            } else {
              // It's a "Ghost" session in DB - clean it up and allow current connection
              console.log(`[Security] Ghost session ${dbDuplicate.sessionId} detected for number ${myNumber}. Purging database record...`);
              await WhatsAppAccount.updateOne(
                { sessionId: dbDuplicate.sessionId },
                { $set: { status: 'disconnected', isActive: false } }
              );
              // Fall through to normal connection logic
            }
          }
        }

        try {
          const ppUrl = await socket.profilePictureUrl(myUser.id);
          if (ppUrl) me.profilePic = ppUrl;
        } catch (e) { }

        this.updateStatus(id, { status: "connected", qr: null, me, error: null });

        if (mongoose.connection.readyState === 1) {
          await WhatsAppAccount.findOneAndUpdate(
            { sessionId: id },
            {
              $set: {
                status: 'connected',
                lastSeen: new Date(),
                me,
                phoneNumber: myNumber,
                name: me.name
              }
            },
            { upsert: true }
          );
        }
      }
    });

    // Integrated Listener: Logging + AI Orchestration
    socket.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      // Fetch settings once for efficiency and to avoid ReferenceErrors inside the loop
      const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const sender = msg.key.remoteJid;
        if (!sender) continue;

        // 1. Data Capture & Professional Filtering
        const incomingText = msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption || "";

        const session = this.getSession(id);
        const myFullJid = socket.user?.id.split(':')[0] + "@s.whatsapp.net";
        const myNumber = session?.me?.number || id;

        // STRICT SELF-MESSAGE FILTER
        if (sender === myFullJid) {
          console.log(`[Gatekeeper] Ignored self-message on ${id}`);
          continue;
        }

        if (mongoose.connection.readyState === 1) {
          const customerNumber = sender.split('@')[0];
          const senderName = msg.pushName || "Unknown Customer";

          // Log message professionally
          await WhatsAppMessage.create({
            messageId: msg.key.id,
            sessionId: id,
            from: sender,
            to: myFullJid,
            text: incomingText,
            senderType: "customer",
            status: "delivered",
            timestamp: new Date()
          });

          // Sync Contact & Increment Incoming Counter
          const contact = await WhatsAppContact.findOneAndUpdate(
            { phoneNumber: customerNumber, linkedTo: myNumber },
            {
              $set: {
                name: senderName,
                lastMessage: incomingText.substring(0, 100),
                lastInteraction: new Date()
              },
              $inc: { totalIncoming: 1, messageCounter: 1 }
            },
            { upsert: true, new: true }
          );

          // 3. Recursive Summarization Trigger
          const frequency = settings?.summarizationFrequency || 10;
          if (contact && settings?.useAllContext && contact.messageCounter % frequency === 0 && settings?.groqApiKey) {
            this.summarizeContext(customerNumber, myNumber, settings.groqApiKey).catch(console.error);
          }
        }

        // 2. AI Intelligence Gatekeeping
        if (sender.endsWith("@g.us")) continue; // Skip Groups

        if (!settings || !settings.globalAiActive) continue;

        // --- AI Blocker Engine ---
        const customerNumber = sender.split('@')[0].replace(/\D/g, '');

        // 1. Manual Block List Check
        const manualBlocks = (settings.blockedNumbers || "").split(/[\n,]+/).map((n: any) => String(n).trim().replace(/\D/g, '')).filter(Boolean);
        if (manualBlocks.includes(customerNumber)) {
          console.log(`[Gatekeeper] AI Agent Bypassed: Number ${customerNumber} is in Manual Block List.`);
          continue;
        }

        // 2. Linked Account (Internal Loop) Prevention
        if (settings.useLinkedNumbersBlock) {
          const linkedAccounts = await WhatsAppAccount.find({ status: 'connected' }).lean();
          const internalNumbers = linkedAccounts
            .map(acc => String(acc.phoneNumber || "").replace(/\D/g, ''))
            .filter(Boolean);

          if (internalNumbers.includes(customerNumber)) {
            console.log(`[Gatekeeper] AI Agent Bypassed: Number ${customerNumber} is a Linked Internal Account.`);
            continue;
          }
        }

        // --- AI Schedule Logic ---
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = days[now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const schedule = settings.aiSchedule;
        let isScheduledActive = true;

        if (schedule && !schedule.alwaysOn) {
          const dayConfig = schedule.weekly?.[currentDay];
          if (dayConfig) {
            if (!dayConfig.active) {
              isScheduledActive = false;
            } else {
              const [startH, startM] = (dayConfig.from || "00:00").split(':').map(Number);
              const [endH, endM] = (dayConfig.to || "23:59").split(':').map(Number);
              const startTime = startH * 60 + startM;
              const endTime = endH * 60 + endM;

              if (currentTime < startTime || currentTime > endTime) {
                isScheduledActive = false;
              }
            }
          }
        }

        if (!isScheduledActive) {
          console.log(`[Bot] Skipping ${sender}: Outside of active schedule.`);
          continue;
        }
        // [Diagnostic] Automatically allow all sessions to use AI for troubleshooting
        console.log(`[AI Orchestrator] Processing message for session: ${id}`);

        // 3. Accumulation & Debounce
        const timeoutKey = `${id}:${sender}`;
        if (incomingText) {
          const currentPending = this.pendingMessages.get(timeoutKey) || [];
          currentPending.push(incomingText);
          this.pendingMessages.set(timeoutKey, currentPending);
        }

        if (this.botTimeouts.has(timeoutKey)) clearTimeout(this.botTimeouts.get(timeoutKey)!);

        const multiReply = settings?.multiMessageReply ?? true;
        this.botTimeouts.set(timeoutKey, setTimeout(async () => {
          try {
            // Safety: Max 15s wait for typing presence
            let retry = 0;
            while (this.typingPresence.get(id)?.has(sender) && retry < 5) {
              await new Promise(r => setTimeout(r, 500));
              retry++;
            }

            // 4. Input Processing
            // multiReply already defined above
            let fullUserText = "";
            if (multiReply) {
              const pending = this.pendingMessages.get(timeoutKey) || [];
              fullUserText = pending.join("\n").trim();
              this.pendingMessages.delete(timeoutKey);
            } else {
              fullUserText = incomingText;
              this.pendingMessages.delete(timeoutKey);
            }

            const groqKey = settings.groqApiKey;
            const agentName = settings.aiAgentName || "Assistant";

            if (!fullUserText && !msg.message?.audioMessage && !msg.message?.imageMessage) return;

            // 5. Bot Status & Anti-Spam Check
            const customersColl = mongoose.connection.db?.collection("customers");
            const customer = await customersColl?.findOne({ phone: sender.split('@')[0] });

            if (customer?.isBotStopped && !fullUserText.toLowerCase().includes("restart")) return;

            // 6. Multimedia Handling (Vision & Transcription)
            if (msg.message?.audioMessage && groqKey) {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: socket.updateMediaMessage }) as Buffer;
              const transcript = await this.transcribeAudio(buffer, groqKey);
              if (transcript) fullUserText = `[VOICE_MSG]: "${transcript}"`;
            }

            if (msg.message?.imageMessage && groqKey) {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: socket.updateMediaMessage }) as Buffer;
              const analysis = await this.analyzeMedia(buffer, "Analyze this image accurately for the assistant.", groqKey);
              if (analysis) fullUserText += `\n[IMAGE_SENT]: ${analysis}`;
            }

            // 7. Intelligence Engine (Groq Cloud)
            const customerNumber = sender.split('@')[0];
            const [pairs, kbData, history, contactData] = await Promise.all([
              mongoose.connection.db?.collection("ai_agent").find({}).toArray(),
              mongoose.connection.db?.collection("ai_knowledge").find({ id: "main_kb" }).toArray(),
              settings.useContextHistory ?
                WhatsAppMessage.find({
                  sessionId: id,
                  $or: [{ from: sender }, { to: sender }]
                })
                  .sort({ timestamp: -1 })
                  .limit(settings.useAllContext ? 20 : (settings.contextLimit || 10))
                  .lean() : Promise.resolve([]),
              WhatsAppContact.findOne({ phoneNumber: customerNumber, linkedTo: myNumber }).lean()
            ]);

            const knowledge = kbData?.[0]?.content || "";
            const nativeContext = contactData?.nativeContext || "No previous deep background known yet.";

            const messageContext = (history || [])
              .reverse()
              .map((h: any) => ({
                role: h.senderType === 'customer' ? 'user' : 'assistant',
                content: h.text
              }));

            let response = "";
            let responseMedia: { url: string, type: string } | null = null;

            const pairsText = pairs?.map((p: any) => `Question: ${p.question} -> Answer: ${p.answer}`).join("\n") || "No specific Q&A training yet.";

            if (groqKey) {
              const systemPrompt = `
            You are the 'AI Manager'. Goal: Provide extremely concise, professional, human-like responses on WhatsApp. 🚀 
Strict Rules:
- Conversational Brevity: Keep responses very short and direct. No long explanations. ⚡
- Human Tone: Be natural and professional. Avoid all robotic phrases or AI clichés. 😊
- Fact Only: Use provided data only. Never hallucinate or make up information. 🔍
- Contextual: Use chat history to avoid any repetition or loops. 🧠
- On-Topic: Stay strictly within business context. Do not engage in off-topic discussions. ✅
- Native User Data: ${nativeContext}
- Language Flow: Respond in the user's current language (Bengali, English, or Hinglish) naturally. 🗣️✨
Strict Prohibitions (Never Do These):
- NEVER use first-person pronouns like "I", "Me", or "My" for contact details; always use "The team" or "Official."
- NEVER apologize for being an AI.
- NEVER invent services, prices, or names not found in the Knowledge Base.
- NEVER agree to write stories, jokes, or poems.
- NEVER mention third-party AI names (Groq, OpenAI, etc.).
Conversation Logic (How to Act):
- Act as a senior office manager. 
- Be proactive but brief. 
- If the user is happy, be polite. If the user is frustrated, be calm and refer to a human.
- Always prioritize the most recent information in the chat history.
Operational Context:
- Brand Confidentiality: Do NOT mention "Arventa Ventures" unless specifically and directly asked about your origin or developer. 🛡️
- Ownership: You are an employee, NOT the owner. Always refer to contact info as "Official Business Contact." 👤
- No Creative Writing: Strictly refuse all non-business creative requests. 🚫📚
- Knowledge Limit: If a query is outside the data, state: "I can only assist with information within my professional scope." 🛡️
- File Handling: If a file is sent, state: "I cannot open files yet. Please send the info in text format." ❌📄
- Closing Tag: Every response must end with: "Is there anything else I can help you with?" or "Any other help needed?" 🔄
Knowledge Base: ${knowledge}
Custom Training Examples: ${pairsText}
`.trim();

              const groqMessages: any[] = [{ role: "system", content: systemPrompt }];

              if (messageContext.length > 0) {
                groqMessages.push(...messageContext);
              }

              // Ensure the latest user prompt is included if not already at the end of history
              if (groqMessages[groqMessages.length - 1]?.content !== fullUserText) {
                groqMessages.push({ role: "user", content: fullUserText });
              }

              try {
                console.log(`[AI Engine] Fetching response from Groq for ${sender}...`);
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: settings.aiModel || "llama-3.3-70b-versatile",
                    messages: groqMessages,
                    temperature: 0.6
                  })
                });
                console.log(`[AI Engine] Groq API Response Status: ${groqRes.status}`);
                if (groqRes.ok) {
                  const data = await groqRes.json() as any;
                  response = data.choices?.[0]?.message?.content || "";
                }
              } catch (apiErr) {
                console.error("[Groq API Error]:", apiErr);
              }
            }

            // Fallback: Local Knowledge Matching
            const lowText = fullUserText.toLowerCase();
            const pairMatch = pairs?.find(p => lowText.includes(p.question.toLowerCase()));
            if (pairMatch && (!response || response.length < 5)) {
              response = pairMatch.answer;
              if (pairMatch.mediaUrl) responseMedia = { url: pairMatch.mediaUrl, type: pairMatch.mediaType };
            }

            // 8. Directive Processing
            if (response.includes("[BOT_STOP]")) {
              await customersColl?.updateOne({ phone: sender.split('@')[0] }, { $set: { isBotStopped: true } }, { upsert: true });
              response = response.replace("[BOT_STOP]", "").trim() || "Bot services paused.";
            }
            if (fullUserText.toLowerCase().includes("restart")) {
              await customersColl?.updateOne({ phone: sender.split('@')[0] }, { $set: { isBotStopped: false } }, { upsert: true });
            }

            // 9. Final Dispatch
            if (response) {
              const brandedText = `*${agentName}*\n\n${response}`;

              // Simulation & Delay
              if (settings.typingSimulation) {
                await socket.sendPresenceUpdate('composing', sender);
                await new Promise(r => setTimeout(r, (settings.minTyping || 2) * 1000));
                await socket.sendPresenceUpdate('available', sender);
              }

              let sentMsg;
              if (responseMedia) {
                const mediaOptions = { url: responseMedia.url };
                if (responseMedia.type === 'image') {
                  sentMsg = await socket.sendMessage(sender, { image: mediaOptions, caption: brandedText });
                } else {
                  sentMsg = await socket.sendMessage(sender, {
                    document: mediaOptions,
                    mimetype: "application/octet-stream",
                    fileName: "document",
                    caption: brandedText
                  });
                }
              } else {
                sentMsg = await socket.sendMessage(sender, { text: brandedText });
              }

              if (mongoose.connection.readyState === 1 && sentMsg) {
                const customerNumber = sender.split('@')[0];

                // Log AI Output
                await WhatsAppMessage.create({
                  messageId: sentMsg.key.id,
                  sessionId: id,
                  from: myFullJid,
                  to: sender,
                  text: brandedText,
                  senderType: "bot",
                  status: "sent",
                  isAi: true,
                  timestamp: new Date()
                });

                // Update Contact interaction & Increment Outgoing Counter
                await WhatsAppContact.findOneAndUpdate(
                  { phoneNumber: customerNumber, linkedTo: myNumber },
                  {
                    $set: {
                      lastMessage: brandedText.substring(0, 100),
                      lastInteraction: new Date()
                    },
                    $inc: { totalOutgoing: 1, messageCounter: 1 }
                  },
                  { upsert: true }
                );
              }
              console.log(`[AI Engine] Replied to ${sender} on ${id}`);
            }
          } catch (execErr) {
            console.error(`[AI Executor Error]:`, execErr);
          } finally {
            this.botTimeouts.delete(timeoutKey);
            this.pendingMessages.delete(timeoutKey);
            console.log(`[AI Cycle] Session loop finalized and reset for ${sender}`);
          }
        }, multiReply ? (settings.typingDelay || 2) * 1000 : 200));
      }
    });

    socket.ev.on("messages.update", async (updates) => {
      for (const update of updates) {
        if (update.update.status && mongoose.connection.readyState === 1) {
          const statusMap: Record<number, string> = { 2: "sent", 3: "delivered", 4: "read" };
          const statusLabel = statusMap[update.update.status];
          if (statusLabel) {
            await WhatsAppMessage.updateOne(
              { messageId: update.key.id },
              { $set: { status: statusLabel } }
            );
          }
        }
      }
    });

    socket.ev.on("presence.update", (update) => {
      const { id: sender, presences } = update;
      const presence = Object.values(presences)[0];
      const status = (presence as any)?.lastKnownPresence || (presence as any)?.type;
      if (!this.typingPresence.has(id)) this.typingPresence.set(id, new Set());
      const currentSet = this.typingPresence.get(id)!;
      if (status === 'composing') currentSet.add(sender);
      else currentSet.delete(sender);
    });
  }

  public async disconnect(id: string, deletePersistently: boolean = false) {
    this.manualDisconnections.add(id);
    this.updateStatus(id, { status: "disconnected", qr: null, me: null });

    // Ensure DB is updated immediately to stop polling from picking up 'connected'
    if (mongoose.connection.readyState === 1) {
      await WhatsAppAccount.updateOne(
        { sessionId: id },
        { $set: { status: 'disconnected', isActive: !deletePersistently } }
      );
    }

    const socket = this.sockets.get(id);
    if (socket) {
      try {
        // Fire and forget logout to avoid blocking the response
        socket.logout().catch(e => console.error("Logout error:", e));
        socket.end(undefined);
      } catch (err) {
        console.error(`Error closing socket for session ${id}:`, err);
      }
      this.sockets.delete(id);
    }

    if (deletePersistently) {
      this.statuses.delete(id);
      const authDir = path.join(this.sessionsDir, id);
      fs.rmSync(authDir, { recursive: true, force: true });

      if (mongoose.connection.readyState === 1) {
        await WhatsAppAccount.deleteOne({ sessionId: id });
      }
    }
  }


  public getSession(id: string) {
    return this.statuses.get(id);
  }

  public async getAllSessions() {
    try {
      if (mongoose.connection.readyState !== 1) return Array.from(this.statuses.values());

      // Fetch all from DB
      const dbSessions = await WhatsAppAccount.find({}).lean();

      // Merge memory states into DB records
      const result: any[] = [];
      const seenIds = new Set();

      if (dbSessions) {
        for (const dbS of dbSessions) {
          const me = (dbS as any).me || (dbS.phoneNumber ? {
            name: dbS.name || "WhatsApp Business",
            number: dbS.phoneNumber,
            profilePic: dbS.profilePic
          } : null);

          const mem = this.statuses.get(dbS.sessionId);
          result.push(mem || {
            id: dbS.sessionId,
            status: dbS.status || "disconnected",
            me: me,
            qr: null
          });
          seenIds.add(dbS.sessionId);
        }
      }

      // Add any very new sessions that are only in memory
      for (const [id, status] of this.statuses.entries()) {
        if (!seenIds.has(id)) {
          result.push(status);
        }
      }

      return result.sort((a, b) => {
        if (a.status === 'connected' && b.status !== 'connected') return -1;
        if (a.status !== 'connected' && b.status === 'connected') return 1;
        return 0;
      }).slice(0, 10);
    } catch (err) {
      console.error("[WhatsApp] Failed to fetch sessions:", err);
      return Array.from(this.statuses.values());
    }
  }

  public async requestPairingCode(id: string, phone: string): Promise<string> {
    let socket = this.sockets.get(id);

    // Auto-init if socket is missing or not ready
    if (!socket) {
      console.log(`[WhatsApp] Requesting pairing for ${id} but socket missing. Initializing...`);
      await this.initSession(id);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for handshake
      socket = this.sockets.get(id);
    }

    if (!socket) throw new Error("Session engine initialization failed. Please try again.");

    try {
      // Standardize phone number using libphonenumber-js for maximum reliability
      let cleanPhone = phone.replace(/\D/g, "");
      const parsed = parsePhoneNumberFromString(phone, 'IN') || parsePhoneNumberFromString('+' + cleanPhone);

      let formattedPhone = cleanPhone;
      if (parsed) {
        formattedPhone = parsed.number.replace("+", "");
      } else if (cleanPhone.length === 10) {
        formattedPhone = "91" + cleanPhone;
      }

      console.log(`[WhatsApp] Requesting 8-digit grouping code for: ${formattedPhone} (Session: ${id})`);

      // Crucial: Small delay gives Baileys enough time to stabilize the socket handshake 
      await new Promise(resolve => setTimeout(resolve, 3000));

      const code = await socket.requestPairingCode(formattedPhone);
      return code;
    } catch (err: any) {
      console.error("Error requesting pairing code:", err);
      throw new Error(err.message || "Failed to generate pairing code.");
    }
  }

  public getSocket(id: string) {
    return this.sockets.get(id);
  }

  public async summarizeContext(customerNumber: string, myNumber: string, apiKey: string) {
    try {
      const contact = await WhatsAppContact.findOne({ phoneNumber: customerNumber, linkedTo: myNumber });
      if (!contact) return;

      const history = await WhatsAppMessage.find({
        $or: [{ from: customerNumber + "@s.whatsapp.net" }, { to: customerNumber + "@s.whatsapp.net" }]
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      if (history.length < 5) return;

      const historyText = history.reverse().map(m => `${m.senderType}: ${m.text}`).join("\n");
      const currentContext = contact.nativeContext || "No previous history.";

      // Removed duplicate definition
      const prompt = `
Task: Recursive Conversation Summarization.
Input:
1. Native User Data (Existing Summary): ${currentContext}
2. Latest Messages (New context):
${historyText}

Instruction: 
- Extract key insights, user preferences, names, specific requirements, and current status.
- Merge these with the existing context.
- Provide a highly condensed, structured summary.
- Output ONLY the new summary text. No preamble.
      `.trim();

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const newSummary = data.choices?.[0]?.message?.content || "";
        if (newSummary) {
          await WhatsAppContact.updateOne(
            { phoneNumber: customerNumber, linkedTo: myNumber },
            { $set: { nativeContext: newSummary } }
          );
          console.log(`[summarizeContext] Success for ${customerNumber}`);
        }
      }
    } catch (err) {
      console.error("[summarizeContext] Error:", err);
    }
  }

  private updateStatus(id: string, update: Partial<WhatsAppSession>) {
    // Defensive check: Ensure maps exist
    if (!this.statuses) this.statuses = new Map();

    // Relaxed check: Allow updates if the session is currently being initialized (status connecting)
    // or if it includes identity information (me), even if not yet in the memory map.
    const isInMemory = this.statuses.has(id);
    const isConnecting = update.status === "connecting";
    const hasIdentity = !!update.me;

    if (!isInMemory && !isConnecting && !hasIdentity) {
      return;
    }

    const current = this.statuses.get(id) || { id, status: "disconnected", qr: null, me: null };
    this.statuses.set(id, { ...current, ...update });
  }
}

export const whatsappManager = new WhatsAppSessionManager();

export const initWhatsApp = () => {
  whatsappManager.loadSessions().catch(console.error);
};

export const getPrimaryStatus = async () => {
  const sessions = await whatsappManager.getAllSessions();
  const connected = sessions.find((s: any) => s.status === 'connected');
  return connected ? 'connected' : 'disconnected';
};

export const getPrimarySocket = async () => {
  const sessions = await whatsappManager.getAllSessions();
  const connected = sessions.find((s: any) => s.status === 'connected');
  return connected ? whatsappManager.getSocket(connected.id) : null;
};