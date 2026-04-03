import * as WWebJS from "whatsapp-web.js";
const { Client, LocalAuth } = (WWebJS as any).default || WWebJS;
import type { Client as ClientType } from "whatsapp-web.js";
import qrcode from "qrcode";
import mongoose from "mongoose";

// Helper for formatting WhatsApp numbers explicitly for India if 10 digits
export const formatPhoneForWhatsApp = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return `${cleaned}@c.us`;
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
  private clients: Map<string, ClientType> = new Map();
  private statuses: Map<string, WhatsAppSession> = new Map();
  private primarySessionId: string = "primary";

  constructor() {}

  public async loadSessions() {
    if (mongoose.connection.readyState !== 1) return;
    try {
      // Load primary session ID from settings
      const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
      if (settings?.primaryWhatsAppId) {
        this.primarySessionId = settings.primaryWhatsAppId;
      }

      const savedSessions = await mongoose.connection.db?.collection("whatsapp_sessions").find({}).toArray();
      
      // Initialize statuses for all saved sessions as disconnected
      if (savedSessions) {
        for (const s of savedSessions) {
          this.updateStatus(s.sessionId, { id: s.sessionId, status: "disconnected", qr: null, me: s.me || null });
        }
      }

      // Automatically start the primary session if it exists
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
    // SINGLE ACTIVE SESSION RULE: Disconnect others first
    for (const [existingId, client] of this.clients.entries()) {
      if (existingId !== id) {
        console.log(`Stopping session ${existingId} to start ${id}`);
        await this.disconnect(existingId, false);
      }
    }

    if (this.clients.has(id)) return;
    if (this.clients.size >= 10) throw new Error("Maximum 10 WhatsApp sessions allowed.");

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: id }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--disable-gpu"]
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    this.updateStatus(id, { id, status: "connecting", qr: null, me: null });

    client.on("qr", async (qr) => {
      console.log(`WhatsApp QR Received for session: ${id}`);
      this.updateStatus(id, { qr: await qrcode.toDataURL(qr), status: "connecting" });
    });

    client.on("ready", async () => {
      console.log(`WhatsApp Session ${id} is ready!`);
      const me = {
        name: (client.info as any).pushname || "Business Account",
        number: (client.info as any).wid?.user || ""
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
    });

    client.on("authenticated", () => {
      console.log(`WhatsApp Session ${id} Authenticated`);
    });

    client.on("auth_failure", (msg) => {
      console.error(`WhatsApp Session ${id} Auth Failure:`, msg);
      this.updateStatus(id, { status: "disconnected", qr: null });
    });

    client.on("disconnected", async (reason) => {
      console.log(`WhatsApp Session ${id} Disconnected:`, reason);
      this.updateStatus(id, { status: "disconnected", qr: null, me: null });
      this.clients.delete(id);
      
      if (mongoose.connection.readyState === 1 && id === this.primarySessionId) {
        await mongoose.connection.db?.collection("settings").updateOne(
          { id: "app-settings" },
          { $set: { whatsappConnected: false } },
          { upsert: true }
        );
      }
    });

    this.clients.set(id, client);
    client.initialize().catch(err => {
      console.error(`Failed to initialize session ${id}:`, err);
      this.updateStatus(id, { status: "disconnected" });
      this.clients.delete(id);
    });
  }

  public async disconnect(id: string, deletePersistently: boolean = false) {
    const client = this.clients.get(id);
    if (client) {
      try {
        await client.logout();
        await client.destroy();
      } catch (err) {
        console.error(`Error disconnecting session ${id}:`, err);
      }
      this.clients.delete(id);
      this.updateStatus(id, { status: "disconnected", qr: null, me: null });
    }

    if (deletePersistently && mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("whatsapp_sessions").deleteOne({ sessionId: id });
      if (this.primarySessionId === id) {
          this.primarySessionId = "primary";
          await this.setPrimary("primary");
      }
    }
  }

  public getSession(id: string) {
    return this.statuses.get(id);
  }

  public getAllSessions() {
    return Array.from(this.statuses.values());
  }

  public getClient(id: string) {
    return this.clients.get(id);
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

// Common exports for compatibility (aliased to dynamic primary session)
export const getPrimaryStatus = () => whatsappManager.getSession(whatsappManager.getPrimaryId())?.status || "disconnected";
export const getPrimaryClient = () => whatsappManager.getClient(whatsappManager.getPrimaryId());

