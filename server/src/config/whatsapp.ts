import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidDecode,
    WAMessageStubType,
    WASocket,
    proto,
    delay
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

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
  private sockets: Map<string, WASocket> = new Map();
  private statuses: Map<string, WhatsAppSession> = new Map();
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

      if (this.primarySessionId) {
        console.log(`Starting primary WhatsApp session: ${this.primarySessionId}`);
        this.initSession(this.primarySessionId).catch(console.error);
      }
    } catch (err) {
      console.error("Error loading WhatsApp sessions:", err);
      this.initSession("primary").catch(console.error);
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
      browser: ["Spice Kraft", "Chrome", "1.0.0"],
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

  public getSession(id: string) {
    return this.statuses.get(id);
  }

  public getAllSessions() {
    return Array.from(this.statuses.values()).filter(s => {
      if (s.status === "connected" || s.status === "connecting") return true;
      if (s.me) return true;
      if (s.id === this.primarySessionId) return true;
      return false;
    });
  }

  public async requestPairingCode(id: string, phone: string): Promise<string> {
    const socket = this.sockets.get(id);
    if (!socket) throw new Error("Session is not ready. Please try connecting again.");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) throw new Error("Invalid phone number format.");

    try {
      // Ensure phone has country code for pairing code
      let formattedPhone = cleanPhone;
      if (formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone;
      }
      
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
