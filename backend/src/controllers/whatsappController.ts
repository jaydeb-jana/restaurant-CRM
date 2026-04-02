import { Request, Response } from "express";
import mongoose from "mongoose";
import { 
  whatsappStatus, 
  whatsappQR, 
  whatsappClient, 
  initWhatsApp, 
  formatPhoneForWhatsApp 
} from "../config/whatsapp";

export const getStatus = (req: Request, res: Response) => {
  res.json({ 
    status: whatsappStatus, 
    qr: whatsappQR,
    connected: whatsappStatus === "connected"
  });
};

export const connect = (req: Request, res: Response) => {
  if (whatsappStatus === "disconnected") {
    initWhatsApp();
    res.json({ success: true, message: "Initializing WhatsApp connection..." });
  } else {
    res.json({ success: false, message: "WhatsApp is already connecting or connected." });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  if (whatsappClient) {
    try {
      await whatsappClient.logout();
      await whatsappClient.destroy();
      // Note: In real app we should reset globals here or wait for 'disconnected' event
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  } else {
    res.json({ success: true });
  }
};

export const sendTest = async (req: Request, res: Response) => {
  const { phone, message } = req.body;
  if (whatsappStatus !== "connected" || !whatsappClient) {
    return res.status(400).json({ error: "WhatsApp not connected" });
  }

  try {
    const chatId = formatPhoneForWhatsApp(phone);
    await whatsappClient.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
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
  const { phones, message } = req.body;
  if (whatsappStatus !== "connected" || !whatsappClient) {
    return res.status(400).json({ error: "WhatsApp not connected" });
  }
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: "No phone numbers provided" });
  }

  try {
    const results = [];
    for (const phone of phones) {
      try {
        const chatId = formatPhoneForWhatsApp(phone);
        await (whatsappClient as any).sendMessage(chatId, message);
        results.push({ phone, status: "success" });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        results.push({ phone, status: "failed", error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: "Fatal error in bulk send" });
  }
};
