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
    
    let messageContent: any = {};
    if (media && media.data) {
      const buffer = Buffer.from(media.data, "base64");
      const mime = media.mimetype || "";
      
      if (mime.startsWith("image/")) {
        messageContent = { image: buffer, caption: message || "", mimetype: mime };
      } else if (mime.startsWith("video/")) {
        messageContent = { video: buffer, caption: message || "", mimetype: mime };
      } else if (mime.startsWith("audio/")) {
        messageContent = { 
          audio: buffer, 
          mimetype: mime.includes("mp4") ? mime : "audio/mp4",
          ptt: mime.includes("ogg") || mime.includes("opus"),
        };
      } else {
        messageContent = { 
          document: buffer, 
          mimetype: mime || "application/octet-stream", 
          fileName: media.filename || "attachment",
          caption: message || "" 
        };
      }
    } else {
      messageContent = { text: message };
    }

    await socket.sendMessage(chatId, messageContent);
    return { success: true };
  }

  static async bulkSend(phones: string[], message: string | string[], sessionId: string, media?: any, delayMs: number = 1000) {
    const id = sessionId || "primary";
    const socket = whatsappManager.getSocket(id);
    const session = whatsappManager.getSession(id);

    if (!socket || !session || session.status !== "connected") {
      throw new Error(`WhatsApp session ${id} not connected`);
    }

    const broadcastId = `bcast_${Date.now()}`;
    const messages = Array.isArray(message) ? message.filter(m => m.trim().length > 0) : [message];

    if (messages.length === 0) {
      throw new Error("No valid messages provided");
    }

    // Initialize History Log
    const historyEntry = {
      id: broadcastId,
      sessionId: id,
      totalRecipients: phones.length,
      successCount: 0,
      failCount: 0,
      status: "processing",
      startTime: new Date(),
      results: [] as any[]
    };

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("broadcast_history").insertOne(historyEntry);
    }

    const results = [];
    
    // Internal loop
    for (const phone of phones) {
      try {
        const chatId = formatPhoneForWhatsApp(phone);
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        let messageContent: any = {};
        if (media && media.data) {
          const buffer = Buffer.from(media.data, "base64");
          const mime = media.mimetype || "";
          
          if (mime.startsWith("image/")) {
            messageContent = { image: buffer, caption: randomMessage || "", mimetype: mime };
          } else if (mime.startsWith("video/")) {
            messageContent = { video: buffer, caption: randomMessage || "", mimetype: mime };
          } else if (mime.startsWith("audio/")) {
            messageContent = { 
              audio: buffer, 
              mimetype: mime.includes("mp4") ? mime : "audio/mp4",
              ptt: mime.includes("ogg") || mime.includes("opus"),
            };
          } else {
            messageContent = { 
              document: buffer, 
              mimetype: mime || "application/octet-stream", 
              fileName: media.filename || "attachment",
              caption: randomMessage || "" 
            };
          }
        } else {
          messageContent = { text: randomMessage };
        }

        await socket.sendMessage(chatId, messageContent);
        const result = { phone, status: "success", timestamp: new Date() };
        results.push(result);
        historyEntry.successCount++;
      } catch (e: any) {
        const result = { phone, status: "failed", error: e.message, timestamp: new Date() };
        results.push(result);
        historyEntry.failCount++;
      }
      
      // Update DB every 5 messages or at the end to avoid excessive DB writes
      if (results.length % 5 === 0 || results.length === phones.length) {
         if (mongoose.connection.readyState === 1) {
           await mongoose.connection.db?.collection("broadcast_history").updateOne(
             { id: broadcastId },
             { $set: { 
                 successCount: historyEntry.successCount, 
                 failCount: historyEntry.failCount,
                 lastUpdate: new Date()
               } 
             }
           );
         }
      }

      if (delayMs > 0 && results.length < phones.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Finalize History Log
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("broadcast_history").updateOne(
        { id: broadcastId },
        { $set: { status: "completed", endTime: new Date() } }
      );
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
