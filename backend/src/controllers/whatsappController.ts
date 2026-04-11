import { Request, Response } from "express";
import mongoose from "mongoose";

import { 
  whatsappManager,
  formatPhoneForWhatsApp,
  MessageMedia
} from "../config/whatsapp";

export const getStatus = async (req: Request, res: Response) => {
  const sessions = whatsappManager.getAllSessions();
  const primarySessionId = whatsappManager.getPrimaryId();
  res.json({ sessions, primaryId: primarySessionId });
};

export const requestPairingCode = async (req: Request, res: Response) => {
  const { id, phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number is required." });
  const sessionId = id || "primary";

  try {
    const code = await whatsappManager.requestPairingCode(sessionId, phone);
    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate pairing code." });
  }
};

export const setPrimary = async (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Session ID required" });
  try {
    await whatsappManager.setPrimary(id);
    res.json({ success: true, primaryId: id });
  } catch (err) {
    res.status(500).json({ error: "Failed to set primary session" });
  }
};

export const connect = async (req: Request, res: Response) => {
  const { id } = req.body;
  const sessionId = id || "primary";
  
  try {
    // If another session is already connected/connecting, it'll be handled by the manager
    await whatsappManager.initSession(sessionId);
    res.json({ success: true, message: `Initializing WhatsApp session ${sessionId}...` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  const { id, delete: deletePersistently } = req.body;
  const sessionId = id || "primary";
  
  try {
    await whatsappManager.disconnect(sessionId, !!deletePersistently);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to disconnect session ${sessionId}` });
  }
};

export const sendTest = async (req: Request, res: Response) => {
  const { phone, message, sessionId, media } = req.body;
  const id = sessionId || "primary";
  
  const client = whatsappManager.getClient(id);
  const session = whatsappManager.getSession(id);
  
  if (!client || !session || session.status !== "connected") {
    return res.status(400).json({ error: `WhatsApp session ${id} not connected` });
  }

  try {
    const chatId = formatPhoneForWhatsApp(phone);
    if (media && media.data) {
        const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
        await client.sendMessage(chatId, messageMedia, { caption: message });
    } else {
        await client.sendMessage(chatId, message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Error sending WhatsApp message from ${id}:`, err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await mongoose.connection.db?.collection("customers").find({}).sort({ createdAt: -1 }).toArray();
    const formatted = customers?.map(doc => {
      const { _id, ...rest } = doc;
      return rest;
    }) || [];
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

export const bulkSend = async (req: Request, res: Response) => {
  const { phones, message, sessionId, media, delay } = req.body;
  const id = sessionId || "primary";

  const client = whatsappManager.getClient(id);
  const session = whatsappManager.getSession(id);

  if (!client || !session || session.status !== "connected") {
    return res.status(400).json({ error: `WhatsApp session ${id} not connected` });
  }
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: "No phone numbers provided" });
  }

  try {
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
      
      const delayMs = delay ? Number(delay) : 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: "Fatal error in bulk send" });
  }
};
