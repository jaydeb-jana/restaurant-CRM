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


const logger = pino({ level: "silent" });

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
  private stopFlags: Map<string, Set<string>> = new Map();
  private botTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pendingMessages: Map<string, string[]> = new Map();
  private primarySessionId: string = "primary";
  private sessionsDir = path.join(process.cwd(), "whatsapp_sessions_auth");

  constructor() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  public async loadSessions() {
    if (mongoose.connection.readyState !== 1) return;
    try {
      const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
      if (settings?.primaryWhatsAppId) {
        this.primarySessionId = settings.primaryWhatsAppId;
      }

      const savedSessions = await mongoose.connection.db?.collection("whatsapp_sessions").find({}).toArray();

      // Ensure primary session is always in statuses
      this.updateStatus(this.primarySessionId, { id: this.primarySessionId, status: "disconnected", qr: null, me: null });

      if (savedSessions) {
        for (const s of savedSessions) {
          this.updateStatus(s.sessionId, { id: s.sessionId, status: "disconnected", qr: null, me: s.me || null });

          // Auto-start sessions that were previously connected or the primary session
          if (s.me || s.sessionId === this.primarySessionId) {
            console.log(`Auto-starting session: ${s.sessionId}`);
            this.initSession(s.sessionId).catch(err => console.error(`Failed to auto-start ${s.sessionId}:`, err));
          }
        }
      }
    } catch (err) {
      console.error("Error loading WhatsApp sessions:", err);
    }
  }

  public async setPrimary(id: string) {
    this.primarySessionId = id;
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: { primaryWhatsAppId: id } },
        { upsert: true }
      );
    }
  }

  private async transcribeAudio(buffer: Buffer, apiKey: string): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'audio/mp4' });
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
    if (this.sockets.has(id)) return;
    if (this.statuses.get(id)?.status === "connecting") return;

    this.updateStatus(id, { id, status: "connecting", qr: null, me: null });

    const authDir = path.join(this.sessionsDir, id);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
    });

    this.sockets.set(id, socket);

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) this.updateStatus(id, { qr: qr, status: "connecting" });

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Session ${id} closed. Reconnecting: ${shouldReconnect}`);

        this.updateStatus(id, { status: "disconnected", qr: null });
        this.sockets.delete(id);

        if (shouldReconnect) {
          this.initSession(id);
        } else {
          if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db?.collection("whatsapp_sessions").updateOne(
              { sessionId: id },
              { $set: { me: null } }
            );
          }
          fs.rmSync(authDir, { recursive: true, force: true });
          this.updateStatus(id, { me: null, status: "disconnected" });
        }
      } else if (connection === "open") {
        console.log(`[WhatsApp] Session ${id} connected successfully.`);
        const user = socket.user!;
        const me: any = {
          name: user.name || "Business Account",
          number: user.id.split(":")[0] || ""
        };

        try {
          const ppUrl = await socket.profilePictureUrl(user.id);
          if (ppUrl) me.profilePic = ppUrl;
        } catch (e) {}

        this.updateStatus(id, { status: "connected", qr: null, me });

        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db?.collection("whatsapp_sessions").updateOne(
            { sessionId: id },
            { $set: { sessionId: id, lastSeen: new Date(), me } },
            { upsert: true }
          );
        }
      }
    });

    // Integrated Listener: Logging + AI Orchestration
    socket.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const sender = msg.key.remoteJid;
        if (!sender) continue;

        // 1. Data Capture
        const incomingText = msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || 
                             msg.message?.imageMessage?.caption || "";
        
        const session = this.getSession(id);
        const myNumber = session?.me?.number || id;
        
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db?.collection("whatsapp_messages").insertOne({
            messageId: msg.key.id,
            sessionId: id,
            fromNumber: sender, 
            toNumber: myNumber,
            fromMe: false,
            text: incomingText,
            status: "delivered",
            timestamp: new Date()
          });
        }

        // 2. AI Intelligence Gatekeeping
        if (sender.endsWith("@g.us")) continue; // Skip Groups

        const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
        if (!settings || !settings.globalAiActive) continue;
        
        const activeSessions = settings.activeBotSessions || [];
        if (!activeSessions.includes(id)) {
          console.log(`[Bot] Skipping ${sender}: Session ${id} is not enabled for AI.`);
          continue;
        }

        // 3. Accumulation & Debounce
        const timeoutKey = `${id}:${sender}`;
        if (incomingText) {
          const currentPending = this.pendingMessages.get(timeoutKey) || [];
          currentPending.push(incomingText);
          this.pendingMessages.set(timeoutKey, currentPending);
        }

        if (this.botTimeouts.has(timeoutKey)) clearTimeout(this.botTimeouts.get(timeoutKey)!);

        this.botTimeouts.set(timeoutKey, setTimeout(async () => {
          try {
            // Safety: Max 15s wait for typing presence
            let retry = 0;
            while (this.typingPresence.get(id)?.has(sender) && retry < 15) {
              await new Promise(r => setTimeout(r, 1000));
              retry++;
            }

            // 4. Input Processing
            const multiReply = settings.multiMessageReply ?? true;
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
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger }) as Buffer;
              const transcript = await this.transcribeAudio(buffer, groqKey);
              if (transcript) fullUserText = `[VOICE_MSG]: "${transcript}"`;
            }

            if (msg.message?.imageMessage && groqKey) {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger }) as Buffer;
              const analysis = await this.analyzeMedia(buffer, "Analyze this image accurately for the assistant.", groqKey);
              if (analysis) fullUserText += `\n[IMAGE_SENT]: ${analysis}`;
            }

            // 7. Intelligence Engine (Groq Cloud)
            const [pairs, kbData] = await Promise.all([
              mongoose.connection.db?.collection("ai_agent").find({}).toArray(),
              mongoose.connection.db?.collection("ai_knowledge").find({ id: "main_kb" }).toArray()
            ]);

            const knowledge = kbData?.[0]?.content || "";
            let response = "";
            let responseMedia: { url: string, type: string } | null = null;

            if (groqKey) {
              const systemPrompt = `Role: ${agentName} (Professional Assistant). Knowledge: ${knowledge}. Rules: Be concise. If user asks to stop, include [BOT_STOP].`;
              try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: settings.aiModel || "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: fullUserText }],
                    temperature: 0.6
                  })
                });
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
              const brandedText = `[*${agentName}*]\n\n${response}`;

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
                await mongoose.connection.db?.collection("whatsapp_messages").insertOne({
                  messageId: sentMsg.key.id,
                  sessionId: id,
                  fromNumber: myNumber,
                  toNumber: sender,
                  fromMe: true,
                  text: brandedText,
                  status: "sent",
                  isAi: true,
                  timestamp: new Date()
                });
              }
              console.log(`[AI Engine] Replied to ${sender} on ${id}`);
            }
          } catch (execErr) {
            console.error(`[AI Executor Error]:`, execErr);
          }
        }, (settings.typingDelay || 2) * 1000));
      }
    });

    socket.ev.on("messages.update", async (updates) => {
      for (const update of updates) {
        if (update.update.status && mongoose.connection.readyState === 1) {
          const statusMap: Record<number, string> = { 2: "sent", 3: "delivered", 4: "read" };
          const statusLabel = statusMap[update.update.status];
          if (statusLabel) {
            await mongoose.connection.db?.collection("whatsapp_messages").updateOne(
              { messageId: update.key.id },
              { $set: { status: statusLabel, lastUpdate: new Date() } }
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
    const socket = this.sockets.get(id);
    if (socket) {
      try {
        await socket.logout();
        socket.end(undefined);
      } catch (err) {
        console.error(`Error disconnecting session ${id}:`, err);
      }
      this.sockets.delete(id);
      this.updateStatus(id, { status: "disconnected", qr: null, me: null });
    }

    if (deletePersistently) {
      this.statuses.delete(id);
      const authDir = path.join(this.sessionsDir, id);
      fs.rmSync(authDir, { recursive: true, force: true });

      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.collection("whatsapp_sessions").deleteOne({ sessionId: id });
        if (this.primarySessionId === id) {
          this.primarySessionId = "primary";
          await this.setPrimary("primary");
        }
      }
    }
  }

  public async registerSession(id: string) {
    this.updateStatus(id, { id, status: "disconnected", qr: null, me: null });
    // Persist to DB so it survives restarts/reloads
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("whatsapp_sessions").updateOne(
        { sessionId: id },
        { $set: { sessionId: id, status: "disconnected", createdAt: new Date() } },
        { upsert: true }
      );
    }
  }

  public getSession(id: string) {
    return this.statuses.get(id);
  }

  public getAllSessions() {
    return Array.from(this.statuses.values()).filter(s => {
      if (s.status === "connected" || s.status === "connecting") return true;
      if (s.me) return true;
      if (s.id === this.primarySessionId) return true;
      // Allow idle disconnected sessions to persist if they were explicitly registered
      const hasStatusInMap = this.statuses.has(s.id);
      return hasStatusInMap;
    });
  }

  public async requestPairingCode(id: string, phone: string): Promise<string> {
    const socket = this.sockets.get(id);
    if (!socket) throw new Error("Session is not ready. Please try connecting again.");

    try {
      // Standardize phone number using libphonenumber-js for maximum reliability
      let cleanPhone = phone.replace(/\D/g, "");
      const parsed = parsePhoneNumberFromString(phone, 'IN') || parsePhoneNumberFromString('+' + cleanPhone);

      let formattedPhone = cleanPhone;
      if (parsed) {
        formattedPhone = parsed.number.replace("+", ""); // international format without +
      } else if (cleanPhone.length === 10) {
        formattedPhone = "91" + cleanPhone;
      }

      console.log(`[WhatsApp] Requesting pairing code for ${formattedPhone} on session ${id}`);

      // Crucial: Small delay gives Baileys enough time to stabilize the socket handshake 
      // before sending the pairing code request.
      await new Promise(resolve => setTimeout(resolve, 2000));

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

  public getPrimaryId() {
    return this.primarySessionId;
  }

  private updateStatus(id: string, update: Partial<WhatsAppSession>) {
    const current = this.statuses.get(id) || { id, status: "disconnected", qr: null, me: null };
    this.statuses.set(id, { ...current, ...update });
  }
}

export const whatsappManager = new WhatsAppSessionManager();

export const initWhatsApp = () => {
  whatsappManager.loadSessions().catch(console.error);
};

export const getPrimaryStatus = () => whatsappManager.getSession(whatsappManager.getPrimaryId())?.status || "disconnected";
export const getPrimarySocket = () => whatsappManager.getSocket(whatsappManager.getPrimaryId());
