import { Request, Response, NextFunction } from "express";
import { WhatsAppService } from "../services/whatsappService";
import { whatsappManager } from "../config/whatsapp";

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await WhatsAppService.getStatus();
    res.json(status);
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

export const setPrimary = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Session ID required" });
  try {
    await whatsappManager.setPrimary(id);
    res.json({ success: true, primaryId: id });
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
    const results = await WhatsAppService.bulkSend(phones, message, sessionId, media, delay);
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};
