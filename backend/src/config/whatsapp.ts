import pkg, { type Client as ClientType } from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode";
import mongoose from "mongoose";

// Helper for formatting WhatsApp numbers explicitly for India if 10 digits
export const formatPhoneForWhatsApp = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return `${cleaned}@c.us`;
};

// WhatsApp Client Initialization
export let whatsappStatus: "disconnected" | "connecting" | "connected" = "disconnected";
export let whatsappQR: string | null = null;
export let whatsappClient: ClientType | null = null;

export const initWhatsApp = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--disable-gpu"]
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  whatsappClient.on("qr", async (qr) => {
    console.log("WhatsApp QR Received");
    whatsappStatus = "connecting";
    try {
      whatsappQR = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error("Error generating QR code:", err);
    }
  });

  whatsappClient.on("ready", async () => {
    console.log("WhatsApp Client is ready!");
    whatsappStatus = "connected";
    whatsappQR = null;
    
    // Update DB settings
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: { whatsappConnected: true } },
        { upsert: true }
      );
    }
  });

  whatsappClient.on("authenticated", () => {
    console.log("WhatsApp Authenticated");
  });

  whatsappClient.on("auth_failure", (msg) => {
    console.error("WhatsApp Auth Failure:", msg);
    whatsappStatus = "disconnected";
    whatsappQR = null;
  });

  whatsappClient.on("disconnected", async (reason) => {
    console.log("WhatsApp Disconnected:", reason);
    whatsappStatus = "disconnected";
    whatsappQR = null;
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: { whatsappConnected: false } },
        { upsert: true }
      );
    }
  });

  try {
    whatsappClient.initialize().catch(err => {
      console.error("Failed to initialize WhatsApp Client:", err);
      whatsappStatus = "disconnected";
    });
  } catch (err) {
    console.error("WhatsApp initialization error:", err);
  }
};
