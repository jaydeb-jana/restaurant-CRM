import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
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
  } | null;
}

class WhatsAppSessionManager {
  private statuses: Map<string, WhatsAppSession> = new Map();
  private typingPresence: Map<string, Set<string>> = new Map();
  private stopFlags: Map<string, Set<string>> = new Map(); 
  private botTimeouts: Map<string, NodeJS.Timeout> = new Map();
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
      
      if (savedSessions) {
        for (const s of savedSessions) {
          this.updateStatus(s.sessionId, { id: s.sessionId, status: "disconnected", qr: null, me: s.me || null });
        }
      }

      if (this.primarySessionId && this.statuses.has(this.primarySessionId)) {
        console.log(`Starting primary WhatsApp session: ${this.primarySessionId}`);
        this.initSession(this.primarySessionId).catch(console.error);
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
    // SINGLE ACTIVE SESSION RULE (Optional, keeping as per original logic)
    // for (const [existingId, socket] of this.sockets.entries()) {
    //   if (existingId !== id) {
    //      await this.disconnect(existingId, false);
    //   }
    // }

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

      if (qr) {
        this.updateStatus(id, { qr: qr, status: "connecting" });
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`WhatsApp Session ${id} connection closed. Reconnecting: ${shouldReconnect}`);
        
        this.updateStatus(id, { status: "disconnected", qr: null });
        this.sockets.delete(id);

        if (shouldReconnect) {
          this.initSession(id);
        } else {
            if (mongoose.connection.readyState === 1 && id === this.primarySessionId) {
                await mongoose.connection.db?.collection("settings").updateOne(
                  { id: "app-settings" },
                  { $set: { whatsappConnected: false } },
                  { upsert: true }
                );
            }
            // Cleanup auth dir
            fs.rmSync(authDir, { recursive: true, force: true });
        }
      } else if (connection === "open") {
        console.log(`WhatsApp Session ${id} is ready!`);
        const user = socket.user!;
        const me = {
          name: user.name || "Business Account",
          number: user.id.split(":")[0] || ""
        };
        
        this.updateStatus(id, { status: "connected", qr: null, me });

        if (mongoose.connection.readyState === 1) {
            if (id === this.primarySessionId) {
              await mongoose.connection.db?.collection("settings").updateOne(
                { id: "app-settings" },
                { $set: { whatsappConnected: true } },
                { upsert: true }
              );
            }
            
            await mongoose.connection.db?.collection("whatsapp_sessions").updateOne(
              { sessionId: id },
              { $set: { sessionId: id, lastSeen: new Date(), me } },
              { upsert: true }
            );
        }
      }
    });

    // Integrated Advanced AI Intelligence Listener (Final Master Logic)
    socket.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;
      
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const sender = msg.key.remoteJid;
        if (!sender || sender.endsWith("@g.us")) continue; 

        // Debounce Logic: Wait for user to finish typing/sending messages
        const timeoutKey = `${id}:${sender}`;
        if (this.botTimeouts.has(timeoutKey)) clearTimeout(this.botTimeouts.get(timeoutKey)!);

        this.botTimeouts.set(timeoutKey, setTimeout(async () => {
          try {
            // 1. Fetch Integration Protocols
            const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
            if (!settings) return;

            const activeSessions = settings.activeBotSessions || [];
            if (!activeSessions.includes(id)) return;

            // 2. Wait while typing (Typing Interruption logic)
            while(this.typingPresence.get(id)?.has(sender)) {
               await new Promise(r => setTimeout(r, 1000));
            }

            // 3. Media & Text Extraction
            let text = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || 
                       msg.message?.videoMessage?.caption || 
                       "";
            
            const groqKey = settings.groqApiKey;
            const agentName = settings.aiAgentName || "AI Assistant";
            
            // Check for Voice transcription
            if (msg.message?.audioMessage && groqKey) {
              const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reauthoriseNetworkQueries: true }) as Buffer;
              console.log(`[Bot] Transcribing voice from ${sender}...`);
              const transcript = await this.transcribeAudio(buffer, groqKey);
              if (transcript) text = `[USER SENT VOICE MESSAGE]: "${transcript}" (Note: This is a transcription, ignore typos)`;
            }

            // Check for Image Vision Analysis
            if (msg.message?.imageMessage && groqKey) {
               const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reauthoriseNetworkQueries: true }) as Buffer;
               console.log(`[Bot] Analyzing image from ${sender}...`);
               const analysis = await this.analyzeMedia(buffer, "What is in this image? Provide details for the assistant.", groqKey);
               if (analysis) text += `\n[USER SENT IMAGE]: Description: ${analysis}`;
            }

            if (!text && !msg.message?.imageMessage && !msg.message?.audioMessage) return;

            // 4. Stop/Start Logic (Anti-Spam)
            const customersColl = mongoose.connection.db?.collection("customers");
            const customer = await customersColl?.findOne({ phone: sender.split('@')[0] });
            
            if (customer?.isBotStopped && !text.toLowerCase().includes("restart") && !text.toLowerCase().includes("help")) {
              console.log(`[Bot] Bot is STOPPED for ${sender}. Skipping recursive reply.`);
              return;
            }

            // 5. Intelligence Fetch
            const [pairs, kbData] = await Promise.all([
              mongoose.connection.db?.collection("ai_agent").find({}).toArray(),
              mongoose.connection.db?.collection("ai_knowledge").find({ id: "main_kb" }).toArray()
            ]);

            const knowledge = kbData?.[0]?.content || "";
            let response = "";
            let responseMedia: { url: string, type: string } | null = null;

            // 6. Branch: Groq LLM (Primary)
            if (groqKey) {
              const systemPrompt = `
You are ${agentName}, a highly professional AI business assistant.
IDENTITY: You represent the business. Be polite, helpful, and concise.
STOP_COMMAND: If the user says they don't want to chat, say "STOPPED_MESSAGE" or stay very quiet.

KNOWLEDGE BASE:
${knowledge}

TRAINING PAIRS (Highest Priority):
${pairs?.map(p => `Q: ${p.question} -> A: ${p.answer}`).join('\n')}

INSTRUCTIONS:
- If use says "stop", "don't message me", etc, include the tag [BOT_STOP] in your response.
- If user sends voice/image, it will be prefixed with [USER SENT...]. Use that context.
- Keep responses suitable for WhatsApp (Emojis OK).
`;

              const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                      model: settings.aiModel || "llama3-8b-8192",
                      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
                      temperature: 0.7
                  })
              });

              if (groqRes.ok) {
                const data = await groqRes.json();
                response = data.choices?.[0]?.message?.content;
              }
            }

            // 7. Fallback: Local Matching (And handle Media response)
            const lowText = text.toLowerCase();
            const pairMatch = pairs?.find(p => lowText.includes(p.question.toLowerCase()) || p.question.toLowerCase().includes(lowText));
            
            if (pairMatch && (!response || response.length < 5)) {
              response = pairMatch.answer;
              if (pairMatch.mediaUrl) responseMedia = { url: pairMatch.mediaUrl, type: pairMatch.mediaType };
            }

            // 8. Processing Bot Directives (Stop/Restart)
            if (response?.includes("[BOT_STOP]")) {
               await customersColl?.updateOne({ phone: sender.split('@')[0] }, { $set: { isBotStopped: true } }, { upsert: true });
               response = response.replace("[BOT_STOP]", "").trim() || "Bot services suspended. Reply 'Restart' to reactivate.";
            }
            if (text.toLowerCase().includes("restart") || text.toLowerCase().includes("start bot")) {
               await customersColl?.updateOne({ phone: sender.split('@')[0] }, { $set: { isBotStopped: false } }, { upsert: true });
            }

            // 9. Dispatch with Randomized/Instant Delay
            if (response) {
              const brandedResponse = `[*${agentName}*]\n\n${response}`;
              
              // Internal Delay Logic
              const minDelay = settings.minDelay || 1;
              const maxDelay = settings.maxDelay || 3;
              const isRandom = settings.isRandomDelay ?? true;
              
              const waitMs = isRandom ? (Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay) * 1000 : 0;
              if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));

              if (responseMedia) {
                if (responseMedia.type === 'image') {
                   await socket.sendMessage(sender, { image: { url: responseMedia.url }, caption: brandedResponse });
                } else {
                   await socket.sendMessage(sender, { document: { url: responseMedia.url }, fileName: "attachment", caption: brandedResponse });
                }
              } else {
                await socket.sendMessage(sender, { text: brandedResponse });
              }
              console.log(`[AI Engine] Replied to ${sender} on session ${id}.`);
            }

          } catch (err) {
            console.error(`[AI Error] ${id}:`, err);
          }
        }, (settings.typingDelay || 2) * 1000));

      }
    });

    this.sockets.set(id, socket);
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
