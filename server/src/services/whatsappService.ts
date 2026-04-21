import { whatsappManager, formatPhoneForWhatsApp } from "../config/whatsapp.js";
import mongoose from "mongoose";
import WhatsAppAccount from "../models/WhatsAppAccount.js";
import WhatsAppContact from "../models/WhatsAppContact.js";
import WhatsAppMessage from "../models/WhatsAppMessage.js";

export class WhatsAppService {
  static async getStatus() {
    const sessions = await whatsappManager.getAllSessions();
    return { sessions };
  }

  static async requestPairingCode(sessionId: string, phone: string) {
    return await whatsappManager.requestPairingCode(sessionId, phone);
  }

  static async sendTestMessage(phone: string, message: string, sessionId: string, media?: any) {
    const all = await whatsappManager.getAllSessions();
    const id = sessionId && sessionId !== "primary" ? sessionId : (all.find(s => s.status === 'connected')?.id || "primary");
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

    const sentMsg = await socket.sendMessage(chatId, messageContent);
    const myNumber = session?.me?.number || id;
    
    if (mongoose.connection.readyState === 1) {
      await WhatsAppMessage.create({
        messageId: sentMsg?.key.id,
        sessionId: id,
        from: myNumber, // Outgoing: From is our account
        to: chatId,     // Outgoing: To is the remote user
        text: message || (media ? "[Media Message]" : ""),
        senderType: "admin",
        status: "sent",
        timestamp: new Date()
      });
    }
    
    return { success: true };
  }

  static async bulkSend(phones: string[], message: string | string[], sessionId: string, media?: any, delayMs: number = 1000) {
    const all = await whatsappManager.getAllSessions();
    const id = sessionId && sessionId !== "primary" ? sessionId : (all.find(s => s.status === 'connected')?.id || "primary");
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

        const sentMsg = await socket.sendMessage(chatId, messageContent);
        const myNumber = session?.me?.number || id;
        
        if (mongoose.connection.readyState === 1) {
          await WhatsAppMessage.create({
            messageId: sentMsg?.key.id,
            sessionId: id,
            from: myNumber,
            to: chatId,
            text: randomMessage || (media ? "[Media Message]" : ""),
            senderType: "admin",
            status: "sent",
            isAi: false,
            // Custom fields for filtering if we add them to schema later, or just use these for now
            ...( { isCampaign: true, campaignId: broadcastId } as any ),
            timestamp: new Date()
          });
        }

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

  static async summarizeAll(sessionId: string) {
    const session = await WhatsAppAccount.findOne({ sessionId });
    if (!session || !session.phoneNumber) throw new Error("Session not found or not linked");

    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" }) as any;
    if (!settings?.groqApiKey) throw new Error("Groq API key not configured");

    const contacts = await WhatsAppContact.find({ linkedTo: session.phoneNumber });
    if (!contacts.length) return { success: true, count: 0 };

    // Fire background summarizations
    contacts.forEach(c => {
      whatsappManager.summarizeContext(c.phoneNumber, session.phoneNumber!, settings.groqApiKey).catch(console.error);
    });

    return { success: true, count: contacts.length };
  }
}
