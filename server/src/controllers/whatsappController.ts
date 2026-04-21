import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { WhatsAppService } from "../services/whatsappService.js";
import { whatsappManager } from "../config/whatsapp.js";
import WhatsAppAccount from "../models/WhatsAppAccount.js";

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await WhatsAppService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};

export const cleanup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await whatsappManager.cleanupUnlinkedSessions();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const requestPairingCode = async (req: Request, res: Response, next: NextFunction) => {
  const { id, phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number is required." });
  const sessionId = id || "primary";

  try {
    const code = await WhatsAppService.requestPairingCode(sessionId, phone);
    res.json({ success: true, code });
  } catch (err) {
    next(err);
  }
};

export const connect = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.body;
  const sessionId = id || "primary";
  try {
    await whatsappManager.initSession(sessionId);
    res.json({ success: true, message: `Initializing WhatsApp session ${sessionId}...` });
  } catch (err) {
    next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Session ID required" });
  try {
    await whatsappManager.registerSession(id);
    res.json({ success: true, sessionId: id });
  } catch (err) {
    next(err);
  }
};

export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  const { id, delete: deletePersistently } = req.body;
  const sessionId = id || "primary";
  
  try {
    await whatsappManager.disconnect(sessionId, !!deletePersistently);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const sendTest = async (req: Request, res: Response, next: NextFunction) => {
  const { phone, message, sessionId, media } = req.body;
  try {
    const result = await WhatsAppService.sendTestMessage(phone, message, sessionId, media);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await WhatsAppService.getCustomers();
    res.json(customers);
  } catch (err) {
    next(err);
  }
};

export const bulkSend = async (req: Request, res: Response, next: NextFunction) => {
  const { phones, message, sessionId, media, delay } = req.body;
  try {
    // Fire and forget: Start the process in the background
    WhatsAppService.bulkSend(phones, message, sessionId, media, delay)
      .then(results => {
        const successCount = results.filter(r => r.status === "success").length;
        console.log(`[Broadcast] Completed batch of ${phones.length}. Success: ${successCount}, Failed: ${phones.length - successCount}`);
      })
      .catch(err => console.error("[Broadcast Engine Error]:", err));

    // Respond immediately to the client
    res.json({ 
      success: true, 
      message: `Broadcast engine for ${phones.length} recipients has been successfully initiated. Process will continue in the background even if you close your browser.`,
      dispatchId: Date.now().toString()
    });
  } catch (err) {
    next(err);
  }
};

export const summarizeAll = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.body;
  try {
    const result = await WhatsAppService.summarizeAll(sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const summarizeSingle = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId, customerNumber } = req.body;
  if (!customerNumber) return res.status(400).json({ error: "Customer number required" });
  
  try {
    const account = await WhatsAppAccount.findOne({ sessionId });
    const myNumber = account?.phoneNumber;
    
    if (!myNumber) {
      return res.status(400).json({ error: "Session or account number not found" });
    }

    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
    if (!settings?.groqApiKey) {
      return res.status(400).json({ error: "Groq API key not configured in settings" });
    }

    await whatsappManager.summarizeContext(customerNumber, myNumber, settings.groqApiKey);
    res.json({ success: true, message: `Context for ${customerNumber} has been compressed into memory.` });
  } catch (err) {
    next(err);
  }
};
