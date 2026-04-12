import { Request, Response } from "express";
import mongoose from "mongoose";
import getBranding from "../config/branding";

import { 
  getPrimaryStatus, 
  getPrimarySocket as getPrimaryClient, 
  formatPhoneForWhatsApp 
} from "../config/whatsapp";

export const sendOTP = async (req: Request, res: Response) => {
  const { phone } = req.body;
  const otp = "123456";
  console.log(`Sending OTP ${otp} to ${phone}`);

  const status = getPrimaryStatus();
  const socket = getPrimaryClient();

  if (status === "connected" && socket) {
    try {
      const chatId = formatPhoneForWhatsApp(phone);
      const branding = getBranding();
      const otpTemplate = `*${branding.name}*\n\nYour secure login OTP is: *${otp}*\n\nPlease do not share this code with anyone. Happy dining! 🍛`;

      await socket.sendMessage(chatId, { text: otpTemplate });
      res.json({ success: true, message: "OTP sent via WhatsApp", otp }); 
    } catch (err) {
      res.json({ success: true, message: "OTP sent via WhatsApp (Simulated - real failed)", otp });
    }
  } else {
    res.json({ success: true, message: "OTP sent via WhatsApp (Simulated)", otp });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  try {
    let cleanedPhone = phone.replace(/\D/g, "");
    if (cleanedPhone.length === 10) cleanedPhone = "91" + cleanedPhone;

    await mongoose.connection.db?.collection("customers").updateOne(
      { phone: cleanedPhone },
      { 
        $set: { lastLogin: new Date().toISOString() }, 
        $setOnInsert: { createdAt: new Date().toISOString() } 
      },
      { upsert: true }
    );
    res.json({ success: true, token: "mock-jwt-token" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to verify user" });
  }
};
