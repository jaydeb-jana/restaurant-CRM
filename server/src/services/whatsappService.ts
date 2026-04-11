import { whatsappManager, formatPhoneForWhatsApp, MessageMedia } from "../config/whatsapp";
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
    const client = whatsappManager.getClient(id);
    const session = whatsappManager.getSession(id);

    if (!client || !session || session.status !== "connected") {
      throw new Error(`WhatsApp session ${id} not connected`);
    }

    const chatId = formatPhoneForWhatsApp(phone);
    if (media && media.data) {
      const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
      await client.sendMessage(chatId, messageMedia, { caption: message });
    } else {
      await client.sendMessage(chatId, message);
    }
    return { success: true };
  }

  static async bulkSend(phones: string[], message: string, sessionId: string, media?: any, delay: number = 1000) {
    const id = sessionId || "primary";
    const client = whatsappManager.getClient(id);
    const session = whatsappManager.getSession(id);

    if (!client || !session || session.status !== "connected") {
      throw new Error(`WhatsApp session ${id} not connected`);
    }

    const results = [];
    const messageMedia = (media && media.data) 
      ? new MessageMedia(media.mimetype, media.data, media.filename)
      : null;

    for (const phone of phones) {
      try {
        const chatId = formatPhoneForWhatsApp(phone);
        if (messageMedia) {
          await client.sendMessage(chatId, messageMedia, { caption: message });
        } else {
          await client.sendMessage(chatId, message);
        }
        results.push({ phone, status: "success" });
      } catch (e: any) {
        results.push({ phone, status: "failed", error: e.message });
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
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
