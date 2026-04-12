import { whatsappManager, formatPhoneForWhatsApp } from "../config/whatsapp";
import mongoose from "mongoose";

export class WhatsAppService {
  static async getStatus() {
    const sessions = whatsappManager.getAllSessions();
    const primaryId = whatsappManager.getPrimaryId();
    return { sessions, primaryId };
  }

  static async requestPairingCode(sessionId: string, phone: string) {
    return await whatsappManager.requestPairingCode(sessionId, phone);
  }

  static async sendTestMessage(phone: string, message: string, sessionId: string, media?: any) {
    const id = sessionId || "primary";
    const socket = whatsappManager.getSocket(id);
    const session = whatsappManager.getSession(id);

    if (!socket || !session || session.status !== "connected") {
      throw new Error(`WhatsApp session ${id} not connected`);
    }

    const chatId = formatPhoneForWhatsApp(phone);
    
    if (media && media.data) {
      const buffer = Buffer.from(media.data, "base64");
      const type = media.mimetype.split('/')[0];
      
      let messageContent: any = {};
      if (type === "image") messageContent = { image: buffer, caption: message };
      else if (type === "video") messageContent = { video: buffer, caption: message };
      else if (type === "audio") messageContent = { audio: buffer, caption: message };
      else messageContent = { document: buffer, mimetype: media.mimetype, fileName: media.filename || "file", caption: message };

      await socket.sendMessage(chatId, messageContent);
    } else {
      await socket.sendMessage(chatId, { text: message });
    }
    return { success: true };
  }

  static async bulkSend(phones: string[], message: string, sessionId: string, media?: any, delayMs: number = 1000) {
    const id = sessionId || "primary";
    const socket = whatsappManager.getSocket(id);
    const session = whatsappManager.getSession(id);

    if (!socket || !session || session.status !== "connected") {
      throw new Error(`WhatsApp session ${id} not connected`);
    }

    const results = [];
    let mediaContent: any = null;

    if (media && media.data) {
      const buffer = Buffer.from(media.data, "base64");
      const type = media.mimetype.split('/')[0];
      if (type === "image") mediaContent = { image: buffer, caption: message };
      else if (type === "video") mediaContent = { video: buffer, caption: message };
      else if (type === "audio") mediaContent = { audio: buffer, caption: message };
      else mediaContent = { document: buffer, mimetype: media.mimetype, fileName: media.filename || "file", caption: message };
    }

    for (const phone of phones) {
      try {
        const chatId = formatPhoneForWhatsApp(phone);
        if (mediaContent) {
          await socket.sendMessage(chatId, mediaContent);
        } else {
          await socket.sendMessage(chatId, { text: message });
        }
        results.push({ phone, status: "success" });
      } catch (e: any) {
        results.push({ phone, status: "failed", error: e.message });
      }
      
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return results;
  }

  static async getCustomers() {
    const customers = await mongoose.connection.db?.collection("customers").find({}).sort({ createdAt: -1 }).toArray();
    return customers?.map(doc => {
      const { _id, ...rest } = doc;
      return rest;
    }) || [];
  }
}
